import assert from 'assert';
import {
  localAnalyzeDataset,
  localApplyTransformations,
  generatePythonScript
} from '../src/utils/engine';
import {
  getActionableRecommendations,
  getDefaultOperations
} from '../src/utils/recommendations';

console.log('=== Running DataFix TypeScript Regression Tests ===\n');

// ---------------------------------------------------------------------------
// Test A — Zero IQR:
// A concentrated column where Q1=Median=Q3=2, therefore IQR = 0,
// should not automatically receive a clipping recommendation merely because IQR = 0.
// ---------------------------------------------------------------------------
console.log('Running Test A: Zero IQR column safety...');
{
  const csvData = [
    'Room,Price',
    '2,100',
    '2,120',
    '2,110',
    '2,130',
    '2,125',
    '2,115',
    '2,105',
    '1,90',
    '3,150',
    '4,200',
  ].join('\n');

  const analysis = localAnalyzeDataset(csvData, 'test_zero_iqr.csv');
  const roomCol = analysis.columns.find((c) => c.name === 'Room');
  assert(roomCol, 'Room column must be present');
  assert(roomCol.stats, 'Room stats must be computed');
  assert.strictEqual(roomCol.stats.iqr, 0, 'Room IQR must be 0 when Q1=2 and Q3=2');
  assert.strictEqual(roomCol.stats.iqr_is_zero, true, 'iqr_is_zero must be true');

  // Verify recommendations
  const recs = getActionableRecommendations(analysis);
  const roomRec = recs.find((r) => r.column === 'Room');
  assert(roomRec, 'Room recommendation must exist');
  assert.strictEqual(roomRec.confidence, 'review', 'Zero-IQR recommendation confidence must be "review", not "actionable"');
  assert(
    roomRec.titleEn.toLowerCase().includes('concentrated distribution') ||
    roomRec.titleEn.toLowerCase().includes('degenerate iqr'),
    'Title must mention degenerate IQR or concentrated distribution'
  );
  assert(
    roomRec.whyEn.includes('IQR method cannot reliably distinguish') ||
    roomRec.whyEn.includes('differs from the IQR boundary'),
    'Why text must explain that zero spread causes IQR degeneration'
  );

  // Verify default operations
  const defaultOps = getDefaultOperations(analysis);
  assert.strictEqual(
    defaultOps.outlier_actions['Room'],
    'keep',
    'Default outlier action for zero-IQR column MUST be "keep", NEVER "clip"'
  );

  // Verify that if user keeps default, generated Python script does NOT clip Room
  const pyScript = generatePythonScript(defaultOps, 'test_zero_iqr.csv');
  assert(
    !pyScript.includes("df['Room'].clip"),
    'Generated Python script must NOT clip Room when kept'
  );

  console.log('✓ Test A Passed: Zero IQR columns safely classified as Review and default to "keep" without clipping.');
}

// ---------------------------------------------------------------------------
// Test B — Legitimate target extremes:
// A numeric target with a long-tailed distribution should be flagged for review
// rather than automatically clipped solely because of IQR.
// ---------------------------------------------------------------------------
console.log('\nRunning Test B: Legitimate target extremes...');
{
  const csvData = [
    'sqft,Price',
    '1000,200000',
    '1200,240000',
    '1100,220000',
    '1500,300000',
    '1300,260000',
    '1400,280000',
    '1600,320000',
    '1700,340000',
    '3500,2500000', // high-end luxury property
  ].join('\n');

  // Designate Price as target column
  const analysis = localAnalyzeDataset(csvData, 'target_test.csv', 'Price');
  const priceCol = analysis.columns.find((c) => c.name === 'Price');
  assert(priceCol, 'Price column must be present');
  assert(priceCol.stats && priceCol.stats.outlier_count > 0, 'Price must have statistical outlier');
  assert.strictEqual(priceCol.is_target_candidate, true, 'Price must be identified as target candidate');

  const recs = getActionableRecommendations(analysis);
  const priceRec = recs.find((r) => r.column === 'Price');
  assert(priceRec, 'Price outlier recommendation must exist');
  assert.strictEqual(priceRec.confidence, 'review', 'Target outlier recommendation must be "review", not automatically actionable');
  assert(
    priceRec.whyEn.includes('Extreme target values may be legitimate observations'),
    'Recommendation must explain target values should be investigated before clipping'
  );

  const defaultOps = getDefaultOperations(analysis);
  assert.strictEqual(
    defaultOps.outlier_actions['Price'],
    'keep',
    'Target outliers MUST default to "keep"'
  );

  console.log('✓ Test B Passed: Target extremes flagged for review and default to "keep".');
}

