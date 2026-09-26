export type ColumnType = 'integer' | 'float' | 'string' | 'boolean' | 'datetime';

export interface ColumnStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std_dev: number;
  q1: number;
  q3: number;
  iqr: number;
  lower_bound: number;
  upper_bound: number;
  outlier_count: number;
  sample_outliers: number[];
  iqr_is_zero?: boolean;
}

export interface ColumnDetail {
  index: number;
  name: string;
  type: ColumnType;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  unique_pct: number;
  is_empty: boolean;
  mode: string | null;
  stats: ColumnStats | null;
  type_inconsistencies: number;
  sample_values: string[];
  is_target_candidate?: boolean;
  collinear_with?: { column: string; correlation: number }[];
}

export interface DetectedIssue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  column?: string;
  description: string;
  recommendation: string;
  confidence?: 'informational' | 'review' | 'actionable';
  detection_type?: 'structural' | 'missing' | 'duplicate' | 'outlier' | 'collinearity' | 'type';
  risk?: string;
}

export interface MalformedRowDetail {
  row_number: number;
  expected_columns: number;
  actual_columns: number;
  raw_fields?: string[];
}

export interface CsvStructure {
  valid: boolean;
  expected_columns: number;
  malformed_rows: number;
  malformed_row_details: MalformedRowDetail[];
}

export interface ScoreBreakdown {
  missing_penalty: number;
  duplicate_penalty: number;
  empty_col_penalty: number;
  type_penalty: number;
  outlier_penalty: number;
}

export interface CollinearPair {
  col1: string;
  col2: string;
  correlation: number;
}

export interface DatasetAnalysis {
  rows: number;
  columns: ColumnDetail[];
  column_names: string[];
  missing_values: number;
  missing_pct: number;
  duplicate_rows: number;
  duplicate_pct: number;
  quality_score: number;
  score_breakdown: ScoreBreakdown;
  detected_issues: DetectedIssue[];
  preview_rows: Record<string, any>[];
  csv_structure?: CsvStructure;
  target_column?: string | null;
  target_candidates?: string[];
  collinear_pairs?: CollinearPair[];
}

export interface MissingActionConfig {
  action: 'drop_rows' | 'mean' | 'median' | 'mode' | 'custom';
  value?: string;
}

export interface FilterRule {
  id: string;
  column: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains';
  value: string;
}

export interface CleaningOperations {
  remove_duplicates: boolean;
  missing_actions: {
    global: 'none' | 'drop_rows';
    columns: Record<string, MissingActionConfig>;
  };
  type_conversions: Record<string, ColumnType>;
  drop_columns: string[];
  rename_columns: Record<string, string>;
  filter_rules: FilterRule[];
  outlier_actions: Record<string, 'keep' | 'remove' | 'clip'>;
  target_column?: string | null;
}

export interface DiffSample {
  row_index: number;
  column: string;
  original: string;
  new: string;
  action: string;
}

export interface OperationAuditDetail {
  category: 'integrity' | 'deterministic' | 'missing' | 'duplicates' | 'outliers' | 'types' | 'columns' | 'filters' | 'user_selected';
  column?: string;
  detection: string;
  why_detected: string;
  rationale: string;
  risk: string;
  confidence: 'informational' | 'review' | 'actionable';
  user_action: string;
}

export interface TransformPreviewResult {
  status: string;
  original_rows: number;
  new_rows: number;
  rows_removed: number;
  original_columns: number;
  new_columns: number;
  columns_removed: number;
  new_headers: string[];
  new_quality_score: number;
  new_analysis: DatasetAnalysis;
  applied_operations: string[];
  operation_details?: OperationAuditDetail[];
  warnings: string[];
  diff_samples: DiffSample[];
  preview_rows: Record<string, any>[];
  python_code: string;
}

export interface ActiveDataset {
  id: string;
  name: string;
  filename: string;
  rawCsv: string;
  fileSizeBytes: number;
  uploadedAt: string;
  analysis: DatasetAnalysis;
  currentTransform?: TransformPreviewResult;
  cleanedCsv?: string;
  operations?: CleaningOperations;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  datasetCount: number;
  updatedAt: string;
}
