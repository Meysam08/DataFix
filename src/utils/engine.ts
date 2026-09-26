import {
  ColumnDetail,
  ColumnStats,
  ColumnType,
  DatasetAnalysis,
  CleaningOperations,
  TransformPreviewResult,
  DetectedIssue,
  DiffSample,
  CsvStructure,
  MalformedRowDetail
} from '../types/dataset';

const EMPTY_VALUES = new Set([
  '', 'null', 'nan', 'none', 'na', 'n/a', '?', 'nil', '#n/a', '-', 'undefined',
  'سفید', 'خالی', 'ندارد', 'نامشخص'
]);

export function isEmptyVal(val: any): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return EMPTY_VALUES.has(s);
}

export function normalizePersianArabicDigits(val: string): string {
  return val
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}

export function tryParseNum(val: any): number | null {
  if (isEmptyVal(val)) return null;
  const s = normalizePersianArabicDigits(String(val)).trim().replace(/,/g, '');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(s)) {
    return null;
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

export function isBool(val: any): boolean | null {
  if (isEmptyVal(val)) return null;
  const s = String(val).trim().toLowerCase();
  if (['true', 't', 'yes', 'y', '1', '1.0', 'بله', 'صحیح', 'درست'].includes(s)) return true;
  if (['false', 'f', 'no', 'n', '0', '0.0', 'خیر', 'غلط', 'نادرست', 'نه'].includes(s)) return false;
  return null;
}

export function isDateStr(val: any): boolean {
  if (isEmptyVal(val)) return false;
  const s = String(val).trim();
  if (s.length < 6) return false;
  // Check for common date format patterns to avoid numbers being parsed as dates
  if (
    !/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s) &&
    !/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(s) &&
    !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)
  ) {
    return false;
  }
  const d = Date.parse(s.replace(/[/.]/g, '-'));
  return !isNaN(d);
}

