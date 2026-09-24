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
            {isRTL
              ? 'کسری امتیاز مربوط به مقادیر خالی و سطرهای تکراری برطرف شد'
              : 'Deductions for missing values and duplicates eliminated'}
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
      <div className="rounded-xl border border-neutral-850 bg-neutral-900/50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{t('auditTrailTitle')} ({transformResult.applied_operations.length} {isRTL ? 'عملیات' : 'actions'})</span>
        </h2>

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
          <div className="text-xs text-neutral-500">
            {isRTL ? 'هیچ تغییری تنظیم نشده است؛ دیتاست به صورت اولیه صادر می‌شود.' : 'No transformations configured. Raw dataset will remain as-is.'}
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
