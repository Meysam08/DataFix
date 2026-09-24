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
}

export interface DetectedIssue {
  severity: 'high' | 'medium' | 'low';
  title: string;
  column?: string;
  description: string;
  recommendation: string;
}

export interface ScoreBreakdown {
  missing_penalty: number;
  duplicate_penalty: number;
  empty_col_penalty: number;
  type_penalty: number;
  outlier_penalty: number;
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
}

export interface DiffSample {
  row_index: number;
  column: string;
  original: string;
  new: string;
  action: string;
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
