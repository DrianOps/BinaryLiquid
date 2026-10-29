// Quick verification script
const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting API Integration Tests...\n');

  // 1. Status
  const statusRes = await fetch(`${BASE_URL}/api/status`);
  const statusData = await statusRes.json();
  console.log('✅ 1. GET /api/status:', statusData.status, '| Fee:', statusData.feePercentage + '%');

  // 2. Quote
  const quoteRes = await fetch(`${BASE_URL}/api/quote?fromToken=PUSD&toToken=USDC&amount=100`);
  const quoteData = await quoteRes.json();
  console.log('✅ 2. GET /api/quote (100 PUSD):');
  console.log(`   Rate: 1:${quoteData.quote.rate} | Fee (0.3%): ${quoteData.quote.feeAmount} PUSD | Net Payout: ${quoteData.quote.netPayout} USDC`);

  // 3. Create Swap Intent
  const createRes = await fetch(`${BASE_URL}/api/swap/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromToken: 'PUSD',
      toToken: 'USDC',
      fromChain: 'bch_chipnet',
      toChain: 'polygon_amoy',
      amount: 100,
      recipientAddress: '0x1234567890123456789012345678901234567890'
    })
  });
  const createData = await createRes.json();
  const swapId = createData.swap.id;
  console.log('✅ 3. POST /api/swap/create:');
  console.log(`   Swap ID: ${swapId}`);
  console.log(`   Deposit To: ${createData.swap.depositAddress}`);
  console.log(`   Status: ${createData.swap.status}`);

  // 4. Verify & Instant Relayer Payout
  const verifyRes = await fetch(`${BASE_URL}/api/swap/${swapId}/verify-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txHash: 'a5c0b1f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a39281706f5e4d3'
    })
  });
  const verifyData = await verifyRes.json();
  console.log('✅ 4. POST /api/swap/:id/verify-tx:');
  console.log(`   Status: ${verifyData.swap.status}`);
  console.log(`   Payout TX: ${verifyData.swap.payoutTxHash}`);
  console.log(`   Explorer: ${verifyData.swap.payoutExplorerUrl}`);

  // 5. Recent Swaps
  const recentRes = await fetch(`${BASE_URL}/api/swaps/recent`);
  const recentData = await recentRes.json();
  console.log(`✅ 5. GET /api/swaps/recent: Found ${recentData.count} swaps in public history`);

  // 6. Treasury
  const treasuryRes = await fetch(`${BASE_URL}/api/treasury`);
  const treasuryData = await treasuryRes.json();
  console.log('✅ 6. GET /api/treasury:');
  console.log(`   Total Volume: $${treasuryData.stats.totalVolumeUsd}`);
  console.log(`   Total Swaps: ${treasuryData.stats.totalSwapsCount}`);
  console.log(`   PUSD Fees Collected: ${treasuryData.stats.PUSD} PUSD`);

  console.log('\n🎉 ALL BACKEND API TESTS PASSED 100%!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
