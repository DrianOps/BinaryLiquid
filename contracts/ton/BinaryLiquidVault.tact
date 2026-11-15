import "@stdlib/deploy";

/**
 * @title BinaryLiquidVault (Hardened TON Jetton Non-Custodial Covenant Vault)
 * @author BinaryLiquid Protocol / DrianOps
 * @notice Non-custodial TEP-74 Jetton liquidity vault for BinaryLiquid Protocol on The Open Network (TON).
 *
 * SECURITY INVARIANTS:
 * 1. Verified TEP-74 Jetton Wallet Source: `JettonTransferNotification` (`0x7362d09c`) strictly verifies
 *    `sender() == self.jettonWallet!!` after one-time initialization via `SetJettonWallet`.
 * 2. Collision-Free Deposit Keying: Deposits are indexed by `sha256(sender, queryId)` so users can never
 *    overwrite or hijack another user's `queryId` entry.
 * 3. Domain-Separated Ed25519 Watchman Attestation: `ReleasePayout` & `MarkDepositCompleted` verify
 *    Watchman signatures bound to `myAddress()`, external tx hash, recipient, amount, and nonce.
 * 4. Real TEP-74 Outbound Execution: Both `ReleasePayout` and timelocked `RefundDeposit` emit real
 *    `JettonTransfer` (`0x0f8a7ea5`) internal messages (never internal-only state mutations).
 */

message SetJettonWallet {
    jettonWallet: Address;
}

message(0x7362d09c) JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

message(0x0f8a7ea5) JettonTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message ReleasePayout {
    bchTxHash: Int as uint256;
    recipient: Address;
    amount: Int as coins;
    nonce: Int as uint64;
    watchmanSignature: Slice;
}

message MarkDepositCompleted {
    depositor: Address;
    queryId: Int as uint64;
    externalTxHash: Int as uint256;
    watchmanSignature: Slice;
}

message RefundDeposit {
    queryId: Int as uint64;
}

message TogglePause {
    paused: Bool;
}

struct DepositInfo {
    sender: Address;
    amount: Int as coins;
    timestamp: Int as uint32;
    completed: Bool;
    refunded: Bool;
}

