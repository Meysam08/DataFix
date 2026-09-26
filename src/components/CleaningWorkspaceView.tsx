import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  Filter,
  Plus,
  Trash2,
  Copy,
  Hash,
  Type,
  AlertCircle,
  Info
} from 'lucide-react';
import {
  ActiveDataset,
  CleaningOperations,
  ColumnType,
  FilterRule,
  MissingActionConfig
} from '../types/dataset';
import { ScreenId } from './Navbar';
import { executePreviewTransform } from '../utils/engine';
import { useI18n } from '../i18n/context';
import { PendingChangesSummary } from './PendingChangesSummary';
import {
  applyAllRecommendations,
  getDefaultOperations
} from '../utils/recommendations';

interface CleaningWorkspaceViewProps {
  dataset: ActiveDataset;
  onNavigate: (screen: ScreenId) => void;
  onPreviewGenerated: (transformResult: any, operations: CleaningOperations) => void;
  onUpdateOperations?: (operations: CleaningOperations) => void;
}

export const CleaningWorkspaceView: React.FC<CleaningWorkspaceViewProps> = ({
  dataset,
  onNavigate,
  onPreviewGenerated,
  onUpdateOperations,
}) => {
  const { t, isRTL } = useI18n();
  const { analysis } = dataset;
  const { columns, duplicate_rows, missing_values } = analysis;

  // Initialize operations state
  const [operations, setOperations] = useState<CleaningOperations>(() => {
    return dataset.operations || getDefaultOperations(analysis);
  });

  // Track initial mount so we don't trigger unnecessary parent state update on mount
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (onUpdateOperations) {
      onUpdateOperations(operations);
    }
  }, [operations, onUpdateOperations]);

  // Sync operations if active dataset changes
  useEffect(() => {
    if (dataset.operations) {
      setOperations(dataset.operations);
    }
  }, [dataset.id]);

  const [activeTab, setActiveTab] = useState<
    'missing' | 'duplicates' | 'outliers' | 'types' | 'columns' | 'filters'
  >('missing');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Apply all recommendations in 1 click
  const handleApplyAllRecs = () => {
    const updated = applyAllRecommendations(operations, analysis);
    setOperations(updated);
  };

  // Reset operations
  const handleResetOperations = () => {
    const emptyOps: CleaningOperations = {
      remove_duplicates: false,
      missing_actions: { global: 'none', columns: {} },
      type_conversions: {},
      drop_columns: [],
      rename_columns: {},
      filter_rules: [],
      outlier_actions: {},
    };
    setOperations(emptyOps);
  };

  // Add a filter rule
  const handleAddFilter = () => {
    const newRule: FilterRule = {
      id: `rule-${Date.now()}`,
      column: columns[0]?.name || '',
      operator: '>',
      value: '0',
    };
    setOperations((prev) => ({
      ...prev,
      filter_rules: [...prev.filter_rules, newRule],
    }));
  };

  const handleRemoveFilter = (ruleId: string) => {
    setOperations((prev) => ({
      ...prev,
      filter_rules: prev.filter_rules.filter((r) => r.id !== ruleId),
    }));
  };

  const handleUpdateFilter = (ruleId: string, patch: Partial<FilterRule>) => {
    setOperations((prev) => ({
      ...prev,
      filter_rules: prev.filter_rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    }));
  };

  // Toggle drop column
  const handleToggleDropCol = (colName: string) => {
    setOperations((prev) => {
      const exists = prev.drop_columns.includes(colName);
      return {
        ...prev,
        drop_columns: exists
          ? prev.drop_columns.filter((c) => c !== colName)
          : [...prev.drop_columns, colName],
      };
    });
  };

  // Count active operations
  const activeOpsCount =
    (operations.remove_duplicates ? 1 : 0) +
    (operations.missing_actions.global === 'drop_rows' ? 1 : 0) +
    Object.keys(operations.missing_actions.columns).length +
    Object.keys(operations.type_conversions).length +
    operations.drop_columns.length +
    Object.keys(operations.rename_columns).length +
    operations.filter_rules.length +
    Object.values(operations.outlier_actions).filter((a) => a !== 'keep').length;

  // Generate preview
  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const preview = await executePreviewTransform(dataset.rawCsv, operations, dataset.filename);
      onPreviewGenerated(preview, operations);
      onNavigate('review');
    } catch (e: any) {
      setErrorMsg(
        isRTL
          ? 'محاسبه پیش‌نمایش تغییرات با خطا مواجه شد. لطفاً فیلترها و مقادیر جایگزین را بازبینی نمایید.'
          : (e.message || 'Failed to compute transformation preview. Please verify your filter expressions and values.')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span>{isRTL ? 'میز کار' : 'Workspace'}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-200">{dataset.filename}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            {t('workspaceTitle')}
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            {t('workspaceSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleApplyAllRecs}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('applyAllRecommendationsBtn')}</span>
          </button>

          <button
            disabled={isGenerating}
            onClick={handleGeneratePreview}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            )}
            <span>{t('previewDiffBtn')}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">{isRTL ? 'خطای پیش‌پردازش' : 'Preprocessing Notice'}</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Optional Modeling Target Designation (Requirement 4) */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-blue-400">
              {isRTL ? 'تعیین متغیر هدف مدل‌سازی (اختیاری)' : 'Prediction Target Column Designation (Optional)'}
            </span>
            {operations.target_column && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/70 text-blue-300 border border-blue-800/60">
                {operations.target_column}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
            {isRTL
              ? 'ستون‌هایی مانند Price و Price(USD) کاندیداهای متغیر هدف هستند. مقادیر فرین متغیر هدف ممکن است مشاهدات کاملاً واقعی باشند و نباید به طور خودکار به عنوان داده پرت حذف یا بریده شوند.'
              : 'Columns like Price or Price(USD) are target candidates. Extreme target values may be legitimate observations and should generally be investigated before being clipped or removed.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-medium text-neutral-300">
            {isRTL ? 'متغیر هدف:' : 'Target Column:'}
          </label>
          <select
            value={operations.target_column || ''}
            onChange={(e) => {
              const val = e.target.value || null;
              setOperations((prev) => ({
                ...prev,
                target_column: val,
                outlier_actions: val ? { ...prev.outlier_actions, [val]: 'keep' } : prev.outlier_actions,
              }));
            }}
            className="rounded-md border border-neutral-750 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="">{isRTL ? '-- تعیین نشده (همه ویژگی معمولی) --' : '-- None designated (all input features) --'}</option>
            {columns.map((col) => {
              const isCand = analysis.target_candidates?.includes(col.name) || col.is_target_candidate;
              return (
                <option key={col.name} value={col.name}>
                  {col.name} {isCand ? (isRTL ? '★ کاندیدای هدف' : '★ (Target Candidate)') : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-850 pb-2">
        <button
          onClick={() => setActiveTab('missing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'missing' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          {t('tabMissing')} ({missing_values})
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'duplicates' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Copy className="h-3.5 w-3.5" />
          {t('tabDuplicates')} ({duplicate_rows})
        </button>
        <button
          onClick={() => setActiveTab('outliers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'outliers' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Hash className="h-3.5 w-3.5" />
          {t('tabOutliers')}
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'types' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type className="h-3.5 w-3.5" />
          {t('tabTypes')}
        </button>
        <button
          onClick={() => setActiveTab('columns')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'columns' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          {t('tabColumns')}
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'filters' ? 'bg-neutral-850 text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {t('tabFilters')} ({operations.filter_rules.length})
        </button>
      </div>

      {/* Tab 1: Missing Values Handling */}
      {activeTab === 'missing' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-200">{t('globalStrategyTitle')}</div>
              <p className="text-xs text-neutral-400">
                {t('globalStrategySubtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOperations((prev) => ({
                    ...prev,
                    missing_actions: { ...prev.missing_actions, global: 'none' },
                  }))
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  operations.missing_actions.global === 'none'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
                }`}
              >
                {t('configurePerColBtn')}
              </button>
              <button
                type="button"
                onClick={() =>
                  setOperations((prev) => ({
                    ...prev,
                    missing_actions: { ...prev.missing_actions, global: 'drop_rows' },
                  }))
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  operations.missing_actions.global === 'drop_rows'
                    ? 'bg-rose-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
                }`}
              >
                {t('dropAnyRowBtn')}
              </button>
            </div>
          </div>

          {operations.missing_actions.global === 'none' && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-neutral-400">
                {t('perFeatureMissingTitle')}
              </h3>

              <div className="rounded-lg border border-neutral-850 bg-neutral-900/40 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">{isRTL ? 'ویژگی' : 'Feature'}</th>
                      <th className="py-2.5 px-4 font-medium">{isRTL ? 'نوع' : 'Type'}</th>
                      <th className="py-2.5 px-4 font-medium">{isRTL ? 'خانه‌های خالی' : 'Missing Cells'}</th>
                      <th className="py-2.5 px-4 font-medium">{isRTL ? 'روش اصلاح' : 'Remediation Action'}</th>
                      <th className="py-2.5 px-4 font-medium">{isRTL ? 'مقدار ثابت دلخواه' : 'Custom Constant Value'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850 text-neutral-300">
                    {columns.map((col) => {
                      const currentAction = operations.missing_actions.columns[col.name]?.action || 'none';
                      const customVal = operations.missing_actions.columns[col.name]?.value || '';

                      return (
                        <tr key={col.name} className="hover:bg-neutral-850/40">
                          <td className="py-3 px-4 font-semibold text-neutral-100 font-mono" dir="ltr">{col.name}</td>
                          <td className="py-3 px-4 text-neutral-400" dir="ltr">{col.type}</td>
                          <td className="py-3 px-4 tabular-nums">
                            {col.missing_count > 0 ? (
                              <span className="text-amber-400 font-semibold">
                                {col.missing_count} ({col.missing_pct}%)
                              </span>
                            ) : (
                              <span className="text-neutral-500">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={currentAction}
                              onChange={(e) => {
                                const act = e.target.value as any;
                                setOperations((prev) => {
                                  const updatedCols = { ...prev.missing_actions.columns };
                                  if (act === 'none') {
                                    delete updatedCols[col.name];
                                  } else {
                                    updatedCols[col.name] = { action: act, value: customVal };
                                  }
                                  return {
                                    ...prev,
                                    missing_actions: { ...prev.missing_actions, columns: updatedCols },
                                  };
                                });
                              }}
                              className="rounded-md border border-neutral-750 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                            >
                              <option value="none">{t('actionLeaveUnchanged')}</option>
                              <option value="drop_rows">{t('actionDropRows')}</option>
                              {col.type === 'integer' || col.type === 'float' ? (
                                <>
                                  <option value="mean">
                                    {t('actionFillMean')} ({col.stats ? col.stats.mean : 'avg'})
                                  </option>
                                  <option value="median">
                                    {t('actionFillMedian')} ({col.stats ? col.stats.median : 'med'})
                                  </option>
                                </>
                              ) : null}
                              <option value="mode">
                                {t('actionFillMode')} ({col.mode || 'mode'})
                              </option>
                              <option value="custom">{t('actionFillCustom')}</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            {currentAction === 'custom' ? (
                              <input
                                type="text"
                                value={customVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOperations((prev) => ({
                                    ...prev,
                                    missing_actions: {
                                      ...prev.missing_actions,
                                      columns: {
                                        ...prev.missing_actions.columns,
                                        [col.name]: { action: 'custom', value: val },
                                      },
                                    },
                                  }));
                                }}
                                placeholder="e.g. Unknown or 0"
                                className="w-36 rounded border border-neutral-750 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 font-mono"
                                dir="ltr"
                              />
                            ) : (
                              <span className="text-neutral-600">—</span>
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
        </div>
      )}

      {/* Tab 2: Duplicate Rows */}
      {activeTab === 'duplicates' && (
        <div className="p-6 rounded-lg border border-neutral-850 bg-neutral-900/60 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                {t('duplicateSwitchTitle')}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isRTL
                  ? `تعداد ${duplicate_rows} سطر تکراری شناسایی شد (${analysis.duplicate_pct}٪ از کل دیتاست).`
                  : `Identified ${duplicate_rows} duplicate row(s) (${analysis.duplicate_pct}% of total dataset). `}
                {t('duplicateSwitchDesc')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={operations.remove_duplicates}
                onChange={(e) =>
                  setOperations((prev) => ({
                    ...prev,
                    remove_duplicates: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="p-3 rounded border border-neutral-800 bg-neutral-950/60 text-xs font-mono text-neutral-400">
            {operations.remove_duplicates ? (
              <span className="text-emerald-400">
                {isRTL
                  ? `تعداد ${duplicate_rows} سطر تکراری حذف خواهند شد و اولین وقوع هر کدام حفظ می‌شود.`
                  : `Will drop ${duplicate_rows} duplicate row(s) and preserve the first occurrence.`}
              </span>
            ) : (
              <span className="text-neutral-500">
                {isRTL
                  ? 'سطرهای تکراری در دیتاست نهایی باقی خواهند ماند.'
                  : 'Duplicates will be retained in the final dataset.'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Outliers Handling */}
      {activeTab === 'outliers' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              {t('outlierSectionTitle')}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {isRTL
                ? 'مدیریت آگاه از زمینه داده‌های خارج از بازه IQR. توجه داشته باشید که در ویژگی‌های با توزیع متمرکز (IQR=0) یا متغیرهای هدف پیش‌بینی، داده‌های حدی نباید به طور خودکار محدود (Clip) یا حذف شوند.'
                : 'Context-aware remediation for values outside IQR bounds. For concentrated distributions (IQR = 0) or prediction targets, extreme values must be reviewed before clipping to avoid destroying valid information.'}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-850 bg-neutral-900/40 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                <tr>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'ویژگی و وضعیت' : 'Feature & Context'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'مرزهای IQR [پایین، بالا]' : 'IQR Bounds [Lower, Upper]'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'تعداد داده پرت' : 'Outlier Count'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نمونه مقادیر' : 'Sample Outliers'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'روش اصلاح' : 'Remediation Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {columns
                  .filter((c) => c.stats !== null)
                  .map((col) => {
                    const s = col.stats!;
                    const curAct = operations.outlier_actions[col.name] || 'keep';
                    const isZeroIqr = s.iqr_is_zero || s.iqr === 0;
                    const isTarget = operations.target_column === col.name || analysis.target_candidates?.includes(col.name) || col.is_target_candidate;
                    const isSevereLeverage = (s.upper_bound > 0 && s.max > s.upper_bound * 5) || (s.lower_bound < 0 && s.min < s.lower_bound * 5);

                    return (
                      <tr key={col.name} className="hover:bg-neutral-850/40">
                        <td className="py-3 px-4 font-semibold text-neutral-100 font-mono">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-neutral-100" dir="ltr">{col.name}</span>
                            <div className="flex flex-wrap items-center gap-1 font-sans text-[10px]">
                              {isZeroIqr && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/60">
                                  {isRTL ? 'توزیع متمرکز (IQR=0)' : 'Degenerate IQR = 0'}
                                </span>
                              )}
                              {isTarget && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-semibold bg-blue-950/70 text-blue-300 border border-blue-800/60">
                                  {isRTL ? 'کاندیدای هدف' : 'Target Candidate'}
                                </span>
                              )}
                              {isSevereLeverage && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/60">
                                  {isRTL ? 'اهرم شدید (Leverage)' : 'Severe Leverage'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-neutral-400">
                          [{s.lower_bound}, {s.upper_bound}]
                          {isZeroIqr && (
                            <div className="text-[10px] text-purple-400/90 font-sans mt-0.5">
                              {isRTL ? `Q1=میانه=Q3=${s.median}` : `Q1=Med=Q3=${s.median}`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          {s.outlier_count > 0 ? (
                            <span className={isZeroIqr ? 'text-purple-400 font-semibold' : 'text-amber-400 font-semibold'}>
                              {s.outlier_count} {isRTL ? 'مورد' : 'detected'}
                            </span>
                          ) : (
                            <span className="text-neutral-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-neutral-400 max-w-xs truncate" dir="ltr">
                          {s.sample_outliers.length > 0 ? s.sample_outliers.join(', ') : 'None'}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={curAct}
                            onChange={(e) => {
                              const act = e.target.value as any;
                              setOperations((prev) => ({
                                ...prev,
                                outlier_actions: {
                                  ...prev.outlier_actions,
                                  [col.name]: act,
                                },
                              }));
                            }}
                            className="rounded-md border border-neutral-750 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 font-sans"
                          >
                            <option value="keep">
                              {t('outlierKeep')} {isZeroIqr || isTarget ? (isRTL ? '(پیشنهادی)' : '(Recommended)') : ''}
                            </option>
                            <option value="clip">
                              {t('outlierClip')} [{s.lower_bound}, {s.upper_bound}] {isZeroIqr ? (isRTL ? '⚠ پرریسک' : '⚠ High Risk') : ''}
                            </option>
                            <option value="remove">{t('outlierRemove')}</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-950/50 border border-neutral-800 text-xs text-neutral-400 space-y-1">
            <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-blue-400" />
              <span>{isRTL ? 'راهنمای ایمنی داده‌های پرت (Safe Outlier Guidelines):' : 'Safe Outlier Remediation Guidelines:'}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {isRTL
                ? 'ستون‌هایی با IQR=0 (مانند تعداد اتاق): ۵۰٪ مقادیر مرکزی دقیقاً یکسان هستند. روش IQR در این موارد ناتوان است و محدودسازی مقادیر باعث نابودی اطلاعات معتبر می‌شود. در متغیرهای هدف (مانند قیمت)، مقادیر فرین بخشی از توزیع واقعی هستند و نباید بدون بررسی دقیق برش داده شوند.'
                : 'Zero-IQR columns (such as Room where central 50% is identical): The IQR rule cannot distinguish statistical outliers because spread is zero. Automatic clipping destroys legitimate variance. For target variables (such as Price), extreme values are valid distribution tails and should not be modified without explicit investigation.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Data Type Casting */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              {isRTL ? 'تنظیم صریح انواع داده ستون‌ها' : 'Feature Data Type Formatting'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {isRTL
                ? 'تعیین صریح نوع متغیرها برای مدل‌های یادگیری ماشین (مانند تبدیل رشته‌های عددی به float).'
                : 'Enforce explicit typing for machine learning models (e.g. cast string numbers to float or encode booleans).'}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-850 bg-neutral-900/40 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                <tr>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'ویژگی' : 'Feature'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نوع شناسایی‌شده' : 'Detected Type'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نوع تبدیل هدف' : 'Target Cast Type'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {columns.map((col) => {
                  const targetType = operations.type_conversions[col.name] || col.type;

                  return (
                    <tr key={col.name} className="hover:bg-neutral-850/40">
                      <td className="py-3 px-4 font-semibold text-neutral-100 font-mono" dir="ltr">{col.name}</td>
                      <td className="py-3 px-4 text-neutral-400" dir="ltr">{col.type}</td>
                      <td className="py-3 px-4">
                        <select
                          value={targetType}
                          onChange={(e) => {
                            const newType = e.target.value as ColumnType;
                            setOperations((prev) => {
                              const updated = { ...prev.type_conversions };
                              if (newType === col.type) {
                                delete updated[col.name];
                              } else {
                                updated[col.name] = newType;
                              }
                              return { ...prev, type_conversions: updated };
                            });
                          }}
                          className="rounded-md border border-neutral-750 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="string">string</option>
                          <option value="integer">integer</option>
                          <option value="float">float</option>
                          <option value="boolean">boolean</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Drop & Rename Columns */}
      {activeTab === 'columns' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              {isRTL ? 'مدیریت و تغییر نام ستون‌ها' : 'Manage Features & Column Names'}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {isRTL
                ? 'ستون‌های زائد یا خالی را حذف کنید و در صورت نیاز نام‌ها را استانداردسازی نمایید.'
                : 'Select redundant or empty columns to drop, or rename columns to follow clean ML conventions.'}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-850 bg-neutral-900/40 overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                <tr>
                  <th className="py-2.5 px-4 font-medium w-16">{isRTL ? 'حذف' : 'Drop'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نام اولیه' : 'Original Name'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'نام جدید' : 'Rename Feature'}</th>
                  <th className="py-2.5 px-4 font-medium">{isRTL ? 'یادداشت' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {columns.map((col) => {
                  const isDropped = operations.drop_columns.includes(col.name);
                  const renamedVal = operations.rename_columns[col.name] ?? '';

                  return (
                    <tr
                      key={col.name}
                      className={`hover:bg-neutral-850/40 transition-colors ${
                        isDropped ? 'bg-rose-950/10 text-neutral-500 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isDropped}
                          onChange={() => handleToggleDropCol(col.name)}
                          className="rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-100 font-mono" dir="ltr">{col.name}</td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isDropped}
                          value={renamedVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOperations((prev) => {
                              const updated = { ...prev.rename_columns };
                              if (!val.trim()) {
                                delete updated[col.name];
                              } else {
                                updated[col.name] = val.trim();
                              }
                              return { ...prev, rename_columns: updated };
                            });
                          }}
                          placeholder={col.name}
                          className="w-48 rounded border border-neutral-750 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 disabled:opacity-40 font-mono"
                          dir="ltr"
                        />
                      </td>
                      <td className="py-3 px-4 text-xs font-sans text-neutral-400">
                        {col.is_empty ? (
                          <span className="text-rose-400 font-semibold">{isRTL ? 'ستون کاملاً خالی (۱۰۰٪ null)' : 'Empty (100% null)'}</span>
                        ) : col.unique_count === 1 ? (
                          <span className="text-amber-400">{isRTL ? 'واریانس صفر (فقط ۱ مقدار یکتا)' : 'Zero variance (1 unique value)'}</span>
                        ) : (
                          isRTL ? 'فعال' : 'Active'
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

      {/* Tab 6: Row Filtering Rules */}
      {activeTab === 'filters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                {isRTL ? 'فیلتر شرطی رکوردها' : 'Conditional Row Filtering'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {isRTL
                  ? 'حذف داده‌های مخدوش، منفی یا رکوردهای خارج از دامنه قبل از آموزش مدل.'
                  : 'Filter out corrupted, negative, or invalid records before model training.'}
              </p>
            </div>
            <button
              onClick={handleAddFilter}
              className="flex items-center gap-1.5 rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              {isRTL ? 'افزودن شرط فیلتر' : 'Add Filter Rule'}
            </button>
          </div>

          {operations.filter_rules.length > 0 ? (
            <div className="space-y-2.5">
              {operations.filter_rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3 rounded-lg border border-neutral-850 bg-neutral-900/60 flex flex-wrap items-center gap-3 text-xs font-mono"
                >
                  <span className="text-neutral-400">{isRTL ? 'حفظ سطرهایی که:' : 'Keep rows where:'}</span>

                  <select
                    value={rule.column}
                    onChange={(e) => handleUpdateFilter(rule.id, { column: e.target.value })}
                    className="rounded border border-neutral-750 bg-neutral-950 px-2 py-1 text-neutral-200 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  >
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) => handleUpdateFilter(rule.id, { operator: e.target.value as any })}
                    className="rounded border border-neutral-750 bg-neutral-950 px-2 py-1 text-neutral-200 focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  >
                    <option value=">">&gt; (greater than)</option>
                    <option value="<">&lt; (less than)</option>
                    <option value=">=">&gt;= (greater or equal)</option>
                    <option value="<=">&lt;= (less or equal)</option>
                    <option value="==">== (equals)</option>
                    <option value="!=">!= (not equals)</option>
                    <option value="contains">contains string</option>
                  </select>

                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => handleUpdateFilter(rule.id, { value: e.target.value })}
                    placeholder="threshold / value"
                    className="w-32 rounded border border-neutral-750 bg-neutral-950 px-2 py-1 text-neutral-200 focus:outline-none focus:border-blue-500 font-mono"
                    dir="ltr"
                  />

                  <button
                    onClick={() => handleRemoveFilter(rule.id)}
                    className="ml-auto text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-lg border border-dashed border-neutral-800 text-center text-xs text-neutral-400 bg-neutral-900/20">
              {isRTL
                ? 'فیلتری تنظیم نشده است. تمامی رکوردهای سالم حفظ خواهند شد.'
                : 'No row filters configured. All valid rows will be preserved.'}
            </div>
          )}
        </div>
      )}

      {/* Prominent Pending Changes Summary Area */}
      <PendingChangesSummary
        dataset={dataset}
        operations={operations}
        onProceedToReview={handleGeneratePreview}
        onClearOperations={handleResetOperations}
        isGenerating={isGenerating}
      />
    </div>
  );
};
