import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Trash2,
  ArrowRight,
  TrendingUp,
  Layers,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { ActiveDataset, CleaningOperations } from '../types/dataset';
import { useI18n } from '../i18n/context';

interface PendingChangesSummaryProps {
  dataset: ActiveDataset;
  operations: CleaningOperations;
  onProceedToReview?: () => void;
  onClearOperations?: () => void;
  isGenerating?: boolean;
}

export const PendingChangesSummary: React.FC<PendingChangesSummaryProps> = ({
  dataset,
  operations,
  onProceedToReview,
  onClearOperations,
  isGenerating = false,
}) => {
  const { t, isRTL } = useI18n();
  const { analysis } = dataset;

  const pendingList: { labelEn: string; labelFa: string; type: string }[] = [];

  if (operations.remove_duplicates) {
    pendingList.push({
      labelEn: `Remove ${analysis.duplicate_rows} duplicate rows`,
      labelFa: `حذف ${analysis.duplicate_rows} ردیف کاملاً تکراری`,
      type: 'duplicates',
    });
  }

  if (operations.missing_actions.global === 'drop_rows') {
    pendingList.push({
      labelEn: 'Drop any row containing missing/null values',
      labelFa: 'حذف تمامی سطرهای دارای حداقل یک مقدار خالی',
      type: 'missing',
    });
  } else {
    Object.entries(operations.missing_actions.columns).forEach(([col, cfg]) => {
      const actName =
        cfg.action === 'mean'
          ? 'mean'
          : cfg.action === 'median'
          ? 'median'
          : cfg.action === 'mode'
          ? 'mode'
          : cfg.action === 'custom'
          ? `custom "${cfg.value}"`
          : 'drop rows';

      const actNameFa =
        cfg.action === 'mean'
          ? 'میانگین'
          : cfg.action === 'median'
          ? 'میانه'
          : cfg.action === 'mode'
          ? 'مد (بیشترین تکرار)'
          : cfg.action === 'custom'
          ? `مقدار "${cfg.value}"`
          : 'حذف سطرها';

      pendingList.push({
        labelEn: `Impute '${col}' missing cells with ${actName}`,
        labelFa: `جایگزینی مقادیر خالی در ستون '${col}' با ${actNameFa}`,
        type: 'missing',
      });
    });
  }

  operations.drop_columns.forEach((col) => {
    pendingList.push({
      labelEn: `Drop column '${col}'`,
      labelFa: `حذف کامل ستون '${col}'`,
      type: 'columns',
    });
  });

  Object.entries(operations.outlier_actions).forEach(([col, act]) => {
    if (act !== 'keep') {
      pendingList.push({
        labelEn: act === 'clip' ? `Clip outliers in '${col}' to Tukey IQR bounds` : `Drop outlier rows in '${col}'`,
        labelFa: act === 'clip' ? `محدودسازی داده‌های پرت در '${col}' به مرزهای IQR` : `حذف سطرهای دارای داده پرت در '${col}'`,
        type: 'outliers',
      });
    }
  });

  Object.entries(operations.type_conversions).forEach(([col, newType]) => {
    pendingList.push({
      labelEn: `Cast column '${col}' to ${newType}`,
      labelFa: `تبدیل نوع ستون '${col}' به ${newType}`,
      type: 'types',
    });
  });

  operations.filter_rules.forEach((rule) => {
    pendingList.push({
      labelEn: `Filter rows: ${rule.column} ${rule.operator} ${rule.value}`,
      labelFa: `فیلتر سطرها: ${rule.column} ${rule.operator} ${rule.value}`,
      type: 'filter',
    });
  });

  const totalPending = pendingList.length;

  // Approximate score recovery
  const estimatedNewScore = Math.min(
    100,
    analysis.quality_score +
      (operations.remove_duplicates ? analysis.score_breakdown.duplicate_penalty : 0) +
      (Object.keys(operations.missing_actions.columns).length > 0
        ? analysis.score_breakdown.missing_penalty
        : 0) +
      (operations.drop_columns.length > 0 ? analysis.score_breakdown.empty_col_penalty : 0) +
      (Object.values(operations.outlier_actions).some((a) => a !== 'keep')
        ? analysis.score_breakdown.outlier_penalty
        : 0)
  );

  const scoreDelta = estimatedNewScore - analysis.quality_score;

  return (
    <div className="rounded-xl border border-blue-900/60 bg-blue-950/20 p-5 space-y-4">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              {t('pendingChangesTitle')}
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                {totalPending}
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              {isRTL
                ? `تعداد ${totalPending} عملیات پاک‌سازی برای این دیتاست در صف قرار دارد.`
                : `${totalPending} operation(s) scheduled to be applied.`}
            </p>
          </div>
        </div>

        {scoreDelta > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono bg-emerald-950/70 border border-emerald-800/60 rounded-md px-3 py-1.5 self-start sm:self-auto">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-neutral-300">
              {isRTL ? 'امتیاز تخمینی بعد از اعمال:' : 'Projected Quality:'}
            </span>
            <span className="font-bold text-emerald-400">{estimatedNewScore}%</span>
            <span className="text-emerald-400 font-semibold text-[11px]">(+{scoreDelta}%)</span>
          </div>
        )}
      </div>

      {/* List of Pending Operations */}
      {totalPending > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          {pendingList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-md bg-neutral-900/80 border border-neutral-800 text-neutral-200"
            >
              <span className="text-blue-400 font-bold shrink-0">[{idx + 1}]</span>
              <span className="font-sans text-xs leading-relaxed">
                {isRTL ? item.labelFa : item.labelEn}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-neutral-400 p-3 rounded bg-neutral-900/50 border border-neutral-800/80 text-center">
          {isRTL
            ? 'هیچ عملیات پاک‌سازی هنوز انتخاب نشده است. از گزینه‌های بالا یک راهبرد انتخاب کنید یا از توصیه‌های خودکار استفاده نمایید.'
            : 'No cleaning transformations configured yet. Select operations above or apply the automatic recommendations.'}
        </div>
      )}

      {/* Action Buttons */}
      {totalPending > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {onClearOperations && (
            <button
              onClick={onClearOperations}
              className="text-xs text-neutral-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>{isRTL ? 'پاک کردن تمام تغییرات' : 'Reset Operations'}</span>
            </button>
          )}

          {onProceedToReview && (
            <button
              disabled={isGenerating}
              onClick={onProceedToReview}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer ms-auto"
            >
              {isGenerating ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{t('previewDiffBtn')}</span>
              <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