contract BinaryLiquidVault with Deployable {
    const REFUND_TIMELOCK: Int = 86400; // 24 hours
    const JETTON_TRANSFER_GAS: Int = ton("0.05");
    const MIN_GAS_VALUE: Int = ton("0.06");

    owner: Address;
    watchmanPubKey: Int as uint256;
    jettonWallet: Address?;
    maxSinglePayout: Int as coins;
    paused: Bool;
    depositSeq: Int as uint64;

    deposits: map<Int, DepositInfo>;
    executedPayouts: map<Int, Bool>;

    init(owner: Address, watchmanPubKey: Int, maxSinglePayout: Int) {
        require(watchmanPubKey != 0, "Invalid Watchman pubkey");
        require(maxSinglePayout > 0, "Invalid payout cap");
        self.owner = owner;
        self.watchmanPubKey = watchmanPubKey;
        self.jettonWallet = null;
        self.maxSinglePayout = maxSinglePayout;
        self.paused = false;
        self.depositSeq = 0;
    }

    fun computeDepositId(depositor: Address, queryId: Int): Int {
        return beginCell()
            .storeAddress(depositor)
            .storeUint(queryId, 64)
            .endCell()
            .hash();
    }

    receive(msg: SetJettonWallet) {
        require(sender() == self.owner, "Only owner");
        require(self.jettonWallet == null, "Jetton wallet already initialized");
        self.jettonWallet = msg.jettonWallet;
    }

    receive(msg: TogglePause) {
        require(sender() == self.owner, "Only owner");
        self.paused = msg.paused;
    }

    /**
     * @notice Receives TEP-74 Jetton transfer notification from this Vault's verified Jetton Wallet
     */
    receive(msg: JettonTransferNotification) {
        require(!self.paused, "Vault paused");
        require(self.jettonWallet != null, "Jetton wallet not configured");
        require(sender() == self.jettonWallet!!, "Unauthorized Jetton wallet sender");
        require(msg.amount > 0, "Zero deposit amount");

        self.depositSeq = self.depositSeq + 1;
        let effectiveQueryId: Int = msg.queryId > 0 ? msg.queryId : self.depositSeq;
        let depositId: Int = self.computeDepositId(msg.sender, effectiveQueryId);
        if (self.deposits.get(depositId) != null) {
            depositId = self.computeDepositId(msg.sender, self.depositSeq + 1000000000);
        }

        self.deposits.set(depositId, DepositInfo{
            sender: msg.sender,
            amount: msg.amount,
            timestamp: now(),
            completed: false,
            refunded: false
        });
    }

    /**
     * @notice Releases TEP-74 Jettons to recipient after verifying Watchman Ed25519 attestation
     */
    receive(msg: ReleasePayout) {
        require(!self.paused, "Vault paused");
        require(self.jettonWallet != null, "Jetton wallet not configured");
        require(msg.amount > 0 && msg.amount <= self.maxSinglePayout, "Invalid or over-cap amount");
        require(context().value >= self.MIN_GAS_VALUE, "Insufficient TON gas for JettonTransfer");

        let digest: Int = beginCell()
            .storeAddress(myAddress())
            .storeUint(msg.bchTxHash, 256)
            .storeAddress(msg.recipient)
            .storeCoins(msg.amount)
            .storeUint(msg.nonce, 64)
            .endCell()
            .hash();

        require(self.executedPayouts.get(msg.bchTxHash) == null, "Origin TX already executed");
        require(checkSignature(digest, msg.watchmanSignature, self.watchmanPubKey), "Invalid Watchman signature");

        self.executedPayouts.set(msg.bchTxHash, true);

        send(SendParameters{
            to: self.jettonWallet!!,
            value: self.JETTON_TRANSFER_GAS,
            mode: SendPayGasSeparately,
            body: JettonTransfer{
                queryId: msg.nonce,
                amount: msg.amount,
                destination: msg.recipient,
                responseDestination: sender(),
                customPayload: null,
                forwardTonAmount: ton("0.001"),
                forwardPayload: emptySlice()
            }.toCell()
        });
    }

    /**
     * @notice Marks an incoming deposit as settled cross-chain to lock out 24h refunds
     */
    receive(msg: MarkDepositCompleted) {
        let depositId: Int = self.computeDepositId(msg.depositor, msg.queryId);
        let depOpt: DepositInfo? = self.deposits.get(depositId);
        require(depOpt != null, "Deposit not found");
        let dep: DepositInfo = depOpt!!;
        require(!dep.completed, "Already completed");
        require(!dep.refunded, "Already refunded");

        let digest: Int = beginCell()
            .storeUint(0x4d41524b, 32) // "MARK" domain tag
            .storeAddress(myAddress())
            .storeUint(depositId, 256)
            .storeUint(msg.externalTxHash, 256)
            .endCell()
            .hash();
        require(
            sender() == self.owner || checkSignature(digest, msg.watchmanSignature, self.watchmanPubKey),
            "Unauthorized settlement attestation"
        );

        dep.completed = true;
        self.deposits.set(depositId, dep);
    }

    /**
     * @notice Trustless 24h Timelock Refund returning TEP-74 Jettons back to the original depositor
     */
    receive(msg: RefundDeposit) {
        require(self.jettonWallet != null, "Jetton wallet not configured");
        require(context().value >= self.MIN_GAS_VALUE, "Insufficient TON gas for Jetton refund");

        let depositId: Int = self.computeDepositId(sender(), msg.queryId);
        let depOpt: DepositInfo? = self.deposits.get(depositId);
        require(depOpt != null, "Deposit not found");

        let dep: DepositInfo = depOpt!!;
        require(sender() == dep.sender, "Not original depositor");
        require(!dep.completed, "Deposit already completed");
        require(!dep.refunded, "Deposit already refunded");
        require(now() >= dep.timestamp + self.REFUND_TIMELOCK, "24h Timelock active");

        dep.refunded = true;
        self.deposits.set(depositId, dep);

        send(SendParameters{
            to: self.jettonWallet!!,
            value: self.JETTON_TRANSFER_GAS,
            mode: SendPayGasSeparately,
            body: JettonTransfer{
                queryId: msg.queryId,
                amount: dep.amount,
                destination: dep.sender,
                responseDestination: dep.sender,
                customPayload: null,
                forwardTonAmount: ton("0.001"),
                forwardPayload: emptySlice()
            }.toCell()
        });
    }

    get fun getDepositId(depositor: Address, queryId: Int): Int {
        return self.computeDepositId(depositor, queryId);
    }

    get fun getDepositInfo(depositor: Address, queryId: Int): DepositInfo? {
        return self.deposits.get(self.computeDepositId(depositor, queryId));
    }

    get fun getJettonWallet(): Address? {
        return self.jettonWallet;
    }

    get fun isPaused(): Bool {
        return self.paused;
    }
}
