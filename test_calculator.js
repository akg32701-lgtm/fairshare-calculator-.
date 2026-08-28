/**
 * Test Suite for FairShare Calculator Calculations and Logic
 */

function runTests() {
  console.log('=== FairShare Calculator Logic Test Suite ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  function assertNear(actual, expected, message, tolerance = 0.01) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
      console.log(`✅ PASS: ${message} (Expected: ${expected}, Got: ${actual.toFixed(2)})`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message} (Expected: ${expected}, Got: ${actual.toFixed(2)}, Diff: ${diff.toFixed(4)})`);
      failed++;
    }
  }

  // Calculation function extracted for testing
  function compute(state) {
    const rent = Math.max(0, parseFloat(state.rent) || 0);
    let utilitiesTotal = 0;
    if (state.utilitiesMode === 'itemized') {
      utilitiesTotal = state.utilitiesItemized.reduce((sum, item) => sum + (Math.max(0, parseFloat(item.amount) || 0)), 0);
    } else {
      utilitiesTotal = Math.max(0, parseFloat(state.utilitiesLump) || 0);
    }

    const totalMonthlyCost = rent + utilitiesTotal;
    const isAnnual = state.timeHorizon === 'annual';
    const multiplier = isAnnual ? 12 : 1;
    const numRoommates = Math.max(1, state.roommates.length);
    const totalHouseholdMonthlyIncome = state.roommates.reduce((sum, r) => sum + (Math.max(0, parseFloat(r.income) || 0)), 0);
    const totalWeights = state.roommates.reduce((sum, r) => sum + (Math.max(0, parseFloat(r.weight) || 0)), 0);

    const roommateBreakdowns = state.roommates.map((r, idx) => {
      const income = Math.max(0, parseFloat(r.income) || 0);
      const weight = Math.max(0, parseFloat(r.weight) || 1.0);
      let monthlyShare = 0;

      if (state.splitMethod === 'equal') {
        monthlyShare = totalMonthlyCost / numRoommates;
      } else if (state.splitMethod === 'income') {
        if (totalHouseholdMonthlyIncome > 0) {
          monthlyShare = totalMonthlyCost * (income / totalHouseholdMonthlyIncome);
        } else {
          monthlyShare = totalMonthlyCost / numRoommates;
        }
      } else if (state.splitMethod === 'custom') {
        if (totalWeights > 0) {
          monthlyShare = totalMonthlyCost * (weight / totalWeights);
        } else {
          monthlyShare = totalMonthlyCost / numRoommates;
        }
      }

      const incomeRatio = income > 0 ? (monthlyShare / income) * 100 : 0;
      const targetThreshold = state.affordabilityThreshold;
      const maxAffordableMonthly = income * (targetThreshold / 100);
      const monthlyBuffer = maxAffordableMonthly - monthlyShare;

      let status = 'safe';
      if (income === 0) status = 'warn';
      else if (incomeRatio > targetThreshold + 10) status = 'danger';
      else if (incomeRatio > targetThreshold) status = 'warn';

      return {
        name: r.name,
        income,
        weight,
        monthlyShare,
        displayShare: monthlyShare * multiplier,
        displayIncome: income * multiplier,
        displayMaxAffordable: maxAffordableMonthly * multiplier,
        displayBuffer: monthlyBuffer * multiplier,
        incomeRatio,
        status
      };
    });

    const rentBurdenedCount = roommateBreakdowns.filter(r => r.income > 0 && r.incomeRatio > state.affordabilityThreshold).length;
    const householdRatio = totalHouseholdMonthlyIncome > 0 ? (totalMonthlyCost / totalHouseholdMonthlyIncome) * 100 : 0;
    const avgPerPerson = totalMonthlyCost / numRoommates;

    return {
      rent,
      utilitiesTotal,
      totalMonthlyCost,
      displayTotalCost: totalMonthlyCost * multiplier,
      displayTotalIncome: totalHouseholdMonthlyIncome * multiplier,
      totalHouseholdMonthlyIncome,
      avgPerPerson: avgPerPerson * multiplier,
      householdRatio,
      rentBurdenedCount,
      numRoommates,
      roommateBreakdowns
    };
  }

  // --- Test 1: Itemized Utilities Summation ---
  console.log('--- Test Group 1: Itemized Utilities ---');
  const state1 = {
    rent: 2000,
    utilitiesMode: 'itemized',
    utilitiesItemized: [
      { name: 'Electricity', amount: 100 },
      { name: 'Water', amount: 50 },
      { name: 'Internet', amount: 80 }
    ],
    splitMethod: 'equal',
    affordabilityThreshold: 30,
    timeHorizon: 'monthly',
    roommates: [
      { name: 'Alex', income: 4000, weight: 1.0 },
      { name: 'Jordan', income: 4000, weight: 1.0 }
    ]
  };
  const res1 = compute(state1);
  assertNear(res1.utilitiesTotal, 230, 'Total itemized utilities sum correctly (100 + 50 + 80 = 230)');
  assertNear(res1.totalMonthlyCost, 2230, 'Total monthly cost is 2230 (2000 + 230)');
  assertNear(res1.avgPerPerson, 1115, 'Average per person is 1115');

  // --- Test 2: Equal Split ---
  console.log('\n--- Test Group 2: Equal Split ---');
  assertNear(res1.roommateBreakdowns[0].monthlyShare, 1115, 'Alex monthly share is 1115');
  assertNear(res1.roommateBreakdowns[1].monthlyShare, 1115, 'Jordan monthly share is 1115');
  assertNear(res1.roommateBreakdowns[0].incomeRatio, 27.875, 'Alex income ratio is 27.875% (under 30%)');
  assert(res1.roommateBreakdowns[0].status === 'safe', 'Alex status is safe (< 30%)');
  assert(res1.rentBurdenedCount === 0, 'Zero rent burdened roommates');

  // --- Test 3: Income-Weighted Split with Income Disparity ---
  console.log('\n--- Test Group 3: Income-Weighted Split ---');
  const state3 = {
    rent: 3000,
    utilitiesMode: 'lump',
    utilitiesLump: 300,
    splitMethod: 'income',
    affordabilityThreshold: 30,
    timeHorizon: 'monthly',
    roommates: [
      { name: 'High Earner', income: 7000, weight: 1.0 },
      { name: 'Mid Earner', income: 3000, weight: 1.0 },
      { name: 'Student', income: 1000, weight: 1.0 }
    ]
  };
  // Total cost: 3300, Total income: 11000
  // Household ratio: 3300 / 11000 = 30%
  // High Earner share: 3300 * (7000/11000) = 2100 (30% of 7000)
  // Mid Earner share: 3300 * (3000/11000) = 900 (30% of 3000)
  // Student share: 3300 * (1000/11000) = 300 (30% of 1000)
  const res3 = compute(state3);
  assertNear(res3.householdRatio, 30.0, 'Household ratio is exactly 30%');
  assertNear(res3.roommateBreakdowns[0].monthlyShare, 2100, 'High earner pays 2100');
  assertNear(res3.roommateBreakdowns[1].monthlyShare, 900, 'Mid earner pays 900');
  assertNear(res3.roommateBreakdowns[2].monthlyShare, 300, 'Student pays 300');
  assertNear(res3.roommateBreakdowns[2].incomeRatio, 30.0, 'Student pays exactly 30% of their income');
  assert(res3.rentBurdenedCount === 0, 'No rent burdened roommates with income-weighted split');

  // --- Test 4: Contrast Equal Split with Income Disparity (Rent Burden check) ---
  console.log('\n--- Test Group 4: Equal Split on Disparity Data ---');
  const state4 = { ...state3, splitMethod: 'equal' };
  const res4 = compute(state4);
  // Equal share = 3300 / 3 = 1100
  // High earner: 1100 / 7000 = 15.7% (safe)
  // Mid earner: 1100 / 3000 = 36.67% (warn - moderate burden > 30%)
  // Student: 1100 / 1000 = 110% (danger - severe burden > 40%)
  assertNear(res4.roommateBreakdowns[0].incomeRatio, 15.714, 'High earner ratio is 15.7%');
  assert(res4.roommateBreakdowns[0].status === 'safe', 'High earner status is safe');
  assertNear(res4.roommateBreakdowns[1].incomeRatio, 36.667, 'Mid earner ratio is 36.7%');
  assert(res4.roommateBreakdowns[1].status === 'warn', 'Mid earner status is warn (30-40%)');
  assertNear(res4.roommateBreakdowns[2].incomeRatio, 110.0, 'Student ratio is 110%');
  assert(res4.roommateBreakdowns[2].status === 'danger', 'Student status is danger (> 40%)');
  assert(res4.rentBurdenedCount === 2, '2 roommates are rent-burdened under equal split');

  // --- Test 5: Custom Room-Size / Weight Split ---
  console.log('\n--- Test Group 5: Custom Room-Size / Weight Split ---');
  const state5 = {
    rent: 2000,
    utilitiesMode: 'lump',
    utilitiesLump: 400,
    splitMethod: 'custom',
    affordabilityThreshold: 30,
    timeHorizon: 'monthly',
    roommates: [
      { name: 'Master Bedroom', income: 5000, weight: 1.4 },
      { name: 'Standard Room', income: 4000, weight: 1.0 }
    ]
  };
  // Total cost: 2400. Total weight: 2.4.
  // Master Bedroom share: 2400 * (1.4 / 2.4) = 1400
  // Standard Room share: 2400 * (1.0 / 2.4) = 1000
  const res5 = compute(state5);
  assertNear(res5.roommateBreakdowns[0].monthlyShare, 1400, 'Master bedroom share is 1400');
  assertNear(res5.roommateBreakdowns[1].monthlyShare, 1000, 'Standard room share is 1000');
  assertNear(res5.roommateBreakdowns[0].incomeRatio, 28.0, 'Master bedroom income ratio is 28%');
  assertNear(res5.roommateBreakdowns[1].incomeRatio, 25.0, 'Standard room income ratio is 25%');

  // --- Test 6: Edge Cases ---
  console.log('\n--- Test Group 6: Edge Cases ($0 Income, Single Roommate, Zero Utilities) ---');
  const state7 = {
    rent: 1200,
    utilitiesMode: 'lump',
    utilitiesLump: 0,
    splitMethod: 'income',
    affordabilityThreshold: 30,
    timeHorizon: 'monthly',
    roommates: [
      { name: 'Alex', income: 0, weight: 1.0 }
    ]
  };
  const res7 = compute(state7);
  assertNear(res7.totalMonthlyCost, 1200, 'Total cost handles 0 utilities correctly');
  assertNear(res7.roommateBreakdowns[0].monthlyShare, 1200, 'Single roommate with 0 income gets full share gracefully');
  assert(res7.roommateBreakdowns[0].status === 'warn', 'Zero income is flagged as warning status');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
