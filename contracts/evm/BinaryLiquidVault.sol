// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BinaryLiquidVault
 * @author BinaryLiquid Protocol / DrianOps
 * @notice 100% Non-Custodial Triangular Cross-Chain Liquidity Vault connecting:
 *         - EVM Networks (Polygon PoS, Ethereum, Arbitrum, Base, Optimism, BNB Chain)
 *         - Bitcoin Cash CashTokens (PUSD, MUSD, LIFT via P2SH-32 Covenants)
 *         - Solana SVM (USDC, USDT, SOL via Anchor PDA Vaults)
 *
 * SECURITY INVARIANTS:
 * 1. Zero-Custody: Liquidity lives strictly inside this contract. Owner has NO arbitrary withdraw function.
 * 2. Cryptographic Attestation: "The Watchman" Sentinel only signs EIP-191 ECDSA attestations for verified BCH or Solana deposits.
 * 3. On-Chain Circuit Breaker: Enforces `maxSinglePayout` cap per settlement directly in EVM bytecode.
 * 4. Anti-Replay Registry: Each origin TxID (BCH or Solana) can be settled at most once (`executedPayouts[originTxHash]`).
 * 5. Autonomous Timelock Refund: Unsettled deposits can be reclaimed 100% unilaterally by the user after 24 hours.
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
    address public owner;
    address public watchmanSigner;
    bool public paused;

    uint256 public constant REFUND_TIMELOCK = 24 hours;
    uint256 public constant PROTOCOL_FEE_BPS = 30; // 0.30%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_SINGLE_PAYOUT = 50_000 * 1e6; // $50,000 cap per release

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

    mapping(bytes32 => Deposit) public deposits;
    mapping(bytes32 => bool) public executedPayouts;
    mapping(address => bool) public supportedTokens;

    event BridgeDepositInitiated(
        bytes32 indexed depositId,
        address indexed sender,
        address indexed token,
        uint256 grossAmount,
        uint256 netAmount,
        string bchRecipient,
        uint256 timestamp
    );

    event BridgeDepositSettled(
        bytes32 indexed depositId,
        bytes32 indexed bchPayoutTxHash,
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

    modifier onlyOwner() {
        require(msg.sender == owner, "BinaryLiquid: Not owner");
        _;
    }

    modifier onlyWatchman() {
        require(msg.sender == watchmanSigner, "BinaryLiquid: Not Watchman");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "BinaryLiquid: Paused by Circuit Breaker");
        _;
    }

    uint256 private _status;
    modifier nonReentrant() {
        require(_status != 2, "BinaryLiquid: Reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    constructor(address _watchmanSigner, address[] memory _initialSupportedTokens) {
        require(_watchmanSigner != address(0), "BinaryLiquid: Invalid Watchman");
        owner = msg.sender;
        watchmanSigner = _watchmanSigner;
        _status = 1;

        for (uint256 i = 0; i < _initialSupportedTokens.length; i++) {
            address tok = _initialSupportedTokens[i];
            if (tok != address(0)) {
                supportedTokens[tok] = true;
                emit TokenSupportUpdated(tok, true);
            }
        }
    }

    /**
     * @notice Deposit EVM tokens to bridge to Bitcoin Cash CashTokens (PUSD)
     */
    function deposit(
        address token,
        uint256 amount,
        string calldata bchRecipient
    ) external whenNotPaused nonReentrant returns (bytes32 depositId) {
        require(supportedTokens[token], "BinaryLiquid: Unsupported token");
        require(amount > 0, "BinaryLiquid: Zero amount");
        require(bytes(bchRecipient).length >= 20, "BinaryLiquid: Invalid BCH destination");

        uint256 fee = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        _safeTransferFrom(token, msg.sender, address(this), amount);

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
     * @notice Deposit EVM tokens to bridge to any target chain (Solana SVM or Bitcoin Cash L1)
     * @param token ERC-20 token address (USDC, USDT)
     * @param amount Gross deposit amount
     * @param destinationChain Target network identifier ("solana-mainnet" or "bch-mainnet")
     * @param destinationRecipient Base58 Solana address or CashAddr BCH address
     */
    function depositToChain(
        address token,
        uint256 amount,
        string calldata destinationChain,
        string calldata destinationRecipient
    ) external whenNotPaused nonReentrant returns (bytes32 depositId) {
        require(supportedTokens[token], "BinaryLiquid: Unsupported token");
        require(amount > 0, "BinaryLiquid: Zero amount");
        require(bytes(destinationChain).length >= 3, "BinaryLiquid: Invalid destination chain");
        require(bytes(destinationRecipient).length >= 20, "BinaryLiquid: Invalid destination recipient");

        uint256 fee = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        _safeTransferFrom(token, msg.sender, address(this), amount);

        string memory compositeDestination = string(abi.encodePacked(destinationChain, ":", destinationRecipient));

        depositId = keccak256(
            abi.encodePacked(
                msg.sender,
                token,
                amount,
                compositeDestination,
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
            bchRecipient: compositeDestination,
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
            compositeDestination,
            block.timestamp
        );
    }

    /**
     * @notice Marks an outbound EVM->BCH deposit settled once CashTokens Covenant releases on BCH
     */
    function markDepositCompleted(bytes32 depositId, bytes32 bchPayoutTxHash) external onlyWatchman {
        Deposit storage dep = deposits[depositId];
        require(dep.sender != address(0), "BinaryLiquid: Unknown deposit");
        require(!dep.refunded, "BinaryLiquid: Already refunded");
        dep.completed = true;
        emit BridgeDepositSettled(depositId, bchPayoutTxHash, block.timestamp);
    }

    /**
     * @notice Releases tokens on EVM upon cryptographic ECDSA attestation from The Watchman
     */
    function release(
        bytes32 bchTxHash,
        address recipient,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes calldata watchmanSignature
    ) external whenNotPaused nonReentrant {
        require(!executedPayouts[bchTxHash], "BinaryLiquid: Anti-Replay blocked");
        require(recipient != address(0), "BinaryLiquid: Invalid recipient");
        require(supportedTokens[token], "BinaryLiquid: Unsupported token");
        require(amount > 0 && amount <= MAX_SINGLE_PAYOUT, "BinaryLiquid: Exceeds circuit breaker");

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

        require(recoverSigner(messageHash, watchmanSignature) == watchmanSigner, "BinaryLiquid: Invalid Watchman signature");

        executedPayouts[bchTxHash] = true;

        _safeTransfer(token, recipient, amount);

        emit BridgePayoutReleased(bchTxHash, recipient, token, amount, block.timestamp);
    }

    /**
     * @notice Autonomous Timelock Refund (24h): Unconditional return of principal if unfulfilled
     */
    function refund(bytes32 depositId) external nonReentrant {
        Deposit storage dep = deposits[depositId];
        require(dep.sender != address(0), "BinaryLiquid: Unknown deposit");
        require(!dep.completed, "BinaryLiquid: Already settled");
        require(!dep.refunded, "BinaryLiquid: Already refunded");
        require(block.timestamp >= dep.timestamp + REFUND_TIMELOCK, "BinaryLiquid: 24h timelock active");
        require(msg.sender == dep.sender, "BinaryLiquid: Only depositor");

        dep.refunded = true;
        _safeTransfer(dep.token, dep.sender, dep.amount);

        emit BridgeDepositRefunded(depositId, dep.sender, dep.token, dep.amount, block.timestamp);
    }

    function setWatchmanSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "BinaryLiquid: Zero signer");
        emit WatchmanSignerUpdated(watchmanSigner, _newSigner);
        watchmanSigner = _newSigner;
    }

    function setTokenSupport(address token, bool supported) external onlyOwner {
        require(token != address(0), "BinaryLiquid: Zero token");
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    function togglePause(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPauseToggled(_paused);
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "BinaryLiquid: SafeERC20 transfer failed"
        );
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "BinaryLiquid: SafeERC20 transferFrom failed"
        );
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _sig) internal pure returns (address) {
        require(_sig.length == 65, "BinaryLiquid: Invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "BinaryLiquid: Invalid signature v");
        // EIP-2: Reject malleable upper-half secp256k1 s values
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "BinaryLiquid: Malleable signature s"
        );
        address signer = ecrecover(_ethSignedMessageHash, v, r, s);
        require(signer != address(0), "BinaryLiquid: Invalid ecrecover signer");
        return signer;
    }
}
