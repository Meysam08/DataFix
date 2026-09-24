import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Copy,
  Check,
  FileCode2,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Play
} from 'lucide-react';
import { ActiveDataset } from '../types/dataset';
import { ScreenId } from './Navbar';
import { useI18n } from '../i18n/context';
import { parseCsv } from '../utils/engine';

interface ExportViewProps {
  dataset: ActiveDataset;
  onNavigate: (screen: ScreenId) => void;
  onReset: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ dataset, onNavigate, onReset }) => {
  const { t, isRTL } = useI18n();
  const [copied, setCopied] = useState(false);

  const cleanedCsv = dataset.cleanedCsv || dataset.rawCsv;
  const initialAnalysis = dataset.analysis;
  const transform = dataset.currentTransform;
  const finalAnalysis = transform?.new_analysis || dataset.analysis;
  const pythonScript =
    transform?.python_code ||
    `# DataFix Preprocessing Pipeline\n# Exported for dataset: ${dataset.filename}\nimport pandas as pd\ndf = pd.read_csv(${JSON.stringify(dataset.filename)})\nprint(df.shape)\n`;

  // Parse cleaned CSV to validate integrity and prepare complete JSON records
  const { headers: parsedHeaders, rows: parsedRows } = parseCsv(cleanedCsv);

  // Validate integrity
  const isRowCountMatched = parsedRows.length === finalAnalysis.rows;
  const isColCountMatched = parsedHeaders.length === finalAnalysis.columns.length;
  const isIntegrityValid = isRowCountMatched && isColCountMatched && parsedHeaders.length > 0;

  // Remaining defects check
  const problematicColumnsCount = finalAnalysis.columns.filter(
    (c) => c.missing_count > 0 || c.is_empty || c.type_inconsistencies > 0 || (c.stats && c.stats.outlier_count > 0)
  ).length;

  const rowsRemoved = Math.max(0, initialAnalysis.rows - finalAnalysis.rows);
  const colsRemoved = Math.max(0, initialAnalysis.columns.length - finalAnalysis.columns.length);
  const appliedOps = transform?.applied_operations || [];

  // Download CSV with UTF-8 BOM for Microsoft Excel and Persian Unicode compatibility
  const handleDownloadCsv = () => {
    const blob = new Blob(['\uFEFF' + cleanedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cleaned_${dataset.filename}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON (Complete Cleaned Dataset, NEVER just preview rows)
  const handleDownloadJson = () => {
    const fullRecords = parsedRows.map((r: string[]) => {
      const record: Record<string, any> = {};
      parsedHeaders.forEach((h: string, cIdx: number) => {
        record[h] = r[cIdx] !== undefined ? r[cIdx] : '';
      });
      return record;
    });

    const jsonStr = JSON.stringify(fullRecords, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cleaned_${dataset.filename.replace(/\.[^/.]+$/, '')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Quality Audit Markdown
  const handleDownloadReport = () => {
    const report = `# DataFix Quality Audit & Cleaning Report
Dataset: ${dataset.filename}
Export Date: ${new Date().toISOString()}

## Dataset Hygiene Metrics (Final Analysis)
- Initial Rows: ${initialAnalysis.rows.toLocaleString()}
- Final Cleaned Rows: ${finalAnalysis.rows.toLocaleString()} (Rows Removed: ${rowsRemoved})
- Initial Columns: ${initialAnalysis.columns.length}
- Final Feature Columns: ${finalAnalysis.columns.length} (Columns Removed: ${colsRemoved})
- Initial Quality Score (DataFix Heuristic): ${initialAnalysis.quality_score}%
- Final Quality Score (DataFix Heuristic): ${finalAnalysis.quality_score}%
- Remaining Missing Cells: ${finalAnalysis.missing_values.toLocaleString()} (${finalAnalysis.missing_pct}%)
- Remaining Duplicate Rows: ${finalAnalysis.duplicate_rows.toLocaleString()} (${finalAnalysis.duplicate_pct}%)
- Remaining Problematic Columns: ${problematicColumnsCount}

## Applied Transformations (${appliedOps.length})
${appliedOps.length > 0 ? appliedOps.map((op, i) => `${i + 1}. ${op}`).join('\n') : 'No transformations applied (Raw dataset exported)'}

## Reproducible Python Preprocessing Script
\`\`\`python
${pythonScript}
\`\`\`
`;
    const blob = new Blob(['\uFEFF' + report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `datafix_audit_${dataset.filename.replace(/\.[^/.]+$/, '')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* Success Hero */}
      <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded px-2.5 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {isIntegrityValid
                ? isRTL
                  ? 'دیتاست با موفقیت پاک‌سازی و ممیزی شد'
                  : 'Dataset Successfully Cleaned & Validated'
                : isRTL
                ? 'هشدار: تناقض در صحت داده‌های خروجی'
                : 'Warning: Dataset Validation Alert'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
            {t('exportTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
            {t('exportSubtitle')}
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>{t('downloadCleanCsvBtn')}</span>
        </button>
      </div>

      {/* Dataset Validation Status Banner */}
      {!isIntegrityValid && (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-xs text-amber-300 flex items-start gap-3">
          <div className="font-semibold">{isRTL ? 'هشدار تطابق اعتبارسنجی:' : 'Validation Mismatch Notice:'}</div>
          <div>
            {isRTL
              ? `تعداد سطرهای خروجی (${parsedRows.length}) یا ستون‌ها (${parsedHeaders.length}) با گزارش تحلیل نهایی تطابق کامل ندارد.`
              : `Exported row count (${parsedRows.length}) or column count (${parsedHeaders.length}) does not match the expected final analysis.`}
          </div>
        </div>
      )}

      {/* Dataset Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('finalScoreMetric')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {finalAnalysis.quality_score}%
          </div>
          <div className="text-[11px] text-neutral-400">
            {finalAnalysis.missing_values === 0 && finalAnalysis.duplicate_rows === 0
              ? isRTL
                ? 'صفر کسری برای مقادیر خالی یا تکراری'
                : 'Zero duplicate or null penalties'
              : isRTL
              ? `${finalAnalysis.missing_values.toLocaleString()} خالی · ${finalAnalysis.duplicate_rows.toLocaleString()} تکراری باقی‌مانده`
              : `${finalAnalysis.missing_values.toLocaleString()} missing · ${finalAnalysis.duplicate_rows.toLocaleString()} duplicates remain`}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('cleanedRowsMetric')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {finalAnalysis.rows.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-400">
            {rowsRemoved > 0
              ? isRTL
                ? `${rowsRemoved.toLocaleString()} سطر حذف شد`
                : `${rowsRemoved.toLocaleString()} rows dropped`
              : isRTL
              ? 'تمامی سطرها حفظ شدند'
              : 'All rows retained'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('columnsMetric')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {finalAnalysis.columns.length}
          </div>
          <div className="text-[11px] text-neutral-400">
            {problematicColumnsCount === 0
              ? isRTL
                ? 'ساختار تمام ستون‌ها تأیید شد'
                : 'All column schemas validated'
              : isRTL
              ? `${problematicColumnsCount} ستون دارای موارد نیازمند بررسی`
              : `${problematicColumnsCount} columns with potential defects`}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('auditTrailTitle')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-400 tabular-nums">
            {appliedOps.length}
          </div>
          <div className="text-[11px] text-neutral-400">
            {isRTL ? 'عملیات اعمال‌شده در خط لوله' : 'Operations in pipeline'}
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-neutral-100">{t('exportFormatsTitle')}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:border-neutral-750 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>{isRTL ? 'فایل CSV' : 'CSV File'}</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-100">{t('formatCsvTitle')}</h3>
              <p className="mt-1 text-xs text-neutral-400">
                {t('formatCsvDesc')}
              </p>
            </div>
            <button
              onClick={handleDownloadCsv}
              className="mt-4 flex items-center justify-center gap-1.5 rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('downloadCleanCsvBtn')}</span>
            </button>
          </div>

          <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:border-neutral-750 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2">
                <FileCode2 className="h-4 w-4 text-blue-400" />
                <span>{isRTL ? 'رکوردهای کامل JSON' : 'Complete JSON Records'}</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-100">{t('formatJsonTitle')}</h3>
              <p className="mt-1 text-xs text-neutral-400">
                {isRTL
                  ? `خروجی تمام ${parsedRows.length.toLocaleString()} سطر دیتاست پاک‌سازی‌شده به فرمت کلید-مقدار JSON`
                  : `All ${parsedRows.length.toLocaleString()} cleaned records exported in complete JSON structure.`}
              </p>
            </div>
            <button
              onClick={handleDownloadJson}
              className="mt-4 flex items-center justify-center gap-1.5 rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('downloadJsonBtn')} ({parsedRows.length.toLocaleString()} rows)</span>
            </button>
          </div>

          <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:border-neutral-750 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>{isRTL ? 'گزارش ممیزی' : 'Audit Report'}</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-100">{t('formatReportTitle')}</h3>
              <p className="mt-1 text-xs text-neutral-400">
                {t('formatReportDesc')}
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="mt-4 flex items-center justify-center gap-1.5 rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('downloadReportBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reproducible Python Pipeline Code */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-blue-400" />
              <span>{t('pythonScriptTitle')}</span>
            </h2>
            <p className="text-xs text-neutral-400">
              {t('pythonScriptDesc')}
            </p>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>{t('copyPythonScriptBtn')}</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 overflow-x-auto" dir="ltr">
          <pre className="font-mono text-xs text-neutral-300 leading-relaxed text-left">
            {pythonScript}
          </pre>
        </div>
      </div>

      {/* Recommended ML Next Steps */}
      <div className="rounded-xl border border-neutral-850 bg-neutral-900/40 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-200">
          {t('mlNextStepsTitle')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded bg-neutral-950/60 border border-neutral-850 space-y-1">
            <div className="font-mono text-blue-400 font-semibold">{t('mlStep1Title')}</div>
            <p className="text-neutral-400 leading-normal">
              {t('mlStep1Desc')}
            </p>
          </div>

          <div className="p-3 rounded bg-neutral-950/60 border border-neutral-850 space-y-1">
            <div className="font-mono text-blue-400 font-semibold">{t('mlStep2Title')}</div>
            <p className="text-neutral-400 leading-normal">
              {t('mlStep2Desc')}
            </p>
          </div>

          <div className="p-3 rounded bg-neutral-950/60 border border-neutral-850 space-y-1">
            <div className="font-mono text-blue-400 font-semibold">{t('mlStep3Title')}</div>
            <p className="text-neutral-400 leading-normal">
              {t('mlStep3Desc')}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            {isRTL ? '← بازگشت به داشبورد' : '← Return to Dashboard'}
          </button>
          <button
            onClick={() => onNavigate('upload')}
            className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>{t('prepareAnotherDatasetBtn')}</span>
            <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
