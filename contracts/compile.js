/**
 * @file compile.js
 * @description Compiles EVM (Solidity ^0.8.20) and Bitcoin Cash (CashScript ^0.14.0) Non-Custodial Vault Contracts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';
import { compileFile } from 'cashc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const evmDir = path.join(__dirname, 'evm');
const bchDir = path.join(__dirname, 'bch');
const evmOutDir = path.join(evmDir, 'artifacts');
const bchOutDir = path.join(bchDir, 'artifacts');

fs.mkdirSync(evmOutDir, { recursive: true });
fs.mkdirSync(bchOutDir, { recursive: true });

console.log('🔨 [1/2] Compiling Solidity EVM Contracts (Optimizer: 200 runs)...');

const solInput = {
  language: 'Solidity',
  sources: {
    'BinaryLiquidVault.sol': {
      content: fs.readFileSync(path.join(evmDir, 'BinaryLiquidVault.sol'), 'utf8')
    },
    'TestnetUSDC.sol': {
      content: fs.readFileSync(path.join(evmDir, 'TestnetUSDC.sol'), 'utf8')
    },
    'TestnetUSDT.sol': {
      content: fs.readFileSync(path.join(evmDir, 'TestnetUSDT.sol'), 'utf8')
    }
  },
  settings: {
    optimizer: { enabled: true, runs: 1 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.gasEstimates']
      }
    }
  }
};

const solOutput = JSON.parse(solc.compile(JSON.stringify(solInput)));

if (solOutput.errors) {
  let hasFatal = false;
  for (const err of solOutput.errors) {
    console.log(`   [${err.severity.toUpperCase()}] ${err.formattedMessage}`);
    if (err.severity === 'error') hasFatal = true;
  }
  if (hasFatal) process.exit(1);
}

for (const fileName of ['BinaryLiquidVault.sol', 'TestnetUSDC.sol', 'TestnetUSDT.sol']) {
  const contractName = fileName.replace('.sol', '');
  const compiled = solOutput.contracts[fileName][contractName];
  const artifact = {
    contractName,
    abi: compiled.abi,
    bytecode: '0x' + compiled.evm.bytecode.object
  };
  const outPath = path.join(evmOutDir, `${contractName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log(`   ✅ ${contractName} compiled (${artifact.bytecode.length / 2 - 1} bytes) -> ${outPath}`);
}

console.log('\n🔨 [2/2] Compiling Bitcoin Cash CashScript Covenants...');

for (const cashFile of ['BinaryLiquidVault.cash', 'BinaryLiquidEscrow.cash']) {
  const contractName = cashFile.replace('.cash', '');
  const artifact = compileFile(path.join(bchDir, cashFile));
  const outPath = path.join(bchOutDir, `${contractName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log(`   ✅ ${contractName} compiled (${artifact.bytecode.split(' ').length} opcodes) -> ${outPath}`);
}

console.log('\n🎉 All EVM & CashScript Non-Custodial Vault Contracts compiled cleanly!');
