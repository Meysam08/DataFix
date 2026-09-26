import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Wrench,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ActiveDataset, TransformPreviewResult, CleaningOperations } from '../types/dataset';
import { ScreenId } from './Navbar';
import { executeApplyTransform } from '../utils/engine';
import { useI18n } from '../i18n/context';

interface ReviewChangesViewProps {
  dataset: ActiveDataset;
  transformResult: TransformPreviewResult;
  operations: CleaningOperations;
  onNavigate: (screen: ScreenId) => void;
  onApplyComplete: (appliedData: {
    cleanedCsv: string;
    newAnalysis: any;
    appliedOperations: string[];
    pythonCode: string;
  }) => void;
}

export const ReviewChangesView: React.FC<ReviewChangesViewProps> = ({
  dataset,
  transformResult,
  operations,
  onNavigate,
  onApplyComplete,
}) => {
  const { t, isRTL } = useI18n();
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialScore = dataset.analysis.quality_score;
  const newScore = transformResult.new_quality_score;
  const scoreDelta = newScore - initialScore;

  const handleApply = async () => {
    setIsApplying(true);
    setErrorMsg(null);
    try {
      const res = await executeApplyTransform(dataset.rawCsv, operations, dataset.filename);
      onApplyComplete({
        cleanedCsv: res.cleaned_csv,
        newAnalysis: res.new_analysis,
        appliedOperations: res.applied_operations,
        pythonCode: res.python_code,
      });
      onNavigate('export');
    } catch (e: any) {
      setErrorMsg(
        isRTL
          ? 'اعمال تغییرات نهایی با خطا مواجه شد. لطفاً عملیات پیکربندی شده را بررسی کنید.'
          : (e.message || 'Failed to apply transformations.')
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span>{isRTL ? 'بررسی تغییرات' : 'Review'}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-200">{dataset.filename}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            {t('reviewTitle')}
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            {t('reviewSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('cleaning')}
            className="flex items-center gap-1.5 rounded-md bg-neutral-850 border border-neutral-750 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t('backToWorkspaceBtn')}</span>
          </button>

          <button
            disabled={isApplying}
            onClick={handleApply}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isApplying ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{t('confirmAndExportBtn')}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Before vs After Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Quality Score Comparison */}
        <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-900/70 space-y-2">
          <div className="text-xs font-mono text-neutral-400">{t('scoreImprovementMetric')}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-mono text-neutral-500 line-through tabular-nums">
              {initialScore}%
            </span>
            <span className="text-neutral-600 font-mono">→</span>
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums">
              {newScore}%
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40 tabular-nums">
              +{scoreDelta}%
            </span>
          </div>
          <div className="text-[11px] text-neutral-400">
            {transformResult.new_analysis?.missing_values === 0 && transformResult.new_analysis?.duplicate_rows === 0
              ? isRTL
                ? 'کسری امتیاز مربوط به مقادیر خالی و سطرهای تکراری برطرف شد'
                : 'Deductions for missing values and duplicates eliminated'
              : isRTL
              ? `ارزیابی با مدل هیوریستیک دیتافیکس (${transformResult.new_analysis?.missing_values || 0} خانه خالی، ${transformResult.new_analysis?.duplicate_rows || 0} سطر تکراری)`
              : `Evaluated via DataFix heuristic (${transformResult.new_analysis?.missing_values || 0} missing, ${transformResult.new_analysis?.duplicate_rows || 0} duplicates)`}
          </div>
        </div>

        {/* Rows Comparison */}
        <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-900/70 space-y-2">
          <div className="text-xs font-mono text-neutral-400">{t('rowsMetric')}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-mono text-neutral-500 tabular-nums">
              {transformResult.original_rows.toLocaleString()}
            </span>
            <span className="text-neutral-600 font-mono">→</span>
            <span className="text-3xl font-extrabold font-mono text-neutral-100 tabular-nums">
              {transformResult.new_rows.toLocaleString()}
            </span>
            {transformResult.rows_removed > 0 && (
              <span className="text-xs font-mono text-blue-400 tabular-nums">
                (-{transformResult.rows_removed} {isRTL ? 'سطر' : 'rows'})
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400">
            {transformResult.rows_removed > 0
              ? isRTL ? 'حذف سطرهای تکراری و رکوردهای فیلترشده' : 'Removed duplicates and filtered rows'
              : isRTL ? 'تمامی سطرهای اولیه حفظ شده‌اند' : 'All original rows preserved'}
          </div>
        </div>

        {/* Columns Comparison */}
        <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-900/70 space-y-2">
          <div className="text-xs font-mono text-neutral-400">{t('columnsMetric')}</div>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-mono text-neutral-500 tabular-nums">
              {transformResult.original_columns}
            </span>
            <span className="text-neutral-600 font-mono">→</span>
            <span className="text-3xl font-extrabold font-mono text-neutral-100 tabular-nums">
              {transformResult.new_columns}
            </span>
            {transformResult.columns_removed > 0 && (
              <span className="text-xs font-mono text-rose-400 tabular-nums">
                (-{transformResult.columns_removed} {isRTL ? 'ستون' : 'cols'})
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400">
            {transformResult.columns_removed > 0
              ? isRTL ? 'حذف ستون‌های خالی یا زائد' : 'Dropped redundant or empty columns'
              : isRTL ? 'تمامی ستون‌های دیتاست حفظ شده‌اند' : 'Feature columns preserved'}
          </div>
        </div>
      </div>

      {/* Applied Operations Audit List */}
      <div className="rounded-xl border border-neutral-850 bg-neutral-900/50 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{t('auditTrailTitle')} ({transformResult.applied_operations.length} {isRTL ? 'عملیات' : 'actions'})</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isRTL
                ? 'تفکیک شفاف میان خطاهای قطعی، مقادیر گم‌شده، داده‌های تکراری، ناهنجاری‌های آماری و تغییرات کاربر'
                : 'Clear distinction between deterministic fixes, missing values, duplicates, statistical anomalies, and user transformations.'}
            </p>
          </div>
        </div>

        {/* Quick summary tags */}
        {transformResult.applied_operations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {transformResult.applied_operations.map((op, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded border border-neutral-800 bg-neutral-950/40 text-neutral-300 flex items-start gap-2"
              >
                <span className="text-blue-400 font-bold shrink-0">[{idx + 1}]</span>
                <span className="font-sans leading-relaxed">{op}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-neutral-500 p-3 rounded bg-neutral-950/30 border border-neutral-850">
            {isRTL ? 'هیچ تغییری تنظیم نشده است؛ داده‌ها بدون تغییر صادر خواهند شد.' : 'No transformations configured. Raw dataset will remain as-is.'}
          </div>
        )}

        {/* Structured 5-part Transformation Cards (Requirement 9) */}
        {transformResult.operation_details && transformResult.operation_details.length > 0 && (
          <div className="mt-5 pt-4 border-t border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>{isRTL ? 'تحلیل تفصیلی تصمیمات، دلایل آماری و ارزیابی ریسک' : 'Transformation Rationales & Statistical Risk Assessment'}</span>
              </h3>
              <span className="text-[11px] font-mono text-neutral-500">
                {transformResult.operation_details.length} {isRTL ? 'مورد مستندسازی‌شده' : 'documented items'}
              </span>
            </div>

            <div className="space-y-3">
              {transformResult.operation_details.map((detail, idx) => {
                const categoryColor =
                  detail.category === 'integrity' || detail.category === 'deterministic'
                    ? 'border-purple-800/60 bg-purple-950/20 text-purple-300'
                    : detail.category === 'duplicates'
                    ? 'border-blue-800/60 bg-blue-950/20 text-blue-300'
                    : detail.category === 'missing'
                    ? 'border-amber-800/60 bg-amber-950/20 text-amber-300'
                    : detail.category === 'outliers'
                    ? 'border-rose-800/60 bg-rose-950/20 text-rose-300'
                    : 'border-cyan-800/60 bg-cyan-950/20 text-cyan-300';

                const categoryLabel =
                  detail.category === 'integrity' || detail.category === 'deterministic'
                    ? isRTL ? 'یکپارچگی ساختاری' : 'Deterministic Integrity'
                    : detail.category === 'duplicates'
                    ? isRTL ? 'مدیریت داده‌های تکراری' : 'Duplicate Records'
                    : detail.category === 'missing'
                    ? isRTL ? 'ترمیم مقادیر گم‌شده' : 'Missing Values'
                    : detail.category === 'outliers'
                    ? isRTL ? 'تحلیل ناهنجاری آماری' : 'Statistical Anomalies'
                    : isRTL ? 'تغییرات منتخب کاربر' : 'User-Selected Transformation';

                const confidenceBadge =
                  detail.confidence === 'actionable' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                      {isRTL ? 'اقدام‌پذیر' : 'Actionable'}
                    </span>
                  ) : detail.confidence === 'review' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50">
                      {isRTL ? 'نیازمند بررسی' : 'Review'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/50">
                      {isRTL ? 'اطلاعاتی' : 'Informational'}
                    </span>
                  );

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-neutral-800 bg-neutral-950/60 space-y-3"
                  >
                    {/* Header: Category & Feature */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-850 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryColor}`}>
                          {categoryLabel}
                        </span>
                        {detail.column && (
                          <span className="font-mono text-xs font-bold text-neutral-200 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-750" dir="ltr">
                            {detail.column}
                          </span>
                        )}
                      </div>
                      <div>{confidenceBadge}</div>
                    </div>

                    {/* 5 Distinct Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* 1. Detection */}
                      <div className="p-2.5 rounded bg-neutral-900/70 border border-neutral-850/80 space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1">
                          <span className="text-blue-400">●</span>
                          <span>{isRTL ? 'شناسایی و تشخیص (Detection)' : 'Detection'}</span>
                        </div>
                        <p className="text-neutral-200 text-xs leading-relaxed">
                          {detail.detection}
                        </p>
                      </div>

                      {/* 2. Why Detected */}
                      <div className="p-2.5 rounded bg-neutral-900/70 border border-neutral-850/80 space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1">
                          <span className="text-purple-400">●</span>
                          <span>{isRTL ? 'علت تشخیص (Why Detected)' : 'Why it was detected'}</span>
                        </div>
                        <p className="text-neutral-300 text-xs leading-relaxed">
                          {detail.why_detected}
                        </p>
                      </div>

                      {/* 3. Suggested Rationale */}
                      <div className="p-2.5 rounded bg-neutral-900/70 border border-neutral-850/80 space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1">
                          <span className="text-emerald-400">●</span>
                          <span>{isRTL ? 'علت پیشنهاد اقدام (Why action suggested)' : 'Why action is being suggested'}</span>
                        </div>
                        <p className="text-neutral-300 text-xs leading-relaxed">
                          {detail.rationale}
                        </p>
                      </div>

                      {/* 4. Risk Assessment */}
                      <div className="p-2.5 rounded bg-neutral-900/70 border border-neutral-850/80 space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold flex items-center gap-1">
                          <span>⚠</span>
                          <span>{isRTL ? 'ریسک احتمالی (Potential risk)' : 'Potential risk'}</span>
                        </div>
                        <p className="text-amber-200/90 text-xs leading-relaxed">
                          {detail.risk}
                        </p>
                      </div>
                    </div>

                    {/* 5. User Action */}
                    <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-mono font-bold">✓</span>
                        <span className="text-neutral-400 font-medium">
                          {isRTL ? 'اقدام کاربر (User action):' : 'User action:'}
                        </span>
                        <span className="text-emerald-300 font-semibold font-mono">
                          {detail.user_action}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {transformResult.warnings.length > 0 && (
          <div className="mt-3 p-3 rounded border border-amber-900/60 bg-amber-950/20 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{isRTL ? 'هشدارهای پیش‌پردازش:' : 'Notices:'}</span>
            </div>
            {transformResult.warnings.map((w, i) => (
              <div key={i} className="font-mono text-[11px]">
                · {w}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transformed Diff Samples */}
      {transformResult.diff_samples.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-200">
            {t('cellModificationsTitle')}
          </h2>

          <div className="rounded-lg border border-neutral-850 bg-neutral-900/60 overflow-hidden">
            <table className="w-full text-left text-xs font-mono" dir="ltr">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-850">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Row #</th>
                  <th className="py-2.5 px-4 font-medium">Feature</th>
                  <th className="py-2.5 px-4 font-medium">Original Value</th>
                  <th className="py-2.5 px-4 font-medium">Transformed Value</th>
                  <th className="py-2.5 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {transformResult.diff_samples.map((diff, idx) => (
                  <tr key={idx} className="hover:bg-neutral-850/40">
                    <td className="py-2.5 px-4 text-neutral-400">{diff.row_index}</td>
                    <td className="py-2.5 px-4 font-semibold text-neutral-100">{diff.column}</td>
                    <td className="py-2.5 px-4 text-rose-400 line-through tabular-nums">
                      {diff.original || '(empty)'}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-semibold tabular-nums">
                      {diff.new}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-400 font-sans text-xs">
                      {diff.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cleaned Dataset Preview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">
            {t('cleanedPreviewTitle')} ({Math.min(10, transformResult.preview_rows.length)} {isRTL ? 'سطر نخست' : 'rows'})
          </h2>
          <span className="text-xs font-mono text-neutral-400">
            {isRTL ? 'ستون‌ها' : 'Columns'}: {transformResult.new_headers.join(', ')}
          </span>
        </div>

        <div className="rounded-lg border border-neutral-850 bg-neutral-900/60 overflow-hidden">
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left text-xs font-mono" dir="ltr">
              <thead className="sticky top-0 bg-neutral-950 text-neutral-400 border-b border-neutral-850">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  {transformResult.new_headers.map((h) => (
                    <th key={h} className="py-2 px-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {transformResult.preview_rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-850/40">
                    <td className="py-2 px-3 text-neutral-400 text-center">{i + 1}</td>
                    {transformResult.new_headers.map((h) => (
                      <td key={h} className="py-2 px-3 whitespace-nowrap tabular-nums">
                        {r[h] !== undefined ? String(r[h]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
