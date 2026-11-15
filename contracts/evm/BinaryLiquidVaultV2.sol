// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BinaryLiquidVaultV2 (Hardened Cross-Chain EVM Liquidity Covenant Vault)
 * @author BinaryLiquid Protocol / DrianOps
 * @notice Non-custodial ERC-20 liquidity vault with per-user deposit nonces, strict EIP-191
 * Watchman attestation (malleability-checked), 48h timelocked Watchman rotation,
 * two-step ownership transfer, SafeERC20 support, and decimal-aware payout caps.
 */
interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BinaryLiquidVaultV2 {
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant PROTOCOL_FEE_BPS = 30; // 0.30%
    uint256 public constant MAX_SINGLE_PAYOUT = 50_000 * 1e6; // Fallback cap for 6-decimal tokens
    uint256 public constant REFUND_TIMELOCK = 24 hours;
    uint256 public constant SIGNER_TIMELOCK = 48 hours;

    // Half-order of secp256k1 curve for strict EIP-2 signature malleability protection
    uint256 private constant SECP256K1_N_DIV_2 =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    address public owner;
    address public pendingOwner;
    address public watchmanSigner;
    address public pendingWatchmanSigner;
    uint256 public watchmanSignerEffectiveAt;
    bool public paused;

    uint256 private _locked = 1;

    struct DepositRecord {
        address depositor;
        address token;
        uint256 amount;      // Net bridgeable amount (99.70%)
        uint256 grossAmount; // Full principal deposited (100.00%, refunded in full on timeout)
        uint256 feeAmount;   // Protocol fee (0.30%, accrued only when markDepositCompleted is called)
        string bchRecipient;
        uint256 timestamp;
        bool completed;
        bool refunded;
    }

    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public maxTokenSinglePayout;
    mapping(address => uint256) public maxTokenDailyOutflow;
    mapping(address => uint256) public currentWindowStart;
    mapping(address => uint256) public currentWindowOutflow;
    mapping(address => uint256) public pendingEscrowLiability;
    mapping(address => uint256) public accruedProtocolFees;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => DepositRecord) public deposits;
    mapping(bytes32 => bool) public executedPayouts;
    mapping(uint256 => bool) public usedWatchmanNonces;

    event BridgeDepositInitiated(
        bytes32 indexed depositId,
        address indexed sender,
        address indexed token,
        uint256 grossAmount,
        uint256 netAmount,
        string bchRecipient,
        uint256 timestamp
    );
    event BridgeDepositToChainInitiated(
        bytes32 indexed depositId,
        address indexed sender,
        address indexed token,
        uint256 grossAmount,
        uint256 netAmount,
        string targetChain,
        string targetRecipient,
        uint256 timestamp
    );
    event BridgeDepositSettled(
        bytes32 indexed depositId,
        bytes32 externalTxHash,
        uint256 timestamp
    );
    event BridgeDepositRefunded(
        bytes32 indexed depositId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    event BridgePayoutReleased(
        bytes32 indexed externalTxHash,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    event EmergencyPauseToggled(bool isPaused);
    event TokenSupportUpdated(address indexed token, bool supported, uint256 maxSinglePayout);
    event WatchmanSignerProposed(address indexed currentSigner, address indexed pendingSigner, uint256 effectiveAt);
    event WatchmanSignerProposalCancelled(address indexed cancelledSigner);
    event WatchmanSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ProtocolFeesClaimed(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOwnerOrWatchman() {
        require(msg.sender == owner || msg.sender == watchmanSigner, "Unauthorized");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Protocol paused");
        _;
    }

    modifier nonReentrant() {
        require(_locked == 1, "Reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address _watchmanSigner, address[] memory _initialSupportedTokens) {
        require(_watchmanSigner != address(0), "Invalid watchman");
        owner = msg.sender;
        watchmanSigner = _watchmanSigner;

        for (uint256 i = 0; i < _initialSupportedTokens.length; i++) {
            address tok = _initialSupportedTokens[i];
            require(tok != address(0) && tok.code.length > 0, "Invalid token contract");
            supportedTokens[tok] = true;
            uint256 defaultCap = _defaultCapForToken(tok);
            maxTokenSinglePayout[tok] = defaultCap;
            maxTokenDailyOutflow[tok] = defaultCap * 5;
            emit TokenSupportUpdated(tok, true, defaultCap);
        }
    }

    function deposit(
        address token,
        uint256 amount,
        string calldata bchRecipient
    ) external whenNotPaused nonReentrant returns (bytes32 depositId) {
        require(bytes(bchRecipient).length > 0 && bytes(bchRecipient).length <= 160, "Invalid recipient");
        uint256 netAmount;
        (depositId, netAmount) = _recordDeposit(token, amount, bchRecipient);
        emit BridgeDepositInitiated(
            depositId,
            msg.sender,
            token,
            amount,
            netAmount,
            bchRecipient,
            block.timestamp
        );
    }

    function depositToChain(
        address token,
        uint256 amount,
        string calldata targetChain,
        string calldata targetRecipient
    ) external whenNotPaused nonReentrant returns (bytes32 depositId) {
        require(bytes(targetChain).length > 0 && bytes(targetChain).length <= 32, "Invalid chain");
        require(bytes(targetRecipient).length > 0 && bytes(targetRecipient).length <= 160, "Invalid recipient");
        uint256 netAmount;
        (depositId, netAmount) = _recordDeposit(token, amount, targetRecipient);
        emit BridgeDepositToChainInitiated(
            depositId,
            msg.sender,
            token,
            amount,
            netAmount,
            targetChain,
            targetRecipient,
            block.timestamp
        );
    }

    function _recordDeposit(
        address token,
        uint256 amount,
        string calldata recipientRef
    ) internal returns (bytes32 depositId, uint256 netAmount) {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Invalid amount");

        uint256 balBefore = IERC20Minimal(token).balanceOf(address(this));
        _safeTransferFrom(token, msg.sender, address(this), amount);
        uint256 balAfter = IERC20Minimal(token).balanceOf(address(this));
        uint256 received = balAfter - balBefore;
        require(received > 0, "Zero received");

        uint256 fee = (received * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        netAmount = received - fee;
        require(netAmount > 0, "Amount too small");

        uint256 userNonce = nonces[msg.sender]++;
        depositId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                token,
                received,
                userNonce
            )
        );
        require(deposits[depositId].depositor == address(0), "Duplicate depositId");

        deposits[depositId] = DepositRecord({
            depositor: msg.sender,
            token: token,
            amount: netAmount,
            grossAmount: received,
            feeAmount: fee,
            bchRecipient: recipientRef,
            timestamp: block.timestamp,
            completed: false,
            refunded: false
        });
        pendingEscrowLiability[token] += received;
    }

    function markDepositCompleted(
        bytes32 depositId,
        bytes32 externalTxHash
    ) external onlyOwnerOrWatchman {
        DepositRecord storage dep = deposits[depositId];
        require(dep.depositor != address(0), "Deposit not found");
        require(!dep.completed, "Already completed");
        require(!dep.refunded, "Already refunded");
        dep.completed = true;
        if (pendingEscrowLiability[dep.token] >= dep.grossAmount) {
            pendingEscrowLiability[dep.token] -= dep.grossAmount;
        } else {
            pendingEscrowLiability[dep.token] = 0;
        }
        accruedProtocolFees[dep.token] += dep.feeAmount;
        emit BridgeDepositSettled(depositId, externalTxHash, block.timestamp);
    }

    function release(
        bytes32 externalTxHash,
        address recipient,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata watchmanSignature
    ) external whenNotPaused nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Invalid amount");
        require(!executedPayouts[externalTxHash], "Origin TX already settled");
        require(!usedWatchmanNonces[nonce], "Watchman nonce already used");

        uint256 cap = maxTokenSinglePayout[token];
        if (cap == 0) {
            cap = _defaultCapForToken(token);
        }
        require(amount <= cap, "Exceeds single payout cap");

        // Enforce 24-hour rolling outflow circuit breaker per token
        uint256 dailyCap = maxTokenDailyOutflow[token];
        if (dailyCap == 0) {
            dailyCap = cap * 5;
        }
        if (block.timestamp >= currentWindowStart[token] + 1 days) {
            currentWindowStart[token] = block.timestamp;
            currentWindowOutflow[token] = 0;
        }
        require(currentWindowOutflow[token] + amount <= dailyCap, "Exceeds 24h outflow cap");

        // Ensure vault retains sufficient liquidity to cover all pending 24h refundable user escrows
        uint256 vaultBal = IERC20Minimal(token).balanceOf(address(this));
        require(vaultBal >= amount + pendingEscrowLiability[token], "Insufficient free liquidity (escrow reserved)");

        // Canonical digest matching SentinelService.js EIP-191 attestation
        bytes32 innerHash = keccak256(
            abi.encodePacked(
                externalTxHash,
                recipient,
                token,
                amount,
                nonce,
                block.chainid,
                address(this)
            )
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash)
        );
        address recovered = recoverSigner(ethSignedHash, watchmanSignature);
        require(recovered == watchmanSigner && recovered != address(0), "Invalid Watchman signature");

        executedPayouts[externalTxHash] = true;
        usedWatchmanNonces[nonce] = true;
        currentWindowOutflow[token] += amount;
        _safeTransfer(token, recipient, amount);

        emit BridgePayoutReleased(externalTxHash, recipient, token, amount, block.timestamp);
    }

    function refund(bytes32 depositId) external nonReentrant {
        DepositRecord storage dep = deposits[depositId];
        require(dep.depositor == msg.sender, "Not depositor");
        require(!dep.completed, "Already completed");
        require(!dep.refunded, "Already refunded");
        require(block.timestamp >= dep.timestamp + REFUND_TIMELOCK, "Timelock active");

        dep.refunded = true;
        uint256 refundAmount = dep.grossAmount > 0 ? dep.grossAmount : dep.amount;
        if (pendingEscrowLiability[dep.token] >= refundAmount) {
            pendingEscrowLiability[dep.token] -= refundAmount;
        } else {
            pendingEscrowLiability[dep.token] = 0;
        }
        _safeTransfer(dep.token, dep.depositor, refundAmount);
        emit BridgeDepositRefunded(depositId, dep.depositor, dep.token, refundAmount, block.timestamp);
    }

    function claimProtocolFees(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Zero recipient");
        require(amount > 0 && amount <= accruedProtocolFees[token], "Exceeds accrued fees");
        uint256 vaultBal = IERC20Minimal(token).balanceOf(address(this));
        require(vaultBal >= amount + pendingEscrowLiability[token], "Cannot dip into pending escrow liability");
        accruedProtocolFees[token] -= amount;
        _safeTransfer(token, to, amount);
        emit ProtocolFeesClaimed(token, to, amount);
    }

    function proposeWatchmanSigner(address _pendingSigner) external onlyOwner {
        require(_pendingSigner != address(0), "Invalid signer");
        pendingWatchmanSigner = _pendingSigner;
        watchmanSignerEffectiveAt = block.timestamp + SIGNER_TIMELOCK;
        emit WatchmanSignerProposed(watchmanSigner, _pendingSigner, watchmanSignerEffectiveAt);
    }

    function cancelWatchmanSignerProposal() external onlyOwner {
        address cancelled = pendingWatchmanSigner;
        require(cancelled != address(0), "No pending proposal");
        pendingWatchmanSigner = address(0);
        watchmanSignerEffectiveAt = 0;
        emit WatchmanSignerProposalCancelled(cancelled);
    }

    function confirmWatchmanSigner() external onlyOwner {
        address nextSigner = pendingWatchmanSigner;
        require(nextSigner != address(0), "No pending signer");
        require(block.timestamp >= watchmanSignerEffectiveAt, "Signer timelock active");

        address prev = watchmanSigner;
        watchmanSigner = nextSigner;
        pendingWatchmanSigner = address(0);
        watchmanSignerEffectiveAt = 0;
        emit WatchmanSignerUpdated(prev, nextSigner);
    }

    function setTokenSupport(address token, bool supported, uint256 customCap) external onlyOwner {
        require(token != address(0) && token.code.length > 0, "Invalid token contract");
        supportedTokens[token] = supported;
        if (supported) {
            uint256 cap = customCap > 0 ? customCap : _defaultCapForToken(token);
            maxTokenSinglePayout[token] = cap;
            if (maxTokenDailyOutflow[token] == 0) {
                maxTokenDailyOutflow[token] = cap * 5;
            }
            emit TokenSupportUpdated(token, true, cap);
        } else {
            emit TokenSupportUpdated(token, false, maxTokenSinglePayout[token]);
        }
    }

    function setMaxTokenSinglePayout(address token, uint256 cap) external onlyOwner {
        require(token != address(0) && cap > 0, "Invalid params");
        maxTokenSinglePayout[token] = cap;
        maxTokenDailyOutflow[token] = cap * 5;
        emit TokenSupportUpdated(token, supportedTokens[token], cap);
    }

    function setMaxTokenDailyOutflow(address token, uint256 dailyCap) external onlyOwner {
        require(token != address(0) && dailyCap > 0, "Invalid params");
        maxTokenDailyOutflow[token] = dailyCap;
    }

    function togglePause(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPauseToggled(_paused);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Zero owner");
        pendingOwner = _newOwner;
        emit OwnershipTransferStarted(owner, _newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address prev = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(prev, owner);
    }

    function recoverSigner(bytes32 ethSignedHash, bytes memory sig) public pure returns (address) {
        require(sig.length == 65, "Invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "Invalid sig v");
        require(uint256(s) <= SECP256K1_N_DIV_2, "Malleable sig s");
        return ecrecover(ethSignedHash, v, r, s);
    }

    function _defaultCapForToken(address token) internal view returns (uint256) {
        (bool ok, bytes memory ret) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (ok && ret.length >= 32) {
            uint256 dec = abi.decode(ret, (uint256));
            if (dec <= 18) {
                return 50_000 * (10 ** dec);
            }
        }
        return MAX_SINGLE_PAYOUT;
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        require(token.code.length > 0, "Token not a contract");
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, value)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "SafeTransfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        require(token.code.length > 0, "Token not a contract");
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, value)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "SafeTransferFrom failed");
    }
}
