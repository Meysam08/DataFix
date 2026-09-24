import React from 'react';
import {
  Database,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Play,
  Wrench
} from 'lucide-react';
import { ActiveDataset, Project } from '../types/dataset';
import { ScreenId } from './Navbar';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { useI18n } from '../i18n/context';

interface DashboardViewProps {
  datasets: ActiveDataset[];
  activeDataset: ActiveDataset | null;
  onSelectDataset: (dataset: ActiveDataset) => void;
  onNavigate: (screen: ScreenId) => void;
  onLoadSample: (sampleId: string) => void;
  onDeleteDataset: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onNavigate,
  onLoadSample,
  onDeleteDataset,
}) => {
  const { t, isRTL } = useI18n();

  const totalDatasets = datasets.length;
  const avgQualityScore =
    totalDatasets > 0
      ? Math.round(
          datasets.reduce((acc, d) => acc + d.analysis.quality_score, 0) / totalDatasets
        )
      : 0;

  const totalRowsCleaned = datasets.reduce((acc, d) => {
    if (d.currentTransform) {
      return acc + (d.analysis.rows - d.currentTransform.new_rows);
    }
    return acc;
  }, 0);

  const totalMissingResolved = datasets.reduce((acc, d) => {
    if (d.currentTransform) {
      return acc + (d.analysis.missing_values - d.currentTransform.new_analysis.missing_values);
    }
    return acc;
  }, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-850 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
            {t('dashboardTitle')}
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            {t('dashboardSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t('upload')}</span>
          </button>
        </div>
      </div>

      {/* Hygiene Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('totalDatasets')}</div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {totalDatasets}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {totalDatasets > 0 ? (isRTL ? 'فعال در حافظه' : 'Active in memory') : (isRTL ? 'هنوز فایلی بارگذاری نشده' : 'None uploaded yet')}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('avgQualityScore')}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                avgQualityScore >= 80
                  ? 'text-emerald-400'
                  : avgQualityScore >= 60
                  ? 'text-amber-400'
                  : totalDatasets === 0
                  ? 'text-neutral-500'
                  : 'text-rose-400'
              }`}
            >
              {totalDatasets > 0 ? `${avgQualityScore}%` : '—'}
            </span>
            <span className="text-[11px] font-mono text-neutral-400">deterministic</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {isRTL ? 'میانگین کل دیتاست‌های پروژه' : 'Across all uploaded datasets'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('rowsResolved')}</div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {totalRowsCleaned.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {isRTL ? 'سطرهای زائد/تکراری حذف شده' : 'Duplicates and dropped rows'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="text-xs font-mono text-neutral-400">{t('missingImputed')}</div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {totalMissingResolved.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {isRTL ? 'خانه‌های خالی ترمیم‌شده' : 'Values recovered via imputation'}
          </div>
        </div>
      </div>

      {/* Datasets Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
            <span>{t('activeDatasetsList')} ({datasets.length})</span>
          </h2>
          {datasets.length > 0 && (
            <span className="text-xs font-mono text-neutral-400">
              {isRTL ? 'برای ورود به چرخه آماده‌سازی روی دیتاست کلیک کنید' : 'Click to inspect and clean'}
            </span>
          )}
        </div>

        {datasets.length > 0 ? (
          <div className="rounded-lg border border-neutral-850 bg-neutral-900/50 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">{isRTL ? 'نام دیتاست' : 'Dataset'}</th>
                    <th className="py-2.5 px-4 font-medium">{t('rowsMetric')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('columnsMetric')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('missingValuesMetric')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('duplicateRowsMetric')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('qualityScoreMetric')}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{isRTL ? 'عملیات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 text-neutral-300">
                  {datasets.map((dataset) => {
                    const isSelected = activeDataset?.id === dataset.id;
                    const qScore = dataset.analysis.quality_score;

                    return (
                      <tr
                        key={dataset.id}
                        className={`hover:bg-neutral-850/60 transition-colors ${
                          isSelected ? 'bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              onSelectDataset(dataset);
                              onNavigate('overview');
                            }}
                            className="flex flex-col text-left focus:outline-none group cursor-pointer"
                          >
                            <span className="font-semibold text-neutral-100 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                              {dataset.name}
                              {isSelected && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60">
                                  {isRTL ? 'فعال' : 'Active'}
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400">
                              {dataset.filename} · {(dataset.fileSizeBytes / 1024).toFixed(1)} KB
                            </span>
                          </button>
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          {dataset.analysis.rows.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          {dataset.analysis.columns.length}
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          {dataset.analysis.missing_values > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {dataset.analysis.missing_values.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-400">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          {dataset.analysis.duplicate_rows > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {dataset.analysis.duplicate_rows}
                            </span>
                          ) : (
                            <span className="text-emerald-400">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 tabular-nums">
                          <span
                            className={`font-semibold ${
                              qScore >= 80
                                ? 'text-emerald-400'
                                : qScore >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {qScore}%
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                onSelectDataset(dataset);
                                onNavigate('overview');
                              }}
                              className="rounded bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-xs text-neutral-200 transition-colors cursor-pointer"
                            >
                              {t('inspectBtn')}
                            </button>
                            <button
                              onClick={() => {
                                onSelectDataset(dataset);
                                onNavigate('cleaning');
                              }}
                              className="rounded bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-xs text-white transition-colors cursor-pointer"
                            >
                              {t('cleanBtn')}
                            </button>
                            <button
                              onClick={() => onDeleteDataset(dataset.id)}
                              className="text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title={isRTL ? 'حذف دیتاست' : 'Remove Dataset'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center bg-neutral-900/20 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-850 text-neutral-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-200">
                {t('noDatasetsNotice')}
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                {isRTL
                  ? 'یک فایل CSV بارگذاری نمایید یا از دیتاست‌های نمونه زیر برای شروع کار استفاده کنید.'
                  : 'Upload your own CSV or select one of the curated benchmarks below to begin.'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('upload')}
            </button>
          </div>
        )}
      </div>

      {/* Benchmark Datasets Section */}
      <div className="space-y-4 pt-4 border-t border-neutral-850">
        <div>
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Play className="h-4 w-4 text-emerald-400" />
            <span>{isRTL ? 'دیتاست‌های نمونه با خطاهای واقعی' : 'Benchmark Sample Datasets'}</span>
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            {isRTL
              ? 'مجموعه‌های آماده با انواع داده‌های گم‌شده، مقادیر پرت و سطرهای تکراری برای تست قابلیت‌های پاک‌سازی.'
              : 'Preloaded dirty datasets with missing values, IQR outliers, and duplicates for testing.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_DATASETS.map((sample) => (
            <div
              key={sample.id}
              className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/40 hover:border-neutral-750 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-blue-400 font-semibold" dir="ltr">
                  {sample.task}
                </div>
                <h3 className="text-sm font-semibold text-neutral-100" dir="ltr">{sample.name}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  {sample.description}
                </p>
              </div>

              <button
                onClick={() => onLoadSample(sample.id)}
                className="mt-4 flex items-center justify-center gap-1.5 rounded bg-neutral-800 hover:bg-blue-600 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <Play className="h-3 w-3" />
                <span>{t('loadDatasetBtn')}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