// ---------------------------------------------------------------------------
// Test C — Missing categorical value:
// A categorical column with missing values should produce possible strategies
// rather than declaring mode imputation universally correct.
// ---------------------------------------------------------------------------
console.log('\nRunning Test C: Missing categorical values & contextual strategy...');
{
  const csvData = [
    'id,Address,Price',
    '1,Shahran,100',
    '2,Punak,120',
    '3,,110', // Missing address
    '4,Punak,130',
    '5,Saadat Abad,150',
    '6,,140', // Missing address
  ].join('\n');

  const analysis = localAnalyzeDataset(csvData, 'missing_cat.csv');
  const addrCol = analysis.columns.find((c) => c.name === 'Address');
  assert(addrCol, 'Address column must exist');
  assert.strictEqual(addrCol.missing_count, 2, 'Must detect 2 missing addresses');

  const recs = getActionableRecommendations(analysis);
  const addrRec = recs.find((r) => r.column === 'Address');
  assert(addrRec, 'Address missing recommendation must exist');
  assert(
    addrRec.whyEn.includes('Mode imputation') && addrRec.whyEn.includes('row removal may be preferable'),
    'Must present mode imputation as one possibility and row removal as an alternative when missingness invalidates record'
  );
  assert(
    !addrRec.whyEn.includes('unquestionable') && !addrRec.whyEn.includes('universally correct'),
    'Must not claim mode imputation is universally correct'
  );

  console.log('✓ Test C Passed: Categorical missingness presents nuanced strategy options without universal best-practice dogma.');
}

// ---------------------------------------------------------------------------
// Test D — Exact duplicates:
// Duplicate rows should be detected correctly and recommendation should remain
// reversible and auditable.
// ---------------------------------------------------------------------------
console.log('\nRunning Test D: Exact duplicate rows detection and auditability...');
{
  const csvData = [
    'A,B,C',
    '1,X,10',
    '2,Y,20',
    '2,Y,20', // Duplicate 1
    '3,Z,30',
    '2,Y,20', // Duplicate 2
  ].join('\n');

  const analysis = localAnalyzeDataset(csvData, 'dup_test.csv');
  assert.strictEqual(analysis.duplicate_rows, 2, 'Must detect 2 duplicate rows');

  const recs = getActionableRecommendations(analysis);
  const dupRec = recs.find((r) => r.category === 'duplicates');
  assert(dupRec, 'Duplicate recommendation must exist');
  assert(
    dupRec.whyEn.includes('confirm that duplicate observations do not represent legitimate repeated records'),
    'Recommendation must instruct user to confirm whether duplicates represent distinct real-world events'
  );

  // Apply transformation and verify audit trail
  const ops = getDefaultOperations(analysis);
  ops.remove_duplicates = true;
  const result = localApplyTransformations(csvData, ops, 'dup_test.csv');
  assert.strictEqual(result.rows_removed, 2, 'Result must have removed exactly 2 duplicate rows');
  assert.strictEqual(result.new_rows, 3, 'Cleaned dataset must contain 3 unique rows');

  assert(result.operation_details, 'Audit trail operation_details must be defined');
  const dupDetail = result.operation_details.find((d: any) => d.category === 'duplicates');
  assert(dupDetail, 'Audit trail must contain operation_details entry for duplicates');
  assert.strictEqual(dupDetail.confidence, 'actionable');
  assert(dupDetail.detection && dupDetail.why_detected && dupDetail.rationale && dupDetail.risk && dupDetail.user_action,
    'Audit detail must contain complete 5-part structure'
  );

  console.log('✓ Test D Passed: Exact duplicates detected accurately with complete reversible audit trail.');
}

