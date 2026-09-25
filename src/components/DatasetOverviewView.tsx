import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Layers,
  BarChart3,
  Search,
  ArrowRight,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Hash,
  Database
} from 'lucide-react';
import { ActiveDataset, ColumnDetail } from '../types/dataset';
import { ScreenId } from './Navbar';
import { useI18n } from '../i18n/context';

interface DatasetOverviewViewProps {
  dataset: ActiveDataset;
  onNavigate: (screen: ScreenId) => void;
}

export const DatasetOverviewView: React.FC<DatasetOverviewViewProps> = ({
  dataset,
  onNavigate,
}) => {
  const { t, language, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<'grid' | 'schema' | 'stats'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showMalformedDetails, setShowMalformedDetails] = useState(false);
  const rowsPerPage = 12;

  const { analysis } = dataset;
  const { columns, preview_rows, quality_score, column_names } = analysis;

  // Filter preview rows
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return preview_rows;
    const q = searchQuery.toLowerCase();
    return preview_rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [preview_rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const displayedRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Numeric columns for stats
  const numericColumns = columns.filter((c) => c.stats !== null);

  // Problematic columns count
  const problematicCols = columns.filter(
    (c) => c.is_empty || c.missing_count > 0 || c.type_inconsistencies > 0 || (c.stats && c.stats.outlier_count > 0)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner / Dataset Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span>{t('datasetsBreadcrumb')}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-200">{dataset.filename}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-3">
            {dataset.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-neutral-400">
            <span>{(dataset.fileSizeBytes / 1024).toFixed(1)} KB</span>
            <span className="text-neutral-700">·</span>
            <span>{dataset.uploadedAt}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('quality')}
            className="flex items-center gap-2 rounded-md bg-neutral-850 border border-neutral-750 px-3.5 py-2 text-xs font-medium text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            {t('actionQualityBtn')}
          </button>

          <button
            onClick={() => onNavigate('cleaning')}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Wrench className="h-4 w-4" />
            {t('actionCleanBtn')}
          </button>
        </div>
      </div>

      {/* Primary Key Metrics Grid - Visually obvious, clean, uncrowded */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Rows */}
        <div className="p-4 rounded-xl border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('rowsMetric')}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-neutral-100 tabular-nums">
            {analysis.rows.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {analysis.rows > 0 ? (isRTL ? 'تعداد کل رکوردها' : 'total records') : '—'}
          </div>
        </div>

        {/* Metric 2: Columns */}
        <div className="p-4 rounded-xl border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('columnsMetric')}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-neutral-100 tabular-nums">
            {columns.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {columns.filter((c) => c.type === 'integer' || c.type === 'float').length} {isRTL ? 'عددی' : 'numeric'}
          </div>
        </div>

        {/* Metric 3: Missing Values */}
        <div className="p-4 rounded-xl border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('missingValuesMetric')}</div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              analysis.missing_values > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {analysis.missing_values.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {analysis.missing_pct}% {isRTL ? 'از کل سلول‌ها' : 'of cells'}
          </div>
        </div>

        {/* Metric 4: Duplicate Rows */}
        <div className="p-4 rounded-xl border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('duplicateRowsMetric')}</div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              analysis.duplicate_rows > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {analysis.duplicate_rows.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {analysis.duplicate_pct}% {isRTL ? 'تکراری' : 'duplicate'}
          </div>
        </div>

        {/* Metric 5: Problematic Columns */}
        <div className="p-4 rounded-xl border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('problematicColumnsMetric')}</div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              problematicCols.length > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {problematicCols.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {isRTL ? `از ${columns.length} ستون` : `of ${columns.length} columns`}
          </div>
        </div>

        {/* Metric 6: Quality Score */}
        <div className="p-4 rounded-xl border border-neutral-850 bg-neutral-900/80">
          <div className="text-xs font-mono text-neutral-400">{t('qualityScoreMetric')}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
                quality_score >= 80
                  ? 'text-emerald-400'
                  : quality_score >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {quality_score}%
            </span>
            <span className="text-[10px] font-mono text-neutral-400">/ 100</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 font-mono">
            {quality_score >= 80
              ? isRTL ? 'کیفیت مناسب' : 'High quality'
              : isRTL ? 'نیازمند پاک‌سازی' : 'Needs cleaning'}
          </div>
        </div>
      </div>

      {/* CSV Structural Integrity Section */}
      {analysis.csv_structure && !analysis.csv_structure.valid ? (
        <div className="p-4 rounded-lg border border-rose-900/70 bg-rose-950/30 flex flex-col gap-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200 block">
                  {t('csvStructureWarningTitle')} ({analysis.csv_structure.malformed_rows} {isRTL ? 'سطر' : 'rows'})
                </span>
                <span className="text-rose-300/90 text-xs">
                  {isRTL
                    ? `${analysis.csv_structure.malformed_rows} سطر دارای تعداد فیلد ناسازگار هستند. این سطرها باید قبل از تحلیل قابل اعتماد بررسی شوند.`
                    : `${analysis.csv_structure.malformed_rows} rows contain an inconsistent number of fields. These rows require inspection before reliable analysis.`}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowMalformedDetails(!showMalformedDetails)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-900/50 hover:bg-rose-900/80 text-rose-200 border border-rose-700/50 font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span>{showMalformedDetails ? t('csvStructureHideBtn') : t('csvStructureInspectBtn')}</span>
            </button>
          </div>

          {showMalformedDetails && analysis.csv_structure.malformed_row_details.length > 0 && (
            <div className="mt-2 pt-3 border-t border-rose-900/50 space-y-2">
              <div className="text-xs font-mono text-neutral-300">
                {t('csvStructureExpectedCols')}: <span className="text-emerald-400 font-bold">{analysis.csv_structure.expected_columns}</span>
              </div>
              <div className="max-h-60 overflow-y-auto border border-neutral-800 rounded bg-neutral-950/80">
                <table className="w-full text-left font-mono text-[11px]" dir="ltr">
                  <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-1.5 px-3">{t('csvStructureRowNumber')}</th>
                      <th className="py-1.5 px-3">{t('csvStructureExpectedCols')}</th>
                      <th className="py-1.5 px-3">{t('csvStructureActualCols')}</th>
                      <th className="py-1.5 px-3">{t('csvStructureRawFields')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850 text-neutral-200">
                    {analysis.csv_structure.malformed_row_details.map((m, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/50">
                        <td className="py-1.5 px-3 text-rose-300 font-semibold">{m.row_number}</td>
                        <td className="py-1.5 px-3 text-neutral-400">{m.expected_columns}</td>
                        <td className="py-1.5 px-3">
                          <span className={m.actual_columns > m.expected_columns ? 'text-amber-400' : 'text-rose-400'}>
                            {m.actual_columns} ({m.actual_columns > m.expected_columns ? `+${m.actual_columns - m.expected_columns}` : `${m.actual_columns - m.expected_columns}`})
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-neutral-300 truncate max-w-md" title={m.raw_fields?.join(' | ')}>
                          {m.raw_fields?.join(' | ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : analysis.csv_structure && analysis.csv_structure.valid ? (
        <div className="p-2.5 px-3 rounded-lg border border-neutral-850 bg-neutral-900/40 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium text-emerald-300">{t('csvStructureValid')}</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400">
              {t('csvStructureAllValidDesc', { count: analysis.csv_structure.expected_columns || columns.length })}
            </span>
          </div>
        </div>
      ) : null}

      {/* Quick Status Bar */}
      {analysis.detected_issues.length > 0 ? (
        <div className="p-4 rounded-lg border border-amber-900/60 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-amber-200">
              {isRTL
                ? `تعداد ${analysis.detected_issues.length} مشکل در این دیتاست شناسایی شد (${analysis.missing_values} خانه خالی و ${analysis.duplicate_rows} سطر تکراری).`
                : `${analysis.detected_issues.length} issues detected in this dataset (${analysis.missing_values} missing cells, ${analysis.duplicate_rows} duplicate rows).`}
            </span>
          </div>
          <button
            onClick={() => onNavigate('quality')}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <span>{isRTL ? 'مشاهده توصیه‌ها و اصلاح' : 'Inspect Recommendations'}</span>
            <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-emerald-900/60 bg-emerald-950/20 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            {isRTL
              ? 'این دیتاست کاملاً بدون نقص است؛ مقادیر خالی یا سطر تکراری یافت نشد.'
              : 'This dataset is clean. No missing values or duplicates detected.'}
          </span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-850 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'grid' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {t('tabGrid')} ({analysis.rows})
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'schema' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            {t('tabSchema')} ({columns.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'stats' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {t('tabStats')} ({numericColumns.length})
          </button>
        </div>

        {activeTab === 'grid' && (
          <div className="relative">
            <Search className={`absolute top-2.5 h-3.5 w-3.5 text-neutral-400 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t('searchPlaceholder')}
              className={`w-full sm:w-64 rounded-md border border-neutral-800 bg-neutral-900 py-1.5 text-xs font-mono text-neutral-200 focus:outline-none focus:border-blue-500 ${
                isRTL ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'
              }`}
            />
          </div>
        )}
      </div>

      {/* Tab 1: Data Table Grid (Never translates data contents) */}
      {activeTab === 'grid' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-neutral-850 bg-neutral-900/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs font-mono border-collapse" dir="ltr">
                <thead className="sticky top-0 z-10 bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-neutral-400 w-12 text-center bg-neutral-950">
                      #
                    </th>
                    {column_names.map((colName) => {
                      const colDetail = columns.find((c) => c.name === colName);
                      return (
                        <th
                          key={colName}
                          className="py-2.5 px-3 font-semibold text-neutral-300 whitespace-nowrap bg-neutral-950"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{colName}</span>
                            <span className="text-[10px] font-normal text-neutral-400 px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800">
                              {colDetail?.type || 'string'}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 text-neutral-300">
                  {displayedRows.length > 0 ? (
                    displayedRows.map((row, idx) => {
                      const rowNum = (page - 1) * rowsPerPage + idx + 1;
                      return (
                        <tr key={idx} className="hover:bg-neutral-850/60 transition-colors">
                          <td className="py-2 px-3 text-neutral-400 text-center font-mono text-[11px] bg-neutral-950/40">
                            {rowNum}
                          </td>
                          {column_names.map((colName) => {
                            const val = row[colName];
                            const isEmpty = val === null || val === undefined || String(val).trim() === '';
                            return (
                              <td
                                key={colName}
                                className={`py-2 px-3 whitespace-nowrap tabular-nums ${
                                  isEmpty ? 'bg-rose-950/20 text-rose-400 italic text-[11px]' : ''
                                }`}
                              >
                                {isEmpty ? '(empty)' : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={column_names.length + 1} className="py-8 text-center text-neutral-500">
                        {isRTL ? `موردی با جستجوی "${searchQuery}" یافت نشد` : `No rows matching "${searchQuery}"`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between border-t border-neutral-850 bg-neutral-950/80 px-4 py-2.5 text-xs font-mono text-neutral-400">
              <div>
                {isRTL
                  ? `نمایش ${(page - 1) * rowsPerPage + 1} تا ${Math.min(
                      page * rowsPerPage,
                      filteredRows.length
                    )} از ${filteredRows.length} ردیف پیش‌نمایش`
                  : `Showing ${(page - 1) * rowsPerPage + 1}–${Math.min(
                      page * rowsPerPage,
                      filteredRows.length
                    )} of ${filteredRows.length} sample preview rows`}
                {analysis.rows > preview_rows.length &&
                  (isRTL ? ` (از کل ${analysis.rows} ردیف)` : ` (from ${analysis.rows} total)`)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1 rounded bg-neutral-900 border border-neutral-800 disabled:opacity-40 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-neutral-300">
                  {isRTL ? `صفحه ${page} از ${totalPages}` : `Page ${page} of ${totalPages}`}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1 rounded bg-neutral-900 border border-neutral-800 disabled:opacity-40 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Column Schema & Types */}
      {activeTab === 'schema' && (
        <div className="rounded-lg border border-neutral-850 bg-neutral-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850 font-mono">
                <tr>
                  <th className="py-2.5 px-4 font-medium">#</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نام ستون' : 'Column Name'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نوع شناسایی‌شده' : 'Inferred Type'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'مقادیر گمشده' : 'Missing Count'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'مقادیر یکتا' : 'Unique Values'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'مقادیر نمونه' : 'Sample Values'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'وضعیت سلامت' : 'Health Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 font-mono text-neutral-300">
                {columns.map((col, idx) => {
                  const hasMissing = col.missing_count > 0;
                  const hasInconsistency = col.type_inconsistencies > 0;
                  const hasOutliers = col.stats && col.stats.outlier_count > 0;

                  return (
                    <tr key={col.name} className="hover:bg-neutral-850/60 transition-colors">
                      <td className="py-3 px-4 text-neutral-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-neutral-100 font-mono" dir="ltr">{col.name}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 border border-neutral-750 text-neutral-300" dir="ltr">
                          {col.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        {hasMissing ? (
                          <span className={col.missing_pct > 20 ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
                            {col.missing_count} ({col.missing_pct}%)
                          </span>
                        ) : (
                          <span className="text-neutral-400">0 (0%)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-neutral-400">
                        {col.unique_count} ({col.unique_pct}%)
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400 max-w-xs truncate" dir="ltr">
                        {col.sample_values.join(', ') || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {col.is_empty ? (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {isRTL ? 'ستون کاملاً خالی' : 'Empty Column'}
                          </span>
                        ) : hasMissing || hasInconsistency || hasOutliers ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {hasMissing && (isRTL ? 'گمشده' : 'Missing')}
                            {hasMissing && (hasInconsistency || hasOutliers) ? ' / ' : ''}
                            {hasOutliers && (isRTL ? 'داده پرت' : 'Outliers')}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">{t('cleanStatus')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Descriptive Statistics */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-850 bg-neutral-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono" dir="ltr">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Feature</th>
                    <th className="py-2.5 px-4 font-medium text-right">Min</th>
                    <th className="py-2.5 px-4 font-medium text-right">Q1 (25%)</th>
                    <th className="py-2.5 px-4 font-medium text-right">Median</th>
                    <th className="py-2.5 px-4 font-medium text-right">Mean</th>
                    <th className="py-2.5 px-4 font-medium text-right">Q3 (75%)</th>
                    <th className="py-2.5 px-4 font-medium text-right">Max</th>
                    <th className="py-2.5 px-4 font-medium text-right">Std Dev</th>
                    <th className="py-2.5 px-4 font-medium text-right">IQR [Bounds]</th>
                    <th className="py-2.5 px-4 font-medium text-right">Outliers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 text-neutral-300">
                  {numericColumns.map((col) => {
                    const s = col.stats!;
                    return (
                      <tr key={col.name} className="hover:bg-neutral-850/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-neutral-100">{col.name}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-400">{s.min}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-400">{s.q1}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold text-neutral-200">
                          {s.median}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-300">{s.mean}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-400">{s.q3}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-400">{s.max}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-400">{s.std_dev}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-400">
                          [{s.lower_bound}, {s.upper_bound}]
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {s.outlier_count > 0 ? (
                            <span className="font-semibold text-amber-400">
                              {s.outlier_count} {t('outliersDetected')}
                            </span>
                          ) : (
                            <span className="text-emerald-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/30 text-xs text-neutral-400 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-neutral-200">
                {isRTL ? 'فرمول مرزبندی آماری ۱.۵ برابر IQR' : 'Statistical 1.5× IQR Boundary Formula'}
              </div>
              <p className="mt-0.5">
                {isRTL
                  ? 'داده‌های پرت احتمالی بر مبنای چارک‌های اول و سوم محاسبه می‌شوند: مقادیر کمتر از Q1 - 1.5×IQR یا بیشتر از Q3 + 1.5×IQR. در میز کار پاک‌سازی می‌توانید این سطرها را حذف یا محدود (Clip) نمایید.'
                  : 'Potential outliers are computed using Tukey\'s interquartile range rule: values below Q1 - 1.5×IQR or above Q3 + 1.5×IQR. In the Cleaning Workspace, you can choose to inspect, clip, or drop these rows before training your ML model.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