export function formatCsvField(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (
    s.includes(',') ||
    s.includes('"') ||
    s.includes('\n') ||
    s.includes('\r') ||
    s.includes(';') ||
    s.includes('\t') ||
    s.includes('|') ||
    /^\s|\s$/.test(s)
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function serializeCsv(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(formatCsvField).join(',');
  const rowLines = rows.map((row) => row.map(formatCsvField).join(','));
  return [headerLine, ...rowLines].join('\n');
}

export interface ParseCsvResult {
  headers: string[];
  rows: string[][];
  structure: CsvStructure;
  rawRows: string[][];
}

export function parseCsv(csvText: string): ParseCsvResult {
  const emptyResult: ParseCsvResult = {
    headers: [],
    rows: [],
    structure: {
      valid: true,
      expected_columns: 0,
      malformed_rows: 0,
      malformed_row_details: [],
    },
    rawRows: [],
  };

  if (!csvText || !csvText.trim()) return emptyResult;

  // Strip UTF-8 BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter based on unquoted sample
  const sample = cleanText.slice(0, 4096);
  let commaCount = 0;
  let semiCount = 0;
  let tabCount = 0;
  let pipeCount = 0;
  let inQ = false;
  for (let i = 0; i < sample.length; i++) {
    const c = sample[i];
    if (c === '"') {
      if (inQ && i + 1 < sample.length && sample[i + 1] === '"') {
        i++;
        continue;
      }
      inQ = !inQ;
    } else if (!inQ) {
      if (c === ',') commaCount++;
      else if (c === ';') semiCount++;
      else if (c === '\t') tabCount++;
      else if (c === '|') pipeCount++;
      else if (c === '\n') {
        if (commaCount > 0 || semiCount > 0 || tabCount > 0 || pipeCount > 0) break;
      }
    }
  }

  let delimiter = ',';
  const counts = [
    { delim: ';', count: semiCount },
    { delim: '\t', count: tabCount },
    { delim: '|', count: pipeCount },
    { delim: ',', count: commaCount },
  ];
  counts.sort((a, b) => b.count - a.count);
  if (counts[0].count > 0 && counts[0].delim !== ',') {
    delimiter = counts[0].delim;
  }

  // Full RFC 4180 streaming state-machine parser
  const parsedRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  const len = cleanText.length;

  for (let i = 0; i < len; i++) {
    const char = cleanText[i];

    if (inQuotes) {
      if (char === '"') {
        // Escaped double quote ("")
        if (i + 1 < len && cleanText[i + 1] === '"') {
          currentField += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (i + 1 < len && cleanText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          parsedRows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          parsedRows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  // Push remaining field / row
  if (currentField.length > 0 || inQuotes || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      parsedRows.push(currentRow);
    }
  }

  if (parsedRows.length === 0) {
    return emptyResult;
  }

  const rawHeaders = parsedRows[0];
  const headers = rawHeaders.map((h, i) => {
    const trimmed = h.trim();
    return trimmed ? trimmed : `column_${i + 1}`;
  });

  const rawData = parsedRows.slice(1);
  const colCount = headers.length;
  const normalizedRows: string[][] = [];
  const malformedDetails: MalformedRowDetail[] = [];

  for (let rIdx = 0; rIdx < rawData.length; rIdx++) {
    const r = rawData[rIdx];
    if (r.length === 0 || (r.length === 1 && r[0].trim() === '')) {
      continue;
    }
    const rowNumber = rIdx + 2; // 1-based, line 1 is header
    if (r.length !== colCount) {
      malformedDetails.push({
        row_number: rowNumber,
        expected_columns: colCount,
        actual_columns: r.length,
        raw_fields: [...r],
      });
    }

    const row = [...r];
    if (row.length < colCount) {
      while (row.length < colCount) row.push('');
    } else if (row.length > colCount) {
      // Keep row length aligned to colCount for standard columnar index access,
      // while safely preserving the full raw row in malformedDetails and rawRows.
      row.length = colCount;
    }
    normalizedRows.push(row);
  }

  const structure: CsvStructure = {
    valid: malformedDetails.length === 0,
    expected_columns: colCount,
    malformed_rows: malformedDetails.length,
    malformed_row_details: malformedDetails,
  };

  return { headers, rows: normalizedRows, structure, rawRows: rawData };
}

function calculateColumnStats(numbers: number[]): ColumnStats | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((acc, v) => acc + v, 0) / n;

  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Standard deviation
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const std_dev = Math.sqrt(variance);

  // Percentiles for IQR
  const getPercentile = (p: number) => {
    const k = (n - 1) * p;
    const f = Math.floor(k);
    const c = Math.ceil(k);
    if (f === c) return sorted[k];
    return sorted[f] * (c - k) + sorted[c] * (k - f);
  };

  const q1 = getPercentile(0.25);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;
  const lower_bound = q1 - 1.5 * iqr;
  const upper_bound = q3 + 1.5 * iqr;

  const outliers = sorted.filter((v) => v < lower_bound || v > upper_bound);

  return {
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    std_dev: Number(std_dev.toFixed(4)),
    q1: Number(q1.toFixed(4)),
    q3: Number(q3.toFixed(4)),
    iqr: Number(iqr.toFixed(4)),
    lower_bound: Number(lower_bound.toFixed(4)),
    upper_bound: Number(upper_bound.toFixed(4)),
    outlier_count: outliers.length,
    sample_outliers: outliers.slice(0, 5).map((v) => Number(v.toFixed(4))),
    iqr_is_zero: iqr === 0,
  };
}

export function calculatePearsonCorrelation(xVals: number[], yVals: number[]): number {
  if (xVals.length < 5 || xVals.length !== yVals.length) return 0;
  const n = xVals.length;
  const meanX = xVals.reduce((a, b) => a + b, 0) / n;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return num / den;
}

export function localAnalyzeDataset(
  csvText: string,
  _filename?: string,
  targetColumn?: string | null
): DatasetAnalysis {
  const { headers, rows, structure } = parseCsv(csvText);
  const totalRows = rows.length;
  const totalCols = headers.length;

  const targetRegex = /(price|target|label|cost|salary|revenue|churn|outcome|grade|score|sales|profit|value)/i;
  const target_candidates: string[] = [];
  headers.forEach((h) => {
    if (targetRegex.test(h) || h.toLowerCase().endsWith('(usd)') || h.toLowerCase().endsWith('_usd')) {
      target_candidates.push(h);
    }
  });
  const designatedTarget = targetColumn && headers.includes(targetColumn) ? targetColumn : null;
  if (designatedTarget && !target_candidates.includes(designatedTarget)) {
    target_candidates.push(designatedTarget);
  }

  if (totalRows === 0 || totalCols === 0) {
    return {
      rows: 0,
      columns: [],
      column_names: [],
      missing_values: 0,
      missing_pct: 0,
      duplicate_rows: 0,
      duplicate_pct: 0,
      quality_score: 0,
      score_breakdown: {
        missing_penalty: 0,
        duplicate_penalty: 0,
        empty_col_penalty: 0,
        type_penalty: 0,
        outlier_penalty: 0,
      },
      detected_issues: [
        {
          severity: 'high',
          confidence: 'actionable',
          title: 'Empty Dataset',
          description: 'The dataset has no data rows.',
          recommendation: 'Upload a valid CSV with header and data rows.',
        },
      ],
      preview_rows: [],
      csv_structure: structure,
      target_column: designatedTarget,
      target_candidates,
      collinear_pairs: [],
    };
  }

  // Duplicate detection using exact JSON serialization
  const rowHashCounts = new Map<string, number>();
  for (const r of rows) {
    const key = JSON.stringify(r);
    rowHashCounts.set(key, (rowHashCounts.get(key) || 0) + 1);
  }
  let duplicate_rows = 0;
  rowHashCounts.forEach((count) => {
    if (count > 1) duplicate_rows += count - 1;
  });
  const duplicate_pct = Number(((duplicate_rows / totalRows) * 100).toFixed(2));

  const totalCells = totalRows * totalCols;
  let totalMissingCells = 0;
  const columns: ColumnDetail[] = [];
  const detected_issues: DetectedIssue[] = [];

  // Check CSV structural integrity
  if (structure && structure.malformed_rows > 0) {
    detected_issues.push({
      severity: 'high',
      title: 'Inconsistent CSV Field Count',
      description: `${structure.malformed_rows} row(s) contain an inconsistent number of fields (expected ${totalCols}). These rows require inspection before reliable analysis.`,
      recommendation: 'Inspect malformed rows to verify delimiters, unescaped quotes, or line breaks in source data.',
    });
  }

  for (let cIdx = 0; cIdx < totalCols; cIdx++) {
    const colName = headers[cIdx];
    const colVals = rows.map((r) => r[cIdx]);
    const nonNull = colVals.filter((v) => !isEmptyVal(v));
    const missingCount = totalRows - nonNull.length;
    totalMissingCells += missingCount;
    const missingPct = Number(((missingCount / totalRows) * 100).toFixed(2));
    const uniqueSet = new Set(nonNull);
    const uniqueCount = uniqueSet.size;
    const uniquePct = Number(((uniqueCount / totalRows) * 100).toFixed(2));
    const isEmpty = nonNull.length === 0;

    // Type detection
    let intCount = 0;
    let floatCount = 0;
    let boolCount = 0;
    let dateCount = 0;
    const numericValues: number[] = [];
    let typeInconsistencies = 0;

    for (const v of nonNull) {
      const num = tryParseNum(v);
      if (num !== null) {
        numericValues.push(num);
        if (Number.isInteger(num)) intCount++;
        else floatCount++;
      } else if (isBool(v) !== null) {
        boolCount++;
      } else if (isDateStr(v)) {
        dateCount++;
      }
    }

    const totalValid = nonNull.length;
    let inferredType: ColumnType = 'string';
    if (totalValid > 0) {
      if ((intCount + floatCount) / totalValid >= 0.8) {
        inferredType = intCount / totalValid >= 0.8 && floatCount === 0 ? 'integer' : 'float';
      } else if (boolCount / totalValid >= 0.8) {
        inferredType = 'boolean';
      } else if (dateCount / totalValid >= 0.8) {
        inferredType = 'datetime';
      }
    }

    if (inferredType === 'integer' || inferredType === 'float') {
      typeInconsistencies = totalValid - numericValues.length;
    }

    const stats = numericValues.length > 0 ? calculateColumnStats(numericValues) : null;

    // Mode
    let modeVal: string | null = null;
    if (nonNull.length > 0) {
      const valCounts = new Map<string, number>();
      for (const val of nonNull) {
        valCounts.set(val, (valCounts.get(val) || 0) + 1);
      }
      let topCount = 0;
      valCounts.forEach((cnt, val) => {
        if (cnt > topCount) {
          topCount = cnt;
          modeVal = val;
        }
      });
    }

    const isTargetCol = target_candidates.includes(colName) || designatedTarget === colName;

    // Issues
    if (isEmpty) {
      detected_issues.push({
        severity: 'high',
        confidence: 'actionable',
        detection_type: 'missing',
        title: `Empty Column: ${colName}`,
        column: colName,
        description: `Column "${colName}" has 100% missing values. It contains no variance for ML algorithms.`,
        recommendation: 'Drop column in Cleaning Workspace',
        risk: 'Feature has zero variance and conveys no predictive signal to estimators.',
      });
    } else if (missingPct > 20) {
      let rec: string;
      if (missingPct > 50) {
        rec = 'Consider dropping column due to high missingness';
      } else if (inferredType === 'integer' || inferredType === 'float') {
        rec = 'Impute with median or drop rows depending on whether missingness invalidates observation';
      } else {
        rec = 'Mode imputation is one possible strategy, but row removal may be preferable when missing values make records unsuitable';
      }
      detected_issues.push({
        severity: missingPct > 50 ? 'high' : 'medium',
        confidence: 'actionable',
        detection_type: 'missing',
        title: `High Missing Rate in ${colName}`,
        column: colName,
        description: `Column has ${missingCount} missing values (${missingPct}% of rows).`,
        recommendation: rec,
        risk: 'High missingness increases synthetic distortion if imputed.',
      });
    } else if (missingCount > 0) {
      const rec = inferredType === 'integer' || inferredType === 'float'
        ? 'Impute with median or drop rows depending on whether missingness invalidates observation'
        : 'Mode imputation is one possible strategy, but row removal may be preferable when missing values make records unsuitable';
      detected_issues.push({
        severity: 'low',
        confidence: 'actionable',
        detection_type: 'missing',
        title: `Missing Values in ${colName}`,
        column: colName,
        description: `${missingCount} empty cells (${missingPct}%) found.`,
        recommendation: rec,
        risk: 'Mode/median imputation compresses variance; row removal reduces sample size.',
      });
    }

    if (typeInconsistencies > 0) {
      detected_issues.push({
        severity: 'medium',
        confidence: 'actionable',
        detection_type: 'type',
        title: `Type Inconsistency in ${colName}`,
        column: colName,
        description: `${typeInconsistencies} values cannot be parsed as ${inferredType}.`,
        recommendation: 'Cast to clean numeric or replace invalid strings',
        risk: 'Non-numeric text in numeric features will trigger model training failure.',
      });
    }

    if (stats && stats.outlier_count > 0) {
      const outlierPct = Number(((stats.outlier_count / numericValues.length) * 100).toFixed(2));
      
      if (stats.iqr_is_zero) {
        detected_issues.push({
          severity: 'low',
          confidence: 'review',
          detection_type: 'outlier',
          title: `Degenerate IQR / Concentrated Distribution in ${colName}`,
          column: colName,
          description: `${stats.outlier_count} values differ from the IQR boundary because Q1, median, and Q3 are all ${stats.median}. This does not establish that these values are invalid. Inspect the distribution before modifying them.`,
          recommendation: `Inspect distribution before modifying; automatic clipping to ${stats.median} could destroy legitimate variation.`,
          risk: `Clipping these values to ${stats.median} would destroy legitimate feature variation and erase true information.`,
        });
      } else {
        const maxVal = stats.max;
        const ub = stats.upper_bound;
        const minVal = stats.min;
        const lb = stats.lower_bound;
        const isSevereLeverage = (ub > 0 && maxVal > ub * 5) || (lb < 0 && minVal < lb * 5);

        let confidence: 'actionable' | 'review' = 'review';
        let desc = `${stats.outlier_count} values (${outlierPct}%) lie outside standard 1.5x IQR boundaries [${stats.lower_bound}, ${stats.upper_bound}].`;
        let rec = 'Review distribution before modifying; clip only if domain rules dictate.';
        let risk = 'Modifying natural heavy-tailed distribution values artificially suppresses real-world variance.';

        if (isTargetCol) {
          confidence = 'review';
          desc = `${stats.outlier_count} values (${outlierPct}%) outside standard 1.5x IQR [${stats.lower_bound}, ${stats.upper_bound}]. Extreme target values may be legitimate observations and should generally be investigated before being clipped or removed.`;
          rec = 'Inspect target distribution; avoid automatic clipping of dependent variable.';
          risk = 'Clipping target values distorts true outcome variance and biases model predictions.';
        } else if (isSevereLeverage && outlierPct > 0.5) {
          confidence = 'actionable';
          desc = `${stats.outlier_count} values (${outlierPct}%) outside 1.5x IQR [${stats.lower_bound}, ${stats.upper_bound}]. Maximum observed value (${maxVal}) exhibits extreme leverage. Verify whether this represents data entry error.`;
          rec = 'Inspect distribution; consider clipping or filtering severe leverage anomalies if confirmed as entry errors.';
          risk = 'Extreme leverage points can destabilize linear estimators, but legitimate large observations should be preserved.';
        }

        detected_issues.push({
          severity: outlierPct < 5.0 && !isSevereLeverage ? 'low' : 'medium',
          confidence,
          detection_type: 'outlier',
          title: `Potential Outliers in ${colName}`,
          column: colName,
          description: desc,
          recommendation: rec,
          risk,
        });
      }
    }

    columns.push({
      index: cIdx,
      name: colName,
      type: inferredType,
      missing_count: missingCount,
      missing_pct: missingPct,
      unique_count: uniqueCount,
      unique_pct: uniquePct,
      is_empty: isEmpty,
      mode: modeVal,
      stats,
      type_inconsistencies: typeInconsistencies,
      sample_values: Array.from(uniqueSet).slice(0, 5),
      is_target_candidate: isTargetCol,
    });
  }

  // Pairwise numeric collinearity detection
  const numericColIndices = columns
    .map((c, i) => (c.type === 'integer' || c.type === 'float') && c.stats ? i : -1)
    .filter((i) => i !== -1);
  const collinear_pairs: { col1: string; col2: string; correlation: number }[] = [];

  for (let idxA = 0; idxA < numericColIndices.length; idxA++) {
    for (let idxB = idxA + 1; idxB < numericColIndices.length; idxB++) {
      const c1Idx = numericColIndices[idxA];
      const c2Idx = numericColIndices[idxB];
      const col1Name = headers[c1Idx];
      const col2Name = headers[c2Idx];

      const pairsX: number[] = [];
      const pairsY: number[] = [];
      for (const r of rows) {
        const v1 = tryParseNum(r[c1Idx]);
        const v2 = tryParseNum(r[c2Idx]);
        if (v1 !== null && v2 !== null) {
          pairsX.push(v1);
          pairsY.push(v2);
        }
      }

      if (pairsX.length >= 5) {
        const corr = calculatePearsonCorrelation(pairsX, pairsY);
        if (Math.abs(corr) >= 0.98) {
          const roundedCorr = Number(corr.toFixed(4));
          collinear_pairs.push({
            col1: col1Name,
            col2: col2Name,
            correlation: roundedCorr,
          });

          columns[c1Idx].collinear_with = columns[c1Idx].collinear_with || [];
          columns[c1Idx].collinear_with!.push({ column: col2Name, correlation: roundedCorr });
          columns[c2Idx].collinear_with = columns[c2Idx].collinear_with || [];
          columns[c2Idx].collinear_with!.push({ column: col1Name, correlation: roundedCorr });

          detected_issues.push({
            severity: 'low',
            confidence: 'informational',
            detection_type: 'collinearity',
            title: `Strong Correlation: ${col1Name} & ${col2Name} (r = ${corr.toFixed(2)})`,
            column: `${col1Name}, ${col2Name}`,
            description: `These columns may represent the same underlying measurement in different units or scales (r = ${corr.toFixed(2)}). Consider selecting one as the modeling target rather than treating both as independent targets.`,
            recommendation: 'Inspect feature definitions; avoid treating both as independent predictive targets.',
            risk: 'Retaining collinear duplicates inflates regression variance and distorts estimator feature importance.',
          });
        }
      }
    }
  }

  if (duplicate_rows > 0) {
    detected_issues.push({
      severity: duplicate_pct > 10 ? 'high' : 'medium',
      confidence: 'actionable',
      detection_type: 'duplicate',
      title: `${duplicate_rows} Duplicate Rows Detected`,
      column: 'All',
      description: `${duplicate_rows} exact duplicate rows found (${duplicate_pct}% of total dataset). Exact duplicate rows were detected; confirm that duplicate observations do not represent legitimate repeated records.`,
      recommendation: 'Remove duplicate rows for ML datasets to prevent leakage, after verifying they are not legitimate repeated measurements.',
      risk: 'If duplicates represent distinct repeated events, dropping them reduces valid empirical sample weight.',
    });
  }

  // Scoring
  const missingRatio = totalMissingCells / totalCells;
  const missingPenalty = Math.min(35, missingRatio * 100 * 0.7);
  const dupRatio = duplicate_rows / totalRows;
  const dupPenalty = Math.min(25, dupRatio * 100 * 0.8);
  const emptyCols = columns.filter((c) => c.is_empty).length;
  const emptyColPenalty = Math.min(20, (emptyCols / totalCols) * 100);
  const totalIncon = columns.reduce((acc, c) => acc + c.type_inconsistencies, 0);
  const typePenalty = Math.min(10, (totalIncon / totalCells) * 100 * 5);
  // Exclude degenerate IQR zero columns from outlier penalty deduction
  const totalOutliers = columns.reduce(
    (acc, c) => acc + (c.stats && !c.stats.iqr_is_zero ? c.stats.outlier_count : 0),
    0
  );
  const outlierPenalty = Math.min(10, (totalOutliers / totalCells) * 100 * 0.5);

  const quality_score = Math.max(
    5,
    Math.round(100 - (missingPenalty + dupPenalty + emptyColPenalty + typePenalty + outlierPenalty))
  );

  const preview_rows = rows.slice(0, 25).map((r, rIdx) => {
    const rowObj: Record<string, any> = { _row_id: rIdx + 1 };
    headers.forEach((h, cIdx) => {
      rowObj[h] = r[cIdx] ?? '';
    });
    const malformed = structure.malformed_row_details.find((m) => m.row_number === rIdx + 2);
    if (malformed && malformed.actual_columns > totalCols && malformed.raw_fields) {
      rowObj['_extra_fields'] = malformed.raw_fields.slice(totalCols);
    }
    return rowObj;
  });

  return {
    rows: totalRows,
    columns,
    column_names: headers,
    missing_values: totalMissingCells,
    missing_pct: Number(((totalMissingCells / totalCells) * 100).toFixed(2)),
    duplicate_rows,
    duplicate_pct,
    quality_score,
    score_breakdown: {
      missing_penalty: Number(missingPenalty.toFixed(1)),
      duplicate_penalty: Number(dupPenalty.toFixed(1)),
      empty_col_penalty: Number(emptyColPenalty.toFixed(1)),
      type_penalty: Number(typePenalty.toFixed(1)),
      outlier_penalty: Number(outlierPenalty.toFixed(1)),
    },
    detected_issues,
    preview_rows,
    csv_structure: structure,
    target_column: designatedTarget,
    target_candidates,
    collinear_pairs,
  };
}

export function localApplyTransformations(
  csvText: string,
  operations: CleaningOperations,
  filename: string = 'dataset.csv'
): TransformPreviewResult & { cleaned_csv: string } {
  const { headers: origHeaders, rows: origRows } = parseCsv(csvText);
  let curHeaders = [...origHeaders];
  let curRows = origRows.map((r) => [...r]);
  const applied: string[] = [];
  const operationDetails: any[] = [];
  const warnings: string[] = [];
  const diffSamples: DiffSample[] = [];

  // 1. Remove duplicates
  if (operations.remove_duplicates) {
    const initLen = curRows.length;
    const seen = new Set<string>();
    const deduped: string[][] = [];
    for (const r of curRows) {
      const key = JSON.stringify(r);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
    }
    const removed = initLen - deduped.length;
    curRows = deduped;
    if (removed > 0) {
      applied.push(`Removed ${removed} duplicate row(s)`);
      operationDetails.push({
        category: 'duplicates',
        detection: `${removed} exact duplicate row(s) identified`,
        why_detected: 'Row contents are completely identical across all columns',
        rationale: 'Deduplication prevents data leakage between train/test splits',
        risk: 'If identical observations represent distinct real-world events, sample frequency is altered',
        confidence: 'actionable',
        user_action: `Removed ${removed} duplicate row(s)`,
      });
    }
  }

  // 2. Missing values - Global
  if (operations.missing_actions.global === 'drop_rows') {
    const initLen = curRows.length;
    curRows = curRows.filter((r) => !r.some((v) => isEmptyVal(v)));
    const dropped = initLen - curRows.length;
    if (dropped > 0) {
      applied.push(`Dropped ${dropped} row(s) containing missing values`);
      operationDetails.push({
        category: 'missing',
        detection: `${dropped} row(s) containing missing cells`,
        why_detected: 'Empty or sentinel missing values in row records',
        rationale: 'Global strategy: drop all incomplete rows',
        risk: 'Reduces total sample size and may introduce selection bias if missingness is non-random',
        confidence: 'actionable',
        user_action: `Dropped ${dropped} row(s)`,
      });
    }
  }

  // Missing values - Column specific
  const colActions = operations.missing_actions.columns || {};
  for (const [colName, act] of Object.entries(colActions)) {
    const cIdx = curHeaders.indexOf(colName);
    if (cIdx === -1) continue;

    if (act.action === 'drop_rows') {
      const initLen = curRows.length;
      curRows = curRows.filter((r) => !isEmptyVal(r[cIdx]));
      const dropped = initLen - curRows.length;
      if (dropped > 0) {
        applied.push(`Dropped ${dropped} row(s) with missing '${colName}'`);
        operationDetails.push({
          category: 'missing',
          column: colName,
          detection: `${dropped} missing cell(s) in '${colName}'`,
          why_detected: `Empty or sentinel missing values in feature '${colName}'`,
          rationale: `Dropped rows with missing '${colName}'`,
          risk: 'Reduces sample size for downstream modeling',
          confidence: 'actionable',
          user_action: `Dropped ${dropped} row(s) with missing '${colName}'`,
        });
      }
    } else if (['mean', 'median', 'mode', 'custom'].includes(act.action)) {
      const validVals = curRows.map((r) => r[cIdx]).filter((v) => !isEmptyVal(v));
      let fillVal: string | null = null;

      if (act.action === 'custom') {
        fillVal = act.value || '';
      } else if (act.action === 'mode') {
        if (validVals.length > 0) {
          const counts = new Map<string, number>();
          validVals.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
          let maxC = 0;
          counts.forEach((c, v) => {
            if (c > maxC) {
              maxC = c;
              fillVal = v;
            }
          });
        }
      } else if (act.action === 'mean' || act.action === 'median') {
        const nums = validVals.map((v) => tryParseNum(v)).filter((n): n is number => n !== null);
        if (nums.length > 0) {
          if (act.action === 'mean') {
            const sum = nums.reduce((a, b) => a + b, 0);
            fillVal = (sum / nums.length).toFixed(2);
          } else {
            const sorted = [...nums].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            fillVal =
              sorted.length % 2 !== 0
                ? String(sorted[mid])
                : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
          }
        } else {
          warnings.push(`Cannot calculate ${act.action} for non-numeric column '${colName}'`);
        }
      }

      if (fillVal !== null) {
        let imputed = 0;
        curRows.forEach((r, rIdx) => {
          if (isEmptyVal(r[cIdx])) {
            const orig = r[cIdx];
            r[cIdx] = fillVal!;
            imputed++;
            if (diffSamples.length < 10) {
              diffSamples.push({
                row_index: rIdx + 1,
                column: colName,
                original: orig || '(empty)',
                new: fillVal!,
                action: `Imputed with ${act.action}`,
              });
            }
          }
        });
        if (imputed > 0) {
          applied.push(`Filled ${imputed} missing cell(s) in '${colName}' with ${act.action} (${fillVal})`);
          operationDetails.push({
            category: 'missing',
            column: colName,
            detection: `${imputed} missing cell(s) in '${colName}'`,
            why_detected: `Empty or sentinel missing values in feature '${colName}'`,
            rationale: `Imputed missing cells with ${act.action} (${fillVal})`,
            risk: 'Artificially compresses feature variance and can bias correlations',
            confidence: 'actionable',
            user_action: `Imputed ${imputed} cell(s) with ${act.action} (${fillVal})`,
          });
        }
      }
    }
  }

  // 3. Outlier handling
  const outlierActions = operations.outlier_actions || {};
  for (const [colName, act] of Object.entries(outlierActions)) {
    const cIdx = curHeaders.indexOf(colName);
    if (cIdx === -1) continue;

    const nums = curRows.map((r) => tryParseNum(r[cIdx])).filter((n): n is number => n !== null);
    if (nums.length === 0) continue;
    const stats = calculateColumnStats(nums);
    if (!stats || stats.outlier_count === 0) continue;

    const lb = stats.lower_bound;
    const ub = stats.upper_bound;

    if (act === 'keep') {
      operationDetails.push({
        category: 'outliers',
        column: colName,
        detection: stats.iqr_is_zero
          ? `${stats.outlier_count} values differing from boundary`
          : `${stats.outlier_count} values outside 1.5x IQR [${lb}, ${ub}]`,
        why_detected: stats.iqr_is_zero
          ? `Q1 = ${stats.q1}, Median = ${stats.median}, Q3 = ${stats.q3} (IQR = 0, concentrated distribution)`
          : `Distribution tails beyond 1.5x IQR [${lb}, ${ub}]`,
        rationale: 'Preserved original values without alteration (Recommended for concentrated distributions and target candidates)',
        risk: 'Preserves true empirical variation; high leverage values may influence sensitive estimators',
        confidence: 'review',
        user_action: 'Kept original values without modification',
      });
    } else if (act === 'remove') {
      const initLen = curRows.length;
      curRows = curRows.filter((r) => {
        const n = tryParseNum(r[cIdx]);
        if (n === null) return true;
        return n >= lb && n <= ub;
      });
      const removed = initLen - curRows.length;
      if (removed > 0) {
        applied.push(`Removed ${removed} row(s) with outliers in '${colName}' outside [${lb}, ${ub}]`);
        operationDetails.push({
          category: 'outliers',
          column: colName,
          detection: `${stats.outlier_count} values outside [${lb}, ${ub}]`,
          why_detected: `Values outside Tukey 1.5x IQR boundaries [${lb}, ${ub}]`,
          rationale: `Removed ${removed} row(s) containing extreme outliers`,
          risk: 'Permanently discards observations, reducing statistical power',
          confidence: 'actionable',
          user_action: `Removed ${removed} row(s)`,
        });
      }
    } else if (act === 'clip') {
      let clipped = 0;
      curRows.forEach((r, rIdx) => {
        const n = tryParseNum(r[cIdx]);
        if (n !== null) {
          if (n < lb) {
            const orig = r[cIdx];
            r[cIdx] = String(lb);
            clipped++;
            if (diffSamples.length < 10) {
              diffSamples.push({
                row_index: rIdx + 1,
                column: colName,
                original: orig,
                new: String(lb),
                action: 'Clipped lower outlier',
              });
            }
          } else if (n > ub) {
            const orig = r[cIdx];
            r[cIdx] = String(ub);
            clipped++;
            if (diffSamples.length < 10) {
              diffSamples.push({
                row_index: rIdx + 1,
                column: colName,
                original: orig,
                new: String(ub),
                action: 'Clipped upper outlier',
              });
            }
          }
        }
      });
      if (clipped > 0) {
        applied.push(`Clipped ${clipped} outlier value(s) in '${colName}' to [${lb}, ${ub}]`);
        operationDetails.push({
          category: 'outliers',
          column: colName,
          detection: `${stats.outlier_count} values outside [${lb}, ${ub}]`,
          why_detected: stats.iqr_is_zero
            ? `Q1 = ${stats.q1}, Median = ${stats.median}, Q3 = ${stats.q3} (IQR = 0)`
            : `Values lie beyond 1.5x IQR boundaries [${lb}, ${ub}]`,
          rationale: `Clipped ${clipped} value(s) to [${lb}, ${ub}]`,
          risk: stats.iqr_is_zero
            ? `Clipping to ${stats.median} destroys all valid variation in concentrated features`
            : 'Clipping alters the empirical distribution and compresses valid variance',
          confidence: stats.iqr_is_zero ? 'review' : 'actionable',
          user_action: `Clipped ${clipped} value(s) to [${lb}, ${ub}]`,
        });
      }
    }
  }

  // 4. Filtering rules
  const filterRules = operations.filter_rules || [];
  for (const rule of filterRules) {
    const cIdx = curHeaders.indexOf(rule.column);
    if (cIdx === -1 || !rule.value) continue;
    const initLen = curRows.length;

    curRows = curRows.filter((r) => {
      const cell = r[cIdx];
      if (isEmptyVal(cell)) return false;
      const numCell = tryParseNum(cell);
      const numTarget = tryParseNum(rule.value);
      if (numCell !== null && numTarget !== null) {
        if (rule.operator === '>') return numCell > numTarget;
        if (rule.operator === '<') return numCell < numTarget;
        if (rule.operator === '>=') return numCell >= numTarget;
        if (rule.operator === '<=') return numCell <= numTarget;
        if (rule.operator === '==') return numCell === numTarget;
        if (rule.operator === '!=') return numCell !== numTarget;
      }
      const sCell = String(cell).toLowerCase();
      const sTarget = String(rule.value).toLowerCase();
      if (rule.operator === '==') return sCell === sTarget;
      if (rule.operator === '!=') return sCell !== sTarget;
      if (rule.operator === 'contains') return sCell.includes(sTarget);
      return true;
    });

    const removed = initLen - curRows.length;
    applied.push(`Filtered rows where '${rule.column}' ${rule.operator} '${rule.value}' (${removed} removed)`);
    if (removed > 0) {
      operationDetails.push({
        category: 'user_selected',
        column: rule.column,
        detection: `Row filter condition: '${rule.column}' ${rule.operator} '${rule.value}'`,
        why_detected: `User configured custom rule on '${rule.column}'`,
        rationale: `Filtered out ${removed} non-matching row(s)`,
        risk: 'Removes records permanently; verify filter criteria aligns with target population',
        confidence: 'actionable',
        user_action: `Filtered ${removed} row(s)`,
      });
    }
  }

  // 5. Type Conversions
  const typeConversions = operations.type_conversions || {};
  for (const [colName, targetType] of Object.entries(typeConversions)) {
    const cIdx = curHeaders.indexOf(colName);
    if (cIdx === -1) continue;

    let convSuccess = 0;
    let convFailed = 0;

    curRows.forEach((r) => {
      const cell = r[cIdx];
      if (isEmptyVal(cell)) return;

      if (targetType === 'integer') {
        const n = tryParseNum(cell);
        if (n !== null) {
          r[cIdx] = String(Math.round(n));
          convSuccess++;
        } else convFailed++;
      } else if (targetType === 'float') {
        const n = tryParseNum(cell);
        if (n !== null) {
          r[cIdx] = String(n);
          convSuccess++;
        } else convFailed++;
      } else if (targetType === 'boolean') {
        const b = isBool(cell);
        if (b !== null) {
          r[cIdx] = b ? 'True' : 'False';
          convSuccess++;
        } else convFailed++;
      } else if (targetType === 'string') {
        r[cIdx] = String(cell);
        convSuccess++;
      }
    });

    if (convFailed > 0) {
      warnings.push(`${convFailed} value(s) in '${colName}' could not be safely converted to ${targetType}`);
    }
    if (convSuccess > 0) {
      applied.push(`Cast column '${colName}' to ${targetType}`);
      operationDetails.push({
        category: 'user_selected',
        column: colName,
        detection: `Column schema typing: cast '${colName}' to ${targetType}`,
        why_detected: `Explicit formatting requested for machine learning estimators`,
        rationale: `Standardizes data type representation for downstream models`,
        risk: convFailed > 0 ? `${convFailed} non-parseable values were left intact` : 'Minimal; ensures numeric/boolean format consistency',
        confidence: 'actionable',
        user_action: `Cast '${colName}' to ${targetType}`,
      });
    }
  }

  // 6. Drop columns
  const dropCols = operations.drop_columns || [];
  const validDrops = dropCols.filter((c) => curHeaders.includes(c));
  if (validDrops.length > 0) {
    const keepIndices = curHeaders.map((_, i) => i).filter((i) => !validDrops.includes(curHeaders[i]));
    curHeaders = keepIndices.map((i) => curHeaders[i]);
    curRows = curRows.map((r) => keepIndices.map((i) => r[i]));
    applied.push(`Dropped ${validDrops.length} column(s): ${validDrops.join(', ')}`);
    validDrops.forEach((dCol) => {
      operationDetails.push({
        category: 'user_selected',
        column: dCol,
        detection: `Column '${dCol}' scheduled for removal`,
        why_detected: `Feature dropped by user configuration or identified as 100% empty`,
        rationale: `Removes unneeded or zero-variance feature from modeling matrix`,
        risk: 'Feature information is completely excluded from estimators',
        confidence: 'actionable',
        user_action: `Dropped feature column '${dCol}'`,
      });
    });
  }

  // 7. Rename columns
  const renameCols = operations.rename_columns || {};
  let renamedCount = 0;
  curHeaders = curHeaders.map((h) => {
    if (renameCols[h] && renameCols[h].trim() && renameCols[h].trim() !== h) {
      renamedCount++;
      const targetName = renameCols[h].trim();
      operationDetails.push({
        category: 'user_selected',
        column: h,
        detection: `Feature renamed from '${h}' to '${targetName}'`,
        why_detected: `User specified standardized naming convention`,
        rationale: `Improves column readability and pipeline naming standards`,
        risk: 'Zero mathematical risk; schema name change only',
        confidence: 'actionable',
        user_action: `Renamed to '${targetName}'`,
      });
      return targetName;
    }
    return h;
  });
  if (renamedCount > 0) {
    applied.push(`Renamed ${renamedCount} column(s)`);
  }

  // Generate cleaned CSV string using safe RFC 4180 serializer
  const cleanedCsv = serializeCsv(curHeaders, curRows);
  const newAnalysis = localAnalyzeDataset(cleanedCsv, filename, operations.target_column);

  const preview_rows = curRows.slice(0, 25).map((r, rIdx) => {
    const rowObj: Record<string, any> = { _row_id: rIdx + 1 };
    curHeaders.forEach((h, cIdx) => {
      rowObj[h] = r[cIdx];
    });
    return rowObj;
  });

  // Generate python code
  const pythonCode = generatePythonScript(operations, filename);

  return {
    status: 'success',
    original_rows: origRows.length,
    new_rows: curRows.length,
    rows_removed: origRows.length - curRows.length,
    original_columns: origHeaders.length,
    new_columns: curHeaders.length,
    columns_removed: origHeaders.length - curHeaders.length,
    new_headers: curHeaders,
    new_quality_score: newAnalysis.quality_score,
    new_analysis: newAnalysis,
    applied_operations: applied,
    operation_details: operationDetails,
    warnings,
    diff_samples: diffSamples,
    preview_rows,
    python_code: pythonCode,
    cleaned_csv: cleanedCsv,
  };
}

export function generatePythonScript(ops: CleaningOperations, filename: string = 'dataset.csv'): string {
  const cleanFilename = filename.startsWith('cleaned_') ? filename : `cleaned_${filename}`;
  const lines: string[] = [
    '# DataFix Generated Dataset Preparation Pipeline',
    '# Deterministic Data Preprocessing & Cleaning Script for Machine Learning',
    'import pandas as pd',
    'import numpy as np',
    '',
    '# 1. Load Dataset',
    `df = pd.read_csv(${JSON.stringify(filename)})`,
    "print(f'Initial shape: {df.shape}')",
    '',
  ];

  if (ops.remove_duplicates) {
    lines.push('# 2. Deduplication');
    lines.push('initial_rows = len(df)');
    lines.push('df = df.drop_duplicates()');
    lines.push("print(f'Dropped {initial_rows - len(df)} duplicate row(s)')\n");
  }

  if (ops.missing_actions?.global === 'drop_rows') {
    lines.push('# 3. Drop rows with missing values');
    lines.push('initial_rows = len(df)');
    lines.push('df = df.dropna()');
    lines.push("print(f'Dropped {initial_rows - len(df)} row(s) containing missing values')\n");
  }

  const colMiss = ops.missing_actions?.columns || {};
  Object.entries(colMiss).forEach(([col, act]) => {
    const colRepr = JSON.stringify(col);
    if (act.action === 'drop_rows') {
      lines.push(`df = df.dropna(subset=[${colRepr}])`);
    } else if (act.action === 'mean') {
      lines.push(`df[${colRepr}] = df[${colRepr}].fillna(df[${colRepr}].mean())`);
    } else if (act.action === 'median') {
      lines.push(`df[${colRepr}] = df[${colRepr}].fillna(df[${colRepr}].median())`);
    } else if (act.action === 'mode') {
      lines.push(`mode_val = df[${colRepr}].mode()[0] if not df[${colRepr}].mode().empty else np.nan`);
      lines.push(`df[${colRepr}] = df[${colRepr}].fillna(mode_val)`);
    } else if (act.action === 'custom') {
      lines.push(`df[${colRepr}] = df[${colRepr}].fillna(${JSON.stringify(act.value || '')})`);
    }
  });

  const outlierActions = ops.outlier_actions || {};
  Object.entries(outlierActions).forEach(([col, act]) => {
    if (act === 'keep') return;
    const colRepr = JSON.stringify(col);
    lines.push(`\n# Outlier remediation for ${colRepr} (1.5x IQR)`);
    lines.push(`q1 = df[${colRepr}].quantile(0.25)`);
    lines.push(`q3 = df[${colRepr}].quantile(0.75)`);
    lines.push(`iqr = q3 - q1`);
    lines.push(`lower_bound = q1 - 1.5 * iqr`);
    lines.push(`upper_bound = q3 + 1.5 * iqr`);
    if (act === 'remove') {
      lines.push(`df = df[(df[${colRepr}] >= lower_bound) & (df[${colRepr}] <= upper_bound)]`);
    } else if (act === 'clip') {
      lines.push(`df[${colRepr}] = df[${colRepr}].clip(lower=lower_bound, upper=upper_bound)`);
    }
  });

  const filterRules = ops.filter_rules || [];
  filterRules.forEach((rule) => {
    const col = rule.column;
    const op = rule.operator;
    const val = rule.value;
    if (col && op && val !== undefined) {
      const colRepr = JSON.stringify(col);
      const numVal = tryParseNum(val);
      if (numVal !== null && ['>', '<', '>=', '<=', '=='].includes(op)) {
        lines.push(`df = df[pd.to_numeric(df[${colRepr}], errors='coerce') ${op} ${numVal}]`);
      } else if (numVal !== null && op === '!=') {
        lines.push(`df = df[pd.to_numeric(df[${colRepr}], errors='coerce') != ${numVal}]`);
      } else if (op === '==') {
        lines.push(`df = df[df[${colRepr}].astype('string').str.lower() == ${JSON.stringify(String(val).toLowerCase())}]`);
      } else if (op === '!=') {
        lines.push(`df = df[df[${colRepr}].astype('string').str.lower() != ${JSON.stringify(String(val).toLowerCase())}]`);
      } else if (op === 'contains') {
        lines.push(`df = df[df[${colRepr}].astype('string').str.contains(${JSON.stringify(String(val))}, case=False, na=False)]`);
      }
    }
  });

  const typeConvs = ops.type_conversions || {};
  Object.entries(typeConvs).forEach(([col, dtype]) => {
    const colRepr = JSON.stringify(col);
    if (dtype === 'integer') {
      lines.push(`df[${colRepr}] = pd.to_numeric(df[${colRepr}], errors='coerce').round().astype('Int64')`);
    } else if (dtype === 'float') {
      lines.push(`df[${colRepr}] = pd.to_numeric(df[${colRepr}], errors='coerce')`);
    } else if (dtype === 'boolean') {
      lines.push(`# Safe semantic boolean conversion for ${colRepr} (explicit dictionary mapping)`);
      lines.push(`_bool_map = {'true': True, 't': True, 'yes': True, '1': True, '1.0': True, 'بله': True, 'صحیح': True, 'درست': True, 'false': False, 'f': False, 'no': False, '0': False, '0.0': False, 'خیر': False, 'غلط': False, 'نادرست': False, 'نه': False}`);
      lines.push(`_norm = df[${colRepr}].astype('string').str.strip().str.lower()`);
      lines.push(`_mapped = _norm.map(_bool_map)`);
      lines.push(`_invalid_cnt = (df[${colRepr}].notna() & _mapped.isna()).sum()`);
      lines.push(`if _invalid_cnt > 0:`);
      lines.push(`    print(f'Warning: {_invalid_cnt} invalid boolean value(s) in ${colRepr} coerced to NA')`);
      lines.push(`df[${colRepr}] = _mapped.astype('boolean')`);
    } else if (dtype === 'string') {
      lines.push(`df[${colRepr}] = df[${colRepr}].astype('string')`);
    }
  });

  if (ops.drop_columns && ops.drop_columns.length > 0) {
    lines.push(`\n# Drop unnecessary columns`);
    lines.push(`df = df.drop(columns=${JSON.stringify(ops.drop_columns)}, errors='ignore')`);
  }

  if (ops.rename_columns && Object.keys(ops.rename_columns).length > 0) {
    lines.push(`\n# Rename columns for modeling consistency`);
    lines.push(`df = df.rename(columns=${JSON.stringify(ops.rename_columns)})`);
  }

  lines.push('\n# Final verification');
  lines.push("print(f'Final cleaned shape: {df.shape}')");
  lines.push(`df.to_csv(${JSON.stringify(cleanFilename)}, index=False)`);
  lines.push(`print(f'Saved cleaned dataset to ${cleanFilename}')`);

  return lines.join('\n');
}

// Full-stack API caller with automatic instant fallback
export async function executeDatasetAnalysis(
  csvContent: string,
  targetColumn?: string | null
): Promise<DatasetAnalysis> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_content: csvContent, target_column: targetColumn }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.analysis) {
        return data.analysis;
      }
    }
  } catch (e) {
    console.warn('Backend /api/analyze failed, falling back to local Python-equivalent math:', e);
  }
  return localAnalyzeDataset(csvContent, undefined, targetColumn);
}

export async function executePreviewTransform(
  csvContent: string,
  operations: CleaningOperations,
  filename: string
): Promise<TransformPreviewResult> {
  try {
    const res = await fetch('/api/preview-transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_content: csvContent, operations, filename }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend /api/preview-transform failed, falling back to local Python-equivalent math:', e);
  }
  return localApplyTransformations(csvContent, operations, filename);
}

export async function executeApplyTransform(
  csvContent: string,
  operations: CleaningOperations,
  filename: string
): Promise<{ cleaned_csv: string; new_analysis: DatasetAnalysis; applied_operations: string[]; warnings: string[]; python_code: string }> {
  try {
    const res = await fetch('/api/apply-transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_content: csvContent, operations, filename }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.cleaned_csv) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Backend /api/apply-transform failed, falling back to local Python-equivalent math:', e);
  }
  const localRes = localApplyTransformations(csvContent, operations, filename);
  return {
    cleaned_csv: localRes.cleaned_csv,
    new_analysis: localRes.new_analysis,
    applied_operations: localRes.applied_operations,
    warnings: localRes.warnings,
    python_code: localRes.python_code,
  };
}
