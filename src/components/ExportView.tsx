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

interface ExportViewProps {
  dataset: ActiveDataset;
  onNavigate: (screen: ScreenId) => void;
  onReset: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({ dataset, onNavigate, onReset }) => {
  const { t, isRTL } = useI18n();
  const [copied, setCopied] = useState(false);

  const cleanedCsv = dataset.cleanedCsv || dataset.rawCsv;
  const analysis = dataset.analysis;
  const transform = dataset.currentTransform;
  const pythonScript = transform?.python_code || '# Python reproducible pipeline\nimport pandas as pd\n';

  // Download CSV
  const handleDownloadCsv = () => {
    const blob = new Blob([cleanedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cleaned_${dataset.filename}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(transform?.preview_rows || [], null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cleaned_${dataset.filename.replace(/\.csv$/, '')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Quality Audit Markdown
  const handleDownloadReport = () => {
    const report = `# DataFix Quality Audit & Cleaning Report
Dataset: ${dataset.filename}
Date: ${new Date().toISOString()}

## Dataset Hygiene Metrics
- Initial Rows: ${transform?.original_rows || analysis.rows}
- Final Rows: ${transform?.new_rows || analysis.rows}
- Initial Quality Score: ${analysis.quality_score}%
- Final Quality Score: ${transform?.new_quality_score || analysis.quality_score}%

## Applied Transformations
${transform?.applied_operations.map((op, i) => `${i + 1}. ${op}`).join('\n') || 'None'}

## Reproducible Python Preprocessing Script
\`\`\`python
${pythonScript}
\`\`\`
`;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `datafix_audit_${dataset.filename.replace(/\.csv$/, '')}.md`);
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
            <span>{isRTL ? 'دیتاست با موفقیت پاک‌سازی و آماده شد' : 'Dataset Successfully Cleaned & Formatted'}</span>
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

      {/* Dataset Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('finalScoreMetric')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {transform?.new_quality_score || analysis.quality_score}%
          </div>
          <div className="text-[11px] text-neutral-400">
            {isRTL ? 'بدون جریمه مقادیر خالی یا تکراری' : 'Zero duplicate or null penalties'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('cleanedRowsMetric')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {transform?.new_rows || analysis.rows}
          </div>
          <div className="text-[11px] text-neutral-400">
            {transform?.rows_removed
              ? isRTL ? `${transform.rows_removed} سطر حذف شد` : `${transform.rows_removed} rows dropped`
              : isRTL ? 'تمامی سطرها حفظ شدند' : 'All rows retained'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('columnsMetric')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {transform?.new_columns || analysis.columns.length}
          </div>
          <div className="text-[11px] text-neutral-400">
            {isRTL ? 'ساختار و انواع استاندارد' : 'Clean schema & types'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('auditTrailTitle')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-400 tabular-nums">
            {transform?.applied_operations.length || 0}
          </div>
          <div className="text-[11px] text-neutral-400">
            {isRTL ? 'عملیات اعمال‌شده در خط لوله' : 'Applied in pipeline'}
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
                <span>CSV File</span>
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
                <span>JSON Records</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-100">{t('formatJsonTitle')}</h3>
              <p className="mt-1 text-xs text-neutral-400">
                {t('formatJsonDesc')}
              </p>
            </div>
            <button
              onClick={handleDownloadJson}
              className="mt-4 flex items-center justify-center gap-1.5 rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('downloadJsonBtn')}</span>
            </button>
          </div>

          <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:border-neutral-750 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>Audit Report</span>
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
