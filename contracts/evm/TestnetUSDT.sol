// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TestnetUSDT
 * @notice Official Amoy Testnet Liquidity & Faucet Token (6 Decimals) for BinaryLiquid Protocol.
 * Pre-funds the Non-Custodial BinaryLiquidVault smart contract at genesis and provides a
 * rate-capped public faucet for hackathon judges, community testers, and developers.
 */
contract TestnetUSDT {
    string public constant name = "Tether USD (Amoy Testnet)";
    string public constant symbol = "USDT";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    uint256 public constant MAX_FAUCET_MINT = 1000 * 1e6; // Max 1,000 USDT per faucet request

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address initialVaultContract) {
        // Pre-seed 500,000 Testnet USDT directly into the Non-Custodial Vault contract
        if (initialVaultContract != address(0)) {
            _mint(initialVaultContract, 500_000 * 1e6);
        }
        // Mint 10,000 Testnet USDT to deployer for automated faucet distribution
        _mint(msg.sender, 10_000 * 1e6);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "USDT: insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }

    /**
     * @notice Public Testnet Faucet for Hackathon Judges & Testers (up to 1,000 USDT)
     */
    function faucet(address recipient, uint256 amount) external returns (bool) {
        require(recipient != address(0), "USDT: zero recipient");
        require(amount > 0 && amount <= MAX_FAUCET_MINT, "USDT: max 1000 per faucet call");
        _mint(recipient, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(to != address(0), "USDT: transfer to zero address");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "USDT: transfer amount exceeds balance");
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
