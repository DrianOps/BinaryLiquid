// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BinaryLiquidVault
 * @author BinaryLiquid Protocol / DrianOps
 * @notice 100% Non-Custodial Cross-Chain Liquidity Vault for Bitcoin Cash (CashTokens) <-> EVM (Polygon PoS / Amoy).
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Zero-Custody: The contract holds the liquidity. Neither admin nor relayer holds user deposits.
 * 2. Cryptographic Attestation: The Watchman (Oracle Sentinel) verifies deposits on BCH and signs release proofs.
 * 3. Anti-Replay: Each BCH TxID / deposit ID can only be settled exactly once.
 * 4. Autonomous Refund: If cross-chain delivery fails, users can unilaterally reclaim funds after 24 hours.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract BinaryLiquidVault {
    // --- State Variables ---
    address public owner;
    address public watchmanSigner; // "The Watchman" Sentinel public key for attestation
    bool public paused;

    uint256 public constant REFUND_TIMELOCK = 24 hours;
    uint256 public constant PROTOCOL_FEE_BPS = 30; // 0.30%
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct Deposit {
        address sender;
        address token;
        uint256 amount;
        uint256 netAmount;
        string bchRecipient;
        uint256 timestamp;
        bool refunded;
        bool completed;
    }

    // Mapping from depositId => Deposit
    mapping(bytes32 => Deposit) public deposits;

    // Mapping from bchTxHash => whether payout has already been executed (Anti-Replay)
    mapping(bytes32 => bool) public executedPayouts;

    // Supported tokens whitelist (e.g. USDC, USDT)
    mapping(address => bool) public supportedTokens;

    // --- Events ---
    event BridgeDepositInitiated(
        bytes32 indexed depositId,
        address indexed sender,
        address indexed token,
        uint256 grossAmount,
        uint256 netAmount,
        string bchRecipient,
        uint256 timestamp
    );

    event BridgePayoutReleased(
        bytes32 indexed bchTxHash,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event BridgeDepositRefunded(
        bytes32 indexed depositId,
        address indexed sender,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event WatchmanSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event TokenSupportUpdated(address indexed token, bool supported);
    event EmergencyPauseToggled(bool isPaused);

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "BinaryLiquid: Caller is not protocol owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "BinaryLiquid: Protocol is paused by Circuit Breaker");
        _;
    }

    // Reentrancy lock
    uint256 private _status;
    modifier nonReentrant() {
        require(_status != 2, "BinaryLiquid: Reentrant call detected");
        _status = 2;
        _;
        _status = 1;
    }

    constructor(address _watchmanSigner) {
        require(_watchmanSigner != address(0), "BinaryLiquid: Invalid Watchman address");
        owner = msg.sender;
        watchmanSigner = _watchmanSigner;
        _status = 1;
    }

    // --- User Actions ---

    /**
     * @notice Deposit EVM tokens to bridge to Bitcoin Cash CashTokens
     * @param token ERC20 token address (e.g. USDC on Polygon)
     * @param amount Gross amount to deposit
     * @param bchRecipient Bitcoin Cash CashAddr destination (e.g. bitcoincash:qp... or bchtest:qp...)
     */
    function deposit(
        address token,
        uint256 amount,
        string calldata bchRecipient
    ) external whenNotPaused nonReentrant returns (bytes32 depositId) {
        require(supportedTokens[token], "BinaryLiquid: Token not supported");
        require(amount > 0, "BinaryLiquid: Amount must be > 0");
        require(bytes(bchRecipient).length >= 20, "BinaryLiquid: Invalid BCH destination address");

        // Compute 0.3% protocol fee
        uint256 fee = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        // Pull tokens from user
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "BinaryLiquid: Token transferFrom failed");

        // Unique deposit hash
        depositId = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
                amount,
                bchRecipient,
                block.timestamp,
                block.number,
                block.chainid
            )
        );

        deposits[depositId] = Deposit({
            sender: msg.sender,
            token: token,
            amount: amount,
            netAmount: netAmount,
            bchRecipient: bchRecipient,
            timestamp: block.timestamp,
            refunded: false,
            completed: false
        });

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

    /**
     * @notice Releases tokens to user on EVM when a valid deposit happened on Bitcoin Cash.
     * @dev Validated via cryptographic signature from "The Watchman" Sentinel.
     */
    function release(
        bytes32 bchTxHash,
        address recipient,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata watchmanSignature
    ) external whenNotPaused nonReentrant {
        require(!executedPayouts[bchTxHash], "BinaryLiquid: Payout already executed (Anti-Replay blocked)");
        require(recipient != address(0), "BinaryLiquid: Invalid recipient");
        require(supportedTokens[token], "BinaryLiquid: Token not supported");
        require(amount > 0, "BinaryLiquid: Amount must be > 0");

        // Verify cryptographic attestation from The Watchman
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        bchTxHash,
                        recipient,
                        token,
                        amount,
                        nonce,
                        block.chainid,
                        address(this)
                    )
                )
            )
        );

        address recovered = recoverSigner(messageHash, watchmanSignature);
        require(recovered == watchmanSigner, "BinaryLiquid: Invalid Watchman cryptographic signature");

        executedPayouts[bchTxHash] = true;

        bool sent = IERC20(token).transfer(recipient, amount);
        require(sent, "BinaryLiquid: Payout transfer failed");

        emit BridgePayoutReleased(bchTxHash, recipient, token, amount, block.timestamp);
    }

    /**
     * @notice Autonomous Timelock Refund: If the bridge fails to fulfill on Bitcoin Cash,
     * the user can unilaterally withdraw 100% of their deposited tokens after 24h.
     */
    function refund(bytes32 depositId) external nonReentrant {
        Deposit storage dep = deposits[depositId];
        require(dep.sender != address(0), "BinaryLiquid: Deposit does not exist");
        require(!dep.completed, "BinaryLiquid: Deposit already settled");
        require(!dep.refunded, "BinaryLiquid: Already refunded");
        require(
            block.timestamp >= dep.timestamp + REFUND_TIMELOCK,
            "BinaryLiquid: Timelock active. Refund only available after 24 hours"
        );
        require(msg.sender == dep.sender, "BinaryLiquid: Only depositor can trigger refund");

        dep.refunded = true;

        bool refundedSuccess = IERC20(dep.token).transfer(dep.sender, dep.amount);
        require(refundedSuccess, "BinaryLiquid: Refund transfer failed");

        emit BridgeDepositRefunded(depositId, dep.sender, dep.token, dep.amount, block.timestamp);
    }

    // --- Admin & Sentinel Management ---

    function setWatchmanSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "BinaryLiquid: Invalid signer");
        emit WatchmanSignerUpdated(watchmanSigner, _newSigner);
        watchmanSigner = _newSigner;
    }

    function setTokenSupport(address token, bool supported) external onlyOwner {
        require(token != address(0), "BinaryLiquid: Invalid token");
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    function togglePause(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPauseToggled(_paused);
    }

    // --- Internal Helpers ---
    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _sig) internal pure returns (address) {
        require(_sig.length == 65, "BinaryLiquid: Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }

        if (v < 27) v += 27;
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }
}
