import { ActiveDataset, CleaningOperations, DatasetAnalysis } from '../types/dataset';

export interface ActionableRecommendation {
  id: string;
  category: 'duplicates' | 'missing' | 'outliers' | 'empty_col' | 'types';
  titleEn: string;
  titleFa: string;
  whyEn: string;
  whyFa: string;
  column?: string;
  impactScoreRecovery: number;
  isApplied: (ops: CleaningOperations) => boolean;
  apply: (prev: CleaningOperations) => CleaningOperations;
}

export const getActionableRecommendations = (
  analysis: DatasetAnalysis
): ActionableRecommendation[] => {
  const recommendations: ActionableRecommendation[] = [];

  // 1. Duplicate Rows Recommendation
  if (analysis.duplicate_rows > 0) {
    recommendations.push({
      id: 'rec-duplicates',
      category: 'duplicates',
      titleEn: `Remove ${analysis.duplicate_rows.toLocaleString()} exact duplicate rows`,
      titleFa: `حذف ${analysis.duplicate_rows.toLocaleString()} سطر کاملاً تکراری`,
      whyEn: `Identical records in tabular data cause train-test data leakage, leading to artificially inflated cross-validation scores and poor generalization.`,
      whyFa: `سطرهای تکراری باعث نشت داده میان بخش‌های آموزش و آزمون شده و ارزیابی کاذب از دقت مدل ارائه می‌دهند.`,
      impactScoreRecovery: analysis.score_breakdown.duplicate_penalty || 15,
      isApplied: (ops) => ops.remove_duplicates === true,
      apply: (prev) => ({
        ...prev,
        remove_duplicates: true,
      }),
    });
  }

  // 2. Empty Columns Recommendation
  analysis.columns.forEach((col) => {
    if (col.is_empty) {
      recommendations.push({
        id: `rec-empty-${col.name}`,
        category: 'empty_col',
        column: col.name,
        titleEn: `Drop 100% empty feature '${col.name}'`,
        titleFa: `حذف ستون کاملاً خالی '${col.name}'`,
        whyEn: `Contains zero observations. Features with zero variance convey zero predictive signal to estimators.`,
        whyFa: `این ستون فاقد هرگونه مقدار است و هیچ سیگنال پیش‌بینانه‌ای برای مدل ایجاد نمی‌کند.`,
        impactScoreRecovery: 5,
        isApplied: (ops) => ops.drop_columns.includes(col.name),
        apply: (prev) => ({
          ...prev,
          drop_columns: Array.from(new Set([...prev.drop_columns, col.name])),
        }),
      });
    }
  });

  // 3. Missing Value Imputation Recommendations
  analysis.columns.forEach((col) => {
    if (col.missing_count > 0 && !col.is_empty) {
      const isNumeric = col.type === 'integer' || col.type === 'float';
      const hasOutliers = (col.stats?.outlier_count || 0) > 0;

      if (isNumeric) {
        const valStr = col.stats?.median !== undefined ? String(col.stats.median) : 'median';
        recommendations.push({
          id: `rec-missing-${col.name}`,
          category: 'missing',
          column: col.name,
          titleEn: `Impute missing cells in '${col.name}' with Median (${valStr})`,
          titleFa: `جایگزینی مقادیر خالی در '${col.name}' با میانه (${valStr})`,
          whyEn: hasOutliers
            ? `Column distribution contains ${col.stats?.outlier_count} outliers. Median imputation is robust to extreme skew, unlike the arithmetic mean.`
            : `Numerical feature with missing values. Median imputation preserves the central tendency without distorting variance.`,
          whyFa: hasOutliers
            ? `این ستون حاوی ${col.stats?.outlier_count} داده پرت است؛ میانه برخلاف میانگین تحت تأثیر داده‌های حدی قرار نمی‌گیرد.`
            : `متغیر عددی با داده‌های گمشده؛ میانه گرایش مرکزی توزیع را بدون ایجاد اریب حفظ می‌کند.`,
          impactScoreRecovery: Math.min(15, Math.ceil(col.missing_pct * 0.5) + 3),
          isApplied: (ops) => ops.missing_actions.columns[col.name]?.action === 'median',
          apply: (prev) => ({
            ...prev,
            missing_actions: {
              ...prev.missing_actions,
              columns: {
                ...prev.missing_actions.columns,
                [col.name]: { action: 'median' },
              },
            },
          }),
        });
      } else {
        const modeStr = col.mode ? `"${col.mode}"` : 'most frequent';
        recommendations.push({
          id: `rec-missing-${col.name}`,
          category: 'missing',
          column: col.name,
          titleEn: `Impute categorical '${col.name}' with Mode (${modeStr})`,
          titleFa: `جایگزینی مقادیر خالی در '${col.name}' با مد (${modeStr})`,
          whyEn: `Categorical feature; mode imputation retains natural class frequencies without introducing invalid synthetic categories.`,
          whyFa: `متغیر طبقه‌ای؛ جایگزینی با مد باعث حفظ توزیع طبیعی دسته‌ها بدون افزودن کلاس‌های ساختگی می‌شود.`,
          impactScoreRecovery: Math.min(10, Math.ceil(col.missing_pct * 0.4) + 2),
          isApplied: (ops) => ops.missing_actions.columns[col.name]?.action === 'mode',
          apply: (prev) => ({
            ...prev,
            missing_actions: {
              ...prev.missing_actions,
              columns: {
                ...prev.missing_actions.columns,
                [col.name]: { action: 'mode' },
              },
            },
          }),
        });
      }
    }
  });

  // 4. Outlier Capping Recommendations
  analysis.columns.forEach((col) => {
    if (col.stats && col.stats.outlier_count > 0 && !col.is_empty) {
      recommendations.push({
        id: `rec-outlier-${col.name}`,
        category: 'outliers',
        column: col.name,
        titleEn: `Clip ${col.stats.outlier_count} outliers in '${col.name}' to Tukey IQR bounds [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
        titleFa: `محدودسازی ${col.stats.outlier_count} داده پرت در '${col.name}' به بازه IQR [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
        whyEn: `Capping extreme leverage points prevents high-loss gradients from destabilizing Linear Regression, SVMs, and Neural Networks while retaining the row data.`,
        whyFa: `محدودسازی مقادیر فرین مانع از ناپایداری گرادیان در رگرسیون خطی و شبکه‌های عصبی می‌شود در حالی که سطرها حفظ می‌شوند.`,
        impactScoreRecovery: analysis.score_breakdown.outlier_penalty || 5,
        isApplied: (ops) => ops.outlier_actions[col.name] === 'clip',
        apply: (prev) => ({
          ...prev,
          outlier_actions: {
            ...prev.outlier_actions,
            [col.name]: 'clip',
          },
        }),
      });
    }
  });

  return recommendations;
};

export const applyAllRecommendations = (
  currentOps: CleaningOperations,
  analysis: DatasetAnalysis
): CleaningOperations => {
  const recommendations = getActionableRecommendations(analysis);
  let updated = { ...currentOps };
  recommendations.forEach((rec) => {
    updated = rec.apply(updated);
  });
  return updated;
};

export const getDefaultOperations = (analysis: DatasetAnalysis): CleaningOperations => {
  const initialMissingCols: Record<string, any> = {};
  const initialOutlierActions: Record<string, 'keep' | 'remove' | 'clip'> = {};
  const initialDropCols: string[] = [];

  analysis.columns.forEach((col) => {
    if (col.is_empty) {
      initialDropCols.push(col.name);
    } else if (col.missing_count > 0) {
      if (col.type === 'integer' || col.type === 'float') {
        initialMissingCols[col.name] = { action: 'median' };
      } else {
        initialMissingCols[col.name] = { action: 'mode' };
      }
    }

    if (col.stats && col.stats.outlier_count > 0) {
      initialOutlierActions[col.name] = 'clip';
    }
  });

  return {
    remove_duplicates: analysis.duplicate_rows > 0,
    missing_actions: {
      global: 'none',
      columns: initialMissingCols,
    },
    type_conversions: {},
    drop_columns: initialDropCols,
    rename_columns: {},
    filter_rules: [],
    outlier_actions: initialOutlierActions,
  };
};