// ---------------------------------------------------------------------------
// Test E — Current housePrice.csv behavior:
// The current Tehran apartment dataset should still parse correctly and produce
// expected structural statistics.
// ---------------------------------------------------------------------------
console.log('\nRunning Test E: Current housePrice.csv parsing and structural statistics...');
{
  const housePriceCsv = [
    'Area,Room,Parking,Warehouse,Elevator,Address,Price,Price(USD)',
    '63,1,True,True,True,Shahran,1850000000,61666.67',
    '60,1,True,True,True,Shahran,1850000000,61666.67',
    '79,2,True,True,True,Pardis,550000000,18333.33',
    '95,2,True,True,True,Shahrake Gharb,9025000000,300833.33',
    '123,2,True,True,True,Shahrake Gharb,7000000000,233333.33',
    '105,2,True,True,True,Shahrake Gharb,7000000000,233333.33',
    '105,2,True,True,True,Shahrake Gharb,7000000000,233333.33', // Exact duplicate
    '145,2,True,True,True,Saadat Abad,12500000000,416666.67',
    '100,2,True,True,True,Punak,5000000000,166666.67',
    '85,2,True,True,True,,4200000000,140000.00', // Missing Address
    '110,2,True,True,True,Punak,5800000000,193333.33',
    '65,2,True,True,True,West Ferdows,3200000000,106666.67',
    '70,2,True,True,True,West Ferdows,3500000000,116666.67',
    '120,2,True,True,True,Gheitarieh,9600000000,320000.00',
    '88,2,True,True,True,Ostad Moein,2900000000,96666.67',
    '130,2,True,True,True,Gheitarieh,11000000000,366666.67',
    '75,2,True,True,True,Pardis,600000000,20000.00',
    '82,2,True,True,True,,3900000000,130000.00', // Missing Address
    '1000000000,2,True,True,True,Abazar,4500000000,150000.00', // Extreme Area typo
    '115,2,True,True,True,Niavaran,16000000000,533333.33',
    '90,2,True,True,True,Punak,4800000000,160000.00',
    '92,2,True,True,True,Shahran,3700000000,123333.33',
    '108,2,True,True,True,West Ferdows,6200000000,206666.67',
    '73,2,True,True,True,Pardis,580000000,19333.33',
    '180,3,True,True,True,Saadat Abad,19500000000,650000.00',
    '200,3,True,True,True,Zaferanieh,28000000000,933333.33',
    '160,3,True,True,True,Niavaran,22000000000,733333.33',
    '210,3,True,True,True,Elahieh,35000000000,1166666.67',
    '150,3,True,True,True,Pasdaran,14500000000,483333.33',
    '80,2,True,True,True,Amir Abad,5200000000,173333.33',
  ].join('\n');

  const analysis = localAnalyzeDataset(housePriceCsv, 'housePrice.csv');

  // Check columns
  assert.strictEqual(analysis.column_names.length, 8, 'Must have 8 columns');
  assert.deepStrictEqual(analysis.column_names, [
    'Area', 'Room', 'Parking', 'Warehouse', 'Elevator', 'Address', 'Price', 'Price(USD)'
  ]);

  // Check Address missingness
  const addrCol = analysis.columns.find((c) => c.name === 'Address');
  assert(addrCol && addrCol.missing_count === 2, 'Address must have 2 missing rows');

  // Check duplicate rows
  assert.strictEqual(analysis.duplicate_rows, 1, 'Must detect 1 duplicate row');

  // Check Room IQR
  const roomCol = analysis.columns.find((c) => c.name === 'Room');
  assert(roomCol && roomCol.stats, 'Room column must have stats');
  assert.strictEqual(roomCol.stats.iqr_is_zero, true, 'Room IQR must be 0');

  // Check Area outlier
  const areaCol = analysis.columns.find((c) => c.name === 'Area');
  assert(areaCol && areaCol.stats, 'Area must have stats');
  assert(areaCol.stats.max >= 1000000000, 'Area max must detect extreme typo');

  // Check Collinearity between Price and Price(USD)
  assert(analysis.collinear_pairs && analysis.collinear_pairs.length > 0, 'Must detect collinearity between Price and Price(USD)');
  const pair = analysis.collinear_pairs[0];
  assert(pair.col1.includes('Price') && pair.col2.includes('Price'), 'Collinear pair must be Price and Price(USD)');
  assert(pair.correlation > 0.99, 'Correlation must be near 1.0');

  // Check target candidates
  assert(analysis.target_candidates && analysis.target_candidates.includes('Price'), 'Price must be target candidate');
  assert(analysis.target_candidates && analysis.target_candidates.includes('Price(USD)'), 'Price(USD) must be target candidate');

  console.log('✓ Test E Passed: housePrice.csv successfully parsed with expected statistics, collinearity, and target candidates.');
}

console.log('\n========================================');
console.log('🎉 ALL 5 TYPESCRIPT REGRESSION TESTS PASSED!');
console.log('========================================\n');
