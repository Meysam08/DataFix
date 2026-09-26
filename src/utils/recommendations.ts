import { ActiveDataset, CleaningOperations, DatasetAnalysis } from '../types/dataset';

export interface ActionableRecommendation {
  id: string;
  category: 'duplicates' | 'missing' | 'outliers' | 'empty_col' | 'types' | 'collinearity';
  confidence: 'informational' | 'review' | 'actionable';
  titleEn: string;
  titleFa: string;
  whyEn: string;
  whyFa: string;
  column?: string;
  impactScoreRecovery: number;
  detectionEn: string;
  detectionFa: string;
  whyDetectedEn: string;
  whyDetectedFa: string;
  riskEn: string;
  riskFa: string;
  suggestedActionEn: string;
  suggestedActionFa: string;
  isApplied: (ops: CleaningOperations) => boolean;
  apply: (prev: CleaningOperations) => CleaningOperations;
}

export const getActionableRecommendations = (
  analysis: DatasetAnalysis
): ActionableRecommendation[] => {
  const recommendations: ActionableRecommendation[] = [];
  const targetCols = new Set(analysis.target_candidates || []);
  if (analysis.target_column) targetCols.add(analysis.target_column);

  // 1. Duplicate Rows Recommendation
  if (analysis.duplicate_rows > 0) {
    recommendations.push({
      id: 'rec-duplicates',
      category: 'duplicates',
      confidence: 'actionable',
      titleEn: `Review & resolve ${analysis.duplicate_rows.toLocaleString()} exact duplicate rows`,
      titleFa: `بررسی و مدیریت ${analysis.duplicate_rows.toLocaleString()} سطر کاملاً تکراری`,
      detectionEn: `${analysis.duplicate_rows.toLocaleString()} exact duplicate rows detected (${analysis.duplicate_pct}% of dataset)`,
      detectionFa: `${analysis.duplicate_rows.toLocaleString()} سطر کاملاً تکراری شناسایی شد (${analysis.duplicate_pct}٪ از کل دیتاست)`,
      whyDetectedEn: `Exact duplicate rows share identical values across all features.`,
      whyDetectedFa: `این سطرها دارای مقادیر کاملاً یکسان در تمامی ستون‌های دیتاست هستند.`,
      whyEn: `Duplicate removal is often appropriate for ML datasets to prevent train-test data leakage and artificially optimistic evaluation. However, confirm that duplicate observations do not represent legitimate repeated records.`,
      whyFa: `حذف سطرهای تکراری در یادگیری ماشین برای جلوگیری از نشت داده میان آموزش و آزمون ضروری است؛ با این حال بررسی کنید که آیا این رکوردها نماینده رویدادهای مستقل واقعی هستند یا خیر.`,
      riskEn: `If identical records represent distinct real-world events (e.g. repeated daily transactions), removing them alters the empirical sample frequency.`,
      riskFa: `چنانچه رکوردهای مشابه مربوط به رویدادهای واقعی مجزا باشند، حذف آنها وزن تجربی مشاهدات را تغییر می‌دهد.`,
      suggestedActionEn: `Remove duplicate rows for model training after confirming they represent redundant entries.`,
      suggestedActionFa: `پس از اطمینان از افزونگی ثبت داده، سطرهای تکراری را برای آموزش مدل حذف نمایید.`,
      impactScoreRecovery: analysis.score_breakdown.duplicate_penalty || 15,
      isApplied: (ops) => ops.remove_duplicates === true,
      apply: (prev) => ({
        ...prev,
        remove_duplicates: true,
      }),
    });
  }

  // 2. Collinear / Redundant Measurement Pairs Recommendation
  if (analysis.collinear_pairs && analysis.collinear_pairs.length > 0) {
    analysis.collinear_pairs.forEach((pair, pIdx) => {
      recommendations.push({
        id: `rec-collinear-${pIdx}`,
        category: 'collinearity',
        confidence: 'informational',
        column: `${pair.col1}, ${pair.col2}`,
        titleEn: `Redundant measurement: '${pair.col1}' & '${pair.col2}' (r = ${pair.correlation.toFixed(2)})`,
        titleFa: `اندازه‌گیری همبسته و تکراری: '${pair.col1}' و '${pair.col2}' (r = ${pair.correlation.toFixed(2)})`,
        detectionEn: `Near-perfect correlation (r = ${pair.correlation.toFixed(2)}) between '${pair.col1}' and '${pair.col2}'`,
        detectionFa: `همبستگی خطی بسیار شدید (r = ${pair.correlation.toFixed(2)}) میان '${pair.col1}' و '${pair.col2}'`,
        whyDetectedEn: `Calculated Pearson correlation coefficient is ${pair.correlation.toFixed(4)}.`,
        whyDetectedFa: `ضریب همبستگی پیرسون محاسبه‌شده برابر ${pair.correlation.toFixed(4)} است.`,
        whyEn: `These columns may represent the same underlying measurement in different units or scales. Consider selecting one as the modeling target rather than treating both as independent targets.`,
        whyFa: `این ستون‌ها ممکن است اندازه‌گیری یک پدیده یکسان در واحدها یا مقیاس‌های متفاوت باشند. پیشنهاد می‌شود یکی از آنها را به عنوان هدف مدل‌سازی انتخاب کرده و هر دو را همزمان متغیر مستقل قرار ندهید.`,
        riskEn: `Retaining collinear duplicates creates severe multicollinearity, causing unstable regression weights and inflated standard errors.`,
        riskFa: `نگه داشتن هر دو ستون باعث هم‌خطی شدید، تورم واریانس و ناپایداری ضرایب مدل‌های خطی می‌شود.`,
        suggestedActionEn: `Choose one column as the primary target/feature, and drop or ignore the redundant scale.`,
        suggestedActionFa: `یکی از دو ستون را به عنوان متغیر هدف یا ویژگی اصلی برگزیده و ستون دیگر را نادیده بگیرید.`,
        impactScoreRecovery: 0,
        isApplied: (ops) => ops.drop_columns.includes(pair.col1) || ops.drop_columns.includes(pair.col2),
        apply: (prev) => prev,
      });
    });
  }

  // 3. Empty Columns Recommendation
  analysis.columns.forEach((col) => {
    if (col.is_empty) {
      recommendations.push({
        id: `rec-empty-${col.name}`,
        category: 'empty_col',
        confidence: 'actionable',
        column: col.name,
        titleEn: `Drop 100% empty feature '${col.name}'`,
        titleFa: `حذف ستون کاملاً خالی '${col.name}'`,
        detectionEn: `Feature '${col.name}' contains zero observations (100% missing).`,
        detectionFa: `ستون '${col.name}' فاقد هرگونه داده است (۱۰۰٪ خالی).`,
        whyDetectedEn: `All cells in this column evaluated to empty strings or missing sentinels.`,
        whyDetectedFa: `تمام خانه‌های این ستون مقدار خالی یا نامشخص دارند.`,
        whyEn: `Contains zero observations. Features with zero variance convey zero predictive signal to estimators.`,
        whyFa: `این ستون فاقد هرگونه مقدار است و هیچ سیگنال پیش‌بینانه‌ای برای مدل ایجاد نمی‌کند.`,
        riskEn: `Zero risk; unpopulated features add dimensionality without variance.`,
        riskFa: `حذف ستون خالی بدون ریسک است؛ ویژگی بدون واریانس هیچ اطلاعاتی تولید نمی‌کند.`,
        suggestedActionEn: `Drop feature column from dataset.`,
        suggestedActionFa: `ستون خالی را از مجموعه ویژگی‌ها حذف نمایید.`,
        impactScoreRecovery: 5,
        isApplied: (ops) => ops.drop_columns.includes(col.name),
        apply: (prev) => ({
          ...prev,
          drop_columns: Array.from(new Set([...prev.drop_columns, col.name])),
        }),
      });
    }
  });

  // 4. Missing Value Recommendations
  analysis.columns.forEach((col) => {
    if (col.missing_count > 0 && !col.is_empty) {
      const isNumeric = col.type === 'integer' || col.type === 'float';

      if (isNumeric) {
        const valStr = col.stats?.median !== undefined ? String(col.stats.median) : 'median';
        recommendations.push({
          id: `rec-missing-${col.name}`,
          category: 'missing',
          confidence: 'actionable',
          column: col.name,
          titleEn: `Remediate missing cells in '${col.name}' (${col.missing_count} cells)`,
          titleFa: `ترمیم خانه‌های خالی در '${col.name}' (${col.missing_count} خانه)`,
          detectionEn: `${col.missing_count} missing cells (${col.missing_pct}%) in numerical feature '${col.name}'`,
          detectionFa: `${col.missing_count} سلول خالی (${col.missing_pct}٪) در ویژگی عددی '${col.name}'`,
          whyDetectedEn: `Cells contain empty strings, NaN, or sentinel missing values.`,
          whyDetectedFa: `خانه‌های این ستون حاوی مقادیر خالی یا نال هستند.`,
          whyEn: `Median imputation (${valStr}) is one possible strategy that preserves sample size without being distorted by extreme values. However, row removal may be preferable if the feature is critical for modeling and synthetic values are unacceptable.`,
          whyFa: `جایگزینی با میانه (${valStr}) یکی از راهکارهای ممکن است که اندازه نمونه را حفظ می‌کند. با این حال در صورتی که این ویژگی برای تحلیل حیاتی باشد، حذف سطرها ممکن است راهبرد دقیق‌تری باشد.`,
          riskEn: `Median imputation compresses variance and alters correlation structures; row removal discards observations.`,
          riskFa: `پر کردن با میانه باعث فشردگی واریانس می‌شود؛ حذف سطرها حجم مشاهدات را کم می‌کند.`,
          suggestedActionEn: `Impute with median or drop missing rows according to modeling requirements.`,
          suggestedActionFa: `بر اساس نیاز مدل‌سازی، جایگزینی با میانه یا حذف سطرهای فاقد مقدار را انتخاب کنید.`,
          impactScoreRecovery: Math.min(15, Math.ceil(col.missing_pct * 0.5) + 3),
          isApplied: (ops) =>
            ops.missing_actions.columns[col.name]?.action === 'median' ||
            ops.missing_actions.columns[col.name]?.action === 'drop_rows',
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
          confidence: 'actionable',
          column: col.name,
          titleEn: `Remediate missing cells in '${col.name}' (${col.missing_count} cells)`,
          titleFa: `ترمیم خانه‌های خالی در '${col.name}' (${col.missing_count} خانه)`,
          detectionEn: `${col.missing_count} missing cells (${col.missing_pct}%) in categorical feature '${col.name}'`,
          detectionFa: `${col.missing_count} سلول خالی (${col.missing_pct}٪) در ویژگی طبقه‌ای '${col.name}'`,
          whyDetectedEn: `Cells contain empty strings or missing category sentinels.`,
          whyDetectedFa: `خانه‌های این ستون فاقد برچسب متنی هستند.`,
          whyEn: `Missing values detected in '${col.name}'. Mode imputation (${modeStr}) is one possible strategy for categorical data, but row removal may be preferable when the missing value makes the record unsuitable for the intended analysis.`,
          whyFa: `مقادیر گمشده در '${col.name}' شناسایی شد. جایگزینی با مد (${modeStr}) یکی از راهکارهای ممکن است، اما در صورتی که نبود این مقدار رکورد را برای تحلیل نامناسب سازد، حذف سطرها گزینه‌ای ارجح است.`,
          riskEn: `Mode imputation artificially overweights the dominant class; dropping rows reduces sample size.`,
          riskFa: `جایگزینی با مد به طور ساختگی وزن طبقه غالب را بالا می‌برد؛ حذف سطرها حجم کل دیتاست را کاهش می‌دهد.`,
          suggestedActionEn: `Choose mode imputation or drop rows depending on whether records without '${col.name}' are usable.`,
          suggestedActionFa: `بسته به اینکه رکوردهای فاقد '${col.name}' قابل استفاده هستند یا خیر، جایگزینی با مد یا حذف سطر را انتخاب نمایید.`,
          impactScoreRecovery: Math.min(10, Math.ceil(col.missing_pct * 0.4) + 2),
          isApplied: (ops) =>
            ops.missing_actions.columns[col.name]?.action === 'mode' ||
            ops.missing_actions.columns[col.name]?.action === 'drop_rows',
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

  // 5. Outlier Recommendations
  analysis.columns.forEach((col) => {
    if (col.stats && col.stats.outlier_count > 0 && !col.is_empty) {
      const isTarget = targetCols.has(col.name) || col.is_target_candidate;
      const isDegenerate = col.stats.iqr === 0 || col.stats.iqr_is_zero;

      if (isDegenerate) {
        // CASE A: Degenerate IQR / Concentrated Distribution
        recommendations.push({
          id: `rec-outlier-${col.name}`,
          category: 'outliers',
          confidence: 'review',
          column: col.name,
          titleEn: `Degenerate IQR / concentrated distribution in '${col.name}'`,
          titleFa: `توزیع متمرکز / دامنه میان‌چارکی صفر در '${col.name}'`,
          detectionEn: `${col.stats.outlier_count.toLocaleString()} values differ from the IQR boundary [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
          detectionFa: `${col.stats.outlier_count.toLocaleString()} مقدار با مرزهای IQR متفاوت هستند [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
          whyDetectedEn: `Q1 = ${col.stats.q1}, Median = ${col.stats.median}, Q3 = ${col.stats.q3}, therefore IQR = 0. The central 50% of data is concentrated at exactly ${col.stats.median}.`,
          whyDetectedFa: `چارک اول (${col.stats.q1})، میانه (${col.stats.median}) و چارک سوم (${col.stats.q3}) همگی برابرند، بنابراین دامنه میان‌چارکی (IQR) صفر است. ۵۰٪ مرکزی داده‌ها در مقدار ${col.stats.median} متمرکز شده است.`,
          whyEn: `${col.stats.outlier_count.toLocaleString()} values differ from the IQR boundary because Q1, median, and Q3 are all ${col.stats.median}. This does not establish that these values are invalid. The IQR method cannot reliably distinguish statistical outliers because the central distribution has zero spread. Inspect the distribution before modifying them.`,
          whyFa: `${col.stats.outlier_count.toLocaleString()} مقدار با مرز IQR متفاوتند زیرا چارک اول، میانه و چارک سوم همگی ${col.stats.median} هستند. این موضوع دلیلی بر نامعتبر بودن این مقادیر نیست. روش IQR به دلیل تمرکز توزیع مرکزی قادر به تفکیک مطمئن داده‌های پرت نیست. قبل از تغییر مقادیر، توزیع را بررسی کنید.`,
          riskEn: `Clipping these values to ${col.stats.median} could destroy legitimate ${col.name} information.`,
          riskFa: `محدودسازی خودکار این مقادیر به ${col.stats.median} ممکن است اطلاعات معتبر و تنوع طبیعی ویژگی '${col.name}' را نابود کند.`,
          suggestedActionEn: `Do not clip. Retain original values unless domain rules establish specific entries are errors.`,
          suggestedActionFa: `از محدودسازی خودکار پرهیز کنید؛ مقادیر اصلی را حفظ نمایید مگر آنکه مستندات داده خطای خاصی را مشخص کرده باشد.`,
          impactScoreRecovery: 0,
          isApplied: (ops) => ops.outlier_actions[col.name] !== 'clip' && ops.outlier_actions[col.name] !== 'remove',
          apply: (prev) => ({
            ...prev,
            outlier_actions: {
              ...prev.outlier_actions,
              [col.name]: 'keep',
            },
          }),
        });
      } else if (isTarget) {
        // CASE B: Target Candidate
        recommendations.push({
          id: `rec-outlier-${col.name}`,
          category: 'outliers',
          confidence: 'review',
          column: col.name,
          titleEn: `Target candidate outlier review: '${col.name}' (${col.stats.outlier_count} values)`,
          titleFa: `بررسی داده‌های پرت متغیر هدف: '${col.name}' (${col.stats.outlier_count} مورد)`,
          detectionEn: `${col.stats.outlier_count.toLocaleString()} values outside 1.5× IQR boundary [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
          detectionFa: `${col.stats.outlier_count.toLocaleString()} مقدار خارج از مرزهای ۱.۵×IQR [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
          whyDetectedEn: `Extreme observations detected in prediction target candidate '${col.name}'.`,
          whyDetectedFa: `مشاهدات حدی در ستون کاندیدای متغیر هدف '${col.name}' کشف شد.`,
          whyEn: `'${col.name}' is identified as a prediction target candidate. Extreme target values may be legitimate observations and should generally be investigated before being clipped or removed.`,
          whyFa: `'${col.name}' به عنوان متغیر هدف پیش‌بینی شناسایی شده است. مقادیر فرین هدف ممکن است مشاهدات کاملاً واقعی و معتبر باشند و عموماً باید قبل از هرگونه فشرده‌سازی یا حذف، مورد بررسی قرار گیرند.`,
          riskEn: `Clipping the prediction target truncates the dependent variable distribution, leading to systematic underprediction of extreme outcomes.`,
          riskFa: `محدودسازی متغیر هدف باعث تحریف واریانس متغیر وابسته شده و اریب سیستماتیک در پیش‌بینی مدل ایجاد می‌کند.`,
          suggestedActionEn: `Investigate distribution; consider log-transformation or robust loss functions (Huber/MAE) rather than clipping target values.`,
          suggestedActionFa: `توزیع را بررسی کنید؛ به جای برش متغیر هدف، از تبدیلات لگاریتمی یا توابع خطای مقاوم (Huber/MAE) استفاده نمایید.`,
          impactScoreRecovery: 0,
          isApplied: (ops) => ops.outlier_actions[col.name] !== 'clip' && ops.outlier_actions[col.name] !== 'remove',
          apply: (prev) => ({
            ...prev,
            outlier_actions: {
              ...prev.outlier_actions,
              [col.name]: 'keep',
            },
          }),
        });
      } else {
        // CASE C: Feature Outliers
        const isSevereLeverage =
          col.stats.max > col.stats.upper_bound * 5 ||
          (col.stats.lower_bound < 0 && col.stats.min < col.stats.lower_bound * 5);

        if (isSevereLeverage) {
          recommendations.push({
            id: `rec-outlier-${col.name}`,
            category: 'outliers',
            confidence: 'actionable',
            column: col.name,
            titleEn: `Severe leverage / extreme outliers in '${col.name}' (${col.stats.outlier_count} values)`,
            titleFa: `داده‌های پرت شدید و اهرمی در '${col.name}' (${col.stats.outlier_count} مورد)`,
            detectionEn: `${col.stats.outlier_count.toLocaleString()} values outside boundary [${col.stats.lower_bound}, ${col.stats.upper_bound}], with maximum reaching ${col.stats.max}`,
            detectionFa: `${col.stats.outlier_count.toLocaleString()} مقدار خارج از بازه [${col.stats.lower_bound}, ${col.stats.upper_bound}] با بیشینه ${col.stats.max}`,
            whyDetectedEn: `Observed maximum (${col.stats.max}) dramatically exceeds upper IQR boundary (${col.stats.upper_bound}), suggesting high-leverage anomalies or entry typos.`,
            whyDetectedFa: `بیشینه مقدار (${col.stats.max}) به طور چشمگیری از مرز IQR (${col.stats.upper_bound}) بزرگتر است که حاکی از خطای ورود اطلاعات یا نقاط اهرمی شدید است.`,
            whyEn: `Capping severe leverage anomalies prevents catastrophic gradient destabilization in linear models and neural networks while retaining row observations.`,
            whyFa: `محدودسازی داده‌های اهرمی شدید مانع از ناپایداری ضرایب در رگرسیون خطی و شبکه‌های عصبی می‌شود در حالی که سطرها حفظ می‌شوند.`,
            riskEn: `If extreme values are legitimate properties, clipping erases true variance. If they are input typos, leaving them intact destabilizes models.`,
            riskFa: `چنانچه این مقادیر واقعی باشند، برش آنها باعث از دست رفتن اطلاعات می‌شود؛ اما اگر خطای تایپی باشند، مدل را بی‌ثبات می‌کنند.`,
            suggestedActionEn: `Clip or filter extreme anomalies if confirmed as unrealistic entry errors.`,
            suggestedActionFa: `در صورت اثبات غیرواقعی بودن مقادیر، آنها را محدود یا فیلتر نمایید.`,
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
        } else {
          recommendations.push({
            id: `rec-outlier-${col.name}`,
            category: 'outliers',
            confidence: 'review',
            column: col.name,
            titleEn: `Inspect ${col.stats.outlier_count} tail outliers in '${col.name}'`,
            titleFa: `بررسی ${col.stats.outlier_count} مقدار در دُم توزیع '${col.name}'`,
            detectionEn: `${col.stats.outlier_count.toLocaleString()} values outside standard 1.5× IQR [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
            detectionFa: `${col.stats.outlier_count.toLocaleString()} مقدار خارج از بازه ۱.۵×IQR [${col.stats.lower_bound}, ${col.stats.upper_bound}]`,
            whyDetectedEn: `Observed values lie in natural distribution tails beyond 1.5× IQR.`,
            whyDetectedFa: `مقادیر در دُم‌های طبیعی توزیع آماری فراتر از ۱.۵×IQR قرار دارند.`,
            whyEn: `Values represent distribution tails. Inspect the distribution before modifying them to determine whether they represent valid real-world variation.`,
            whyFa: `این مقادیر دُم توزیع هستند. قبل از تغییر، توزیع را بررسی کنید تا مشخص شود آیا تنوع معتبر دنیای واقعی هستند یا خیر.`,
            riskEn: `Clipping natural distribution tails artificially compresses variance and distorts empirical variance.`,
            riskFa: `محدودسازی دُم‌های طبیعی توزیع به طور ساختگی واریانس را کاهش داده و توزیع تجربی را دستکاری می‌کند.`,
            suggestedActionEn: `Review distribution; keep values unless domain limits are violated.`,
            suggestedActionFa: `توزیع را بررسی کنید؛ مقادیر را حفظ نمایید مگر آنکه با محدودیت‌های منطقی دامنه تضاد داشته باشند.`,
            impactScoreRecovery: 0,
            isApplied: (ops) => ops.outlier_actions[col.name] !== 'clip' && ops.outlier_actions[col.name] !== 'remove',
            apply: (prev) => ({
              ...prev,
              outlier_actions: {
                ...prev.outlier_actions,
                [col.name]: 'keep',
              },
            }),
          });
        }
      }
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
  // Only apply actionable recommendations, keeping reviews and informational as safe
  recommendations.forEach((rec) => {
    if (rec.confidence === 'actionable') {
      updated = rec.apply(updated);
    }
  });
  return updated;
};

export const getDefaultOperations = (analysis: DatasetAnalysis): CleaningOperations => {
  const initialMissingCols: Record<string, any> = {};
  const initialOutlierActions: Record<string, 'keep' | 'remove' | 'clip'> = {};
  const initialDropCols: string[] = [];

  const targetCols = new Set(analysis.target_candidates || []);
  if (analysis.target_column) targetCols.add(analysis.target_column);

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
      const isTarget = targetCols.has(col.name) || col.is_target_candidate;
      const isDegenerate = col.stats.iqr === 0 || col.stats.iqr_is_zero;

      if (isDegenerate || isTarget) {
        // DO NOT automatically clip zero-IQR columns or target candidates!
        initialOutlierActions[col.name] = 'keep';
      } else {
        const isSevereLeverage =
          col.stats.max > col.stats.upper_bound * 5 ||
          (col.stats.lower_bound < 0 && col.stats.min < col.stats.lower_bound * 5);
        if (isSevereLeverage) {
          initialOutlierActions[col.name] = 'clip';
        } else {
          initialOutlierActions[col.name] = 'keep';
        }
      }
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
    target_column: analysis.target_column || null,
  };
};
