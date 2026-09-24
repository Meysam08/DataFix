import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Wrench,
  HelpCircle,
  ArrowRight,
  TrendingDown,
  Layers,
  Hash,
  Copy,
  Sparkles,
  Check,
  Info
} from 'lucide-react';
import { ActiveDataset, CleaningOperations } from '../types/dataset';
import { ScreenId } from './Navbar';
import { useI18n } from '../i18n/context';
import {
  getActionableRecommendations,
  applyAllRecommendations,
  getDefaultOperations
} from '../utils/recommendations';

interface QualityAnalysisViewProps {
  dataset: ActiveDataset;
  onNavigate: (screen: ScreenId) => void;
  onUpdateOperations?: (operations: CleaningOperations) => void;
}

export const QualityAnalysisView: React.FC<QualityAnalysisViewProps> = ({
  dataset,
  onNavigate,
  onUpdateOperations,
}) => {
  const { t, isRTL } = useI18n();
  const { analysis } = dataset;
  const {
    quality_score,
    score_breakdown,
    missing_values,
    missing_pct,
    duplicate_rows,
    duplicate_pct,
    detected_issues,
    columns,
    rows
  } = analysis;

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'problems' | 'recommendations'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const currentOps = dataset.operations || getDefaultOperations(analysis);
  const recommendations = getActionableRecommendations(analysis);

  const emptyCols = columns.filter((c) => c.is_empty);
  const totalOutliers = columns.reduce((acc, c) => acc + (c.stats?.outlier_count || 0), 0);
  const colsWithMissing = columns.filter((c) => c.missing_count > 0);

  // Apply single recommendation
  const handleApplySingle = (recId: string) => {
    const rec = recommendations.find((r) => r.id === recId);
    if (!rec) return;

    const newOps = rec.apply(currentOps);
    if (onUpdateOperations) {
      onUpdateOperations(newOps);
    }
    setFeedbackMsg(
      isRTL ? `توصیه با موفقیت به صف تغییرات افزوده شد.` : `Recommendation added to pending changes pipeline.`
    );
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Apply all recommendations
  const handleApplyAll = () => {
    const newOps = applyAllRecommendations(currentOps, analysis);
    if (onUpdateOperations) {
      onUpdateOperations(newOps);
    }
    setFeedbackMsg(
      isRTL
        ? `تمام توصیه‌های استاندارد یادگیری ماشین (${recommendations.length} مورد) در صف قرار گرفتند.`
        : `All ${recommendations.length} machine learning best-practice recommendations configured in pipeline!`
    );
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-850 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span>{t('qualityAuditBreadcrumb')}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-200">{dataset.filename}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-100">
            {t('qualityTitle')}
          </h1>
          <p className="mt-1 text-xs text-neutral-400">
            {t('qualitySubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleApplyAll}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('applyAllRecommendationsBtn')}</span>
          </button>

          <button
            onClick={() => onNavigate('cleaning')}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Wrench className="h-4 w-4" />
            <span>{t('cleaning')}</span>
            <ArrowRight className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => onNavigate('cleaning')}
            className="text-xs font-semibold text-emerald-200 underline hover:text-white cursor-pointer"
          >
            {isRTL ? 'مشاهده در میز کار' : 'Open Workspace'}
          </button>
        </div>
      )}

      {/* Quality Score Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-neutral-850 bg-neutral-900/80 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono text-neutral-400">{t('scoreHeroTitle')}</div>
            <div className="mt-4 flex items-baseline gap-3">
              <span
                className={`text-5xl font-extrabold font-mono tracking-tight tabular-nums ${
                  quality_score >= 80
                    ? 'text-emerald-400'
                    : quality_score >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {quality_score}%
              </span>
              <span className="text-xs font-mono text-neutral-400">{t('benchmark')}</span>
            </div>

            <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
              {quality_score >= 80
                ? t('scoreGood')
                : quality_score >= 60
                ? t('scoreMedium')
                : t('scorePoor')}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>{isRTL ? 'ارزیابی بر مبنای قوانین قطعی آماری' : 'Deterministic evaluation · Zero AI guesswork'}</span>
            <span className="text-emerald-400 font-semibold">
              +{100 - quality_score} {isRTL ? 'امتیاز قابل بازیابی' : 'pts recoverable'}
            </span>
          </div>
        </div>

        {/* Score Deductions Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-neutral-850 bg-neutral-900/60 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-semibold text-neutral-200">
              {t('deductionsTitle')}
            </h2>
            <span className="text-xs font-mono text-neutral-400">{t('deductionBase')}</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">
                {t('missingPenalty')} ({missing_pct}% {isRTL ? 'مجموع سلول‌ها' : 'total missingness'})
              </span>
              <span className={score_breakdown.missing_penalty > 0 ? 'text-rose-400 font-semibold tabular-nums' : 'text-emerald-400 tabular-nums'}>
                -{score_breakdown.missing_penalty} pts
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-300">
                {t('dupPenalty')} ({duplicate_rows} {isRTL ? 'ردیف' : 'duplicates'})
              </span>
              <span className={score_breakdown.duplicate_penalty > 0 ? 'text-rose-400 font-semibold tabular-nums' : 'text-emerald-400 tabular-nums'}>
                -{score_breakdown.duplicate_penalty} pts
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-300">
                {t('emptyColPenalty')} ({emptyCols.length} {isRTL ? 'ستون' : 'empty features'})
              </span>
              <span className={score_breakdown.empty_col_penalty > 0 ? 'text-rose-400 font-semibold tabular-nums' : 'text-emerald-400 tabular-nums'}>
                -{score_breakdown.empty_col_penalty} pts
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-300">{t('typePenalty')}</span>
              <span className={score_breakdown.type_penalty > 0 ? 'text-rose-400 font-semibold tabular-nums' : 'text-emerald-400 tabular-nums'}>
                -{score_breakdown.type_penalty} pts
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-300">{t('outlierPenalty')}</span>
              <span className={score_breakdown.outlier_penalty > 0 ? 'text-amber-400 font-semibold tabular-nums' : 'text-emerald-400 tabular-nums'}>
                -{score_breakdown.outlier_penalty} pts
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>
              {isRTL
                ? 'با اعمال توصیه‌های این بخش، امتیاز کیفیت دیتاست افزایش می‌یابد.'
                : 'Applying recommended operations will recover lost points before ML training.'}
            </span>
            <button
              onClick={handleApplyAll}
              className="text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              {isRTL ? 'اعمال یک‌جای همه توصیه‌ها' : 'Auto-apply best practices'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Diagnosis Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>{t('missingValuesMetric')}</span>
            <AlertTriangle className={`h-4 w-4 ${missing_values > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {missing_values}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {missing_pct}% {isRTL ? 'از کل سلول‌ها در' : 'of total cells across'} {colsWithMissing.length} {isRTL ? 'ستون' : 'column(s)'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>{t('duplicateRowsMetric')}</span>
            <Copy className={`h-4 w-4 ${duplicate_rows > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {duplicate_rows}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {duplicate_pct}% {isRTL ? 'از کل' : 'of'} {rows} {isRTL ? 'سطر تکراری هستند' : 'rows are redundant'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>{isRTL ? 'داده‌های پرت (IQR)' : 'Potential Outliers (IQR)'}</span>
            <Hash className={`h-4 w-4 ${totalOutliers > 0 ? 'text-blue-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {totalOutliers}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            {isRTL ? 'خارج از مرزهای ۱.۵×IQR چارک‌ها' : 'Outside standard 1.5× IQR bounds'}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/60">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>{isRTL ? 'ستون‌های کاملاً خالی' : 'Empty Features'}</span>
            <Layers className={`h-4 w-4 ${emptyCols.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {emptyCols.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 truncate">
            {emptyCols.length > 0
              ? emptyCols.map((c) => c.name).join(', ')
              : isRTL ? 'تمام ستون‌ها دارای داده هستند' : 'All features have values'}
          </div>
        </div>
      </div>

      {/* Tabs to switch between: Both, Detected Problems, or Actionable Recommendations */}
      <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeSubTab === 'all'
              ? 'bg-neutral-850 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          {isRTL ? 'همه موارد' : 'All Overview'}
        </button>
        <button
          onClick={() => setActiveSubTab('problems')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeSubTab === 'problems'
              ? 'bg-neutral-850 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
          <span>{t('problemsSectionTitle')} ({detected_issues.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('recommendations')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            activeSubTab === 'recommendations'
              ? 'bg-neutral-850 text-white shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>{t('recommendationsSectionTitle')} ({recommendations.length})</span>
        </button>
      </div>

      {/* SECTION 1: DETECTED PROBLEMS (clearly distinguishes problems) */}
      {(activeSubTab === 'all' || activeSubTab === 'problems') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>{t('problemsSectionTitle')} ({detected_issues.length})</span>
            </h2>
            <span className="text-xs font-mono text-neutral-400">
              {isRTL ? 'اولویت‌بندی شده بر اساس شدت آسیب به مدل' : 'Prioritized by ML Impact'}
            </span>
          </div>

          <div className="space-y-2.5">
            {detected_issues.map((issue, idx) => {
              const isHigh = issue.severity === 'high';
              const isMedium = issue.severity === 'medium';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isHigh
                      ? 'border-rose-900/60 bg-rose-950/20'
                      : isMedium
                      ? 'border-amber-900/60 bg-amber-950/20'
                      : 'border-neutral-850 bg-neutral-900/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isHigh ? (
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : isMedium ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <HelpCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-neutral-100">
                          {issue.title}
                        </span>
                        {issue.column && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300" dir="ltr">
                            {issue.column}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                            isHigh
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : isMedium
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span className="text-xs font-mono text-neutral-400 hidden lg:inline">
                      {issue.recommendation}
                    </span>
                    <button
                      onClick={() => onNavigate('cleaning')}
                      className="flex items-center gap-1 rounded bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
                    >
                      <span>{isRTL ? 'حل در میز کار' : 'Fix in Workspace'}</span>
                      <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: ACTIONABLE RECOMMENDATIONS (clearly explains WHY and offers 1-click apply) */}
      {(activeSubTab === 'all' || activeSubTab === 'recommendations') && (
        <div className="space-y-4 pt-4 border-t border-neutral-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>{t('recommendationsSectionTitle')}</span>
              </h2>
              <p className="text-xs text-neutral-400">
                {isRTL
                  ? 'تمامی توصیه‌ها با توضیح علت تأثیر بر مدل یادگیری ماشین و قابلیت اعمال تک‌کلیک ارائه شده‌اند.'
                  : 'Every recommendation includes an ML rationale and direct 1-click pipeline configuration.'}
              </p>
            </div>

            <button
              onClick={handleApplyAll}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('applyAllRecommendationsBtn')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
              const applied = rec.isApplied(currentOps);

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    applied
                      ? 'border-emerald-800/60 bg-emerald-950/20'
                      : 'border-neutral-850 bg-neutral-900/50 hover:border-neutral-750'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header line with badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-mono">
                          ★
                        </span>
                        <h3 className="text-sm font-semibold text-neutral-100">
                          {isRTL ? rec.titleFa : rec.titleEn}
                        </h3>
                      </div>

                      {applied && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-semibold shrink-0">
                          <Check className="h-3 w-3" />
                          {t('appliedBadge')}
                        </span>
                      )}
                    </div>

                    {/* Explanatory "Why" Box */}
                    <div className="rounded-lg bg-neutral-950/60 border border-neutral-850 p-2.5 space-y-1">
                      <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1">
                        <Info className="h-3 w-3 text-blue-400" />
                        <span>{t('whyTitle')}</span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        {isRTL ? rec.whyFa : rec.whyEn}
                      </p>
                    </div>
                  </div>

                  {/* Footer & Apply Action */}
                  <div className="mt-4 pt-3 border-t border-neutral-850/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-semibold">
                      +{rec.impactScoreRecovery} {isRTL ? 'امتیاز بهبود' : 'pts impact'}
                    </span>

                    <button
                      onClick={() => handleApplySingle(rec.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        applied
                          ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      }`}
                    >
                      {applied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{isRTL ? 'تنظیم‌شده' : 'Configured'}</span>
                        </>
                      ) : (
                        <>
                          <span>{t('applyRecommendationBtn')}</span>
                          <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature-by-Feature Data Hygiene Breakdown */}
      <div className="space-y-3 pt-4 border-t border-neutral-850">
        <h2 className="text-base font-semibold text-neutral-100">
          {isRTL ? 'ماتریس سلامت ویژگی‌های دیتاست' : 'Feature-by-Feature Data Hygiene Breakdown'}
        </h2>

        <div className="rounded-lg border border-neutral-850 bg-neutral-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono" dir="ltr">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-850">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Feature</th>
                  <th className="py-2.5 px-4 font-medium">Inferred Type</th>
                  <th className="py-2.5 px-4 font-medium">Missing</th>
                  <th className="py-2.5 px-4 font-medium">Unique Values</th>
                  <th className="py-2.5 px-4 font-medium">Outliers (1.5× IQR)</th>
                  <th className="py-2.5 px-4 font-medium">Best Practice Fix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                {columns.map((col) => {
                  const s = col.stats;
                  return (
                    <tr key={col.name} className="hover:bg-neutral-850/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-100">{col.name}</td>
                      <td className="py-3 px-4 text-neutral-400">{col.type}</td>
                      <td className="py-3 px-4 tabular-nums">
                        {col.missing_count > 0 ? (
                          <span className={col.missing_pct > 20 ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
                            {col.missing_count} ({col.missing_pct}%)
                          </span>
                        ) : (
                          <span className="text-neutral-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-neutral-400">
                        {col.unique_count} ({col.unique_pct}%)
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        {s && s.outlier_count > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            {s.outlier_count} in [{s.lower_bound}, {s.upper_bound}]
                          </span>
                        ) : (
                          <span className="text-neutral-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-neutral-300 text-xs">
                        {col.is_empty ? (
                          <span className="text-rose-400 font-semibold">
                            {isRTL ? 'حذف ستون (کاملاً خالی)' : 'Drop Column (100% missing)'}
                          </span>
                        ) : col.missing_count > 0 ? (
                          col.type === 'integer' || col.type === 'float' ? (
                            <span>{isRTL ? 'جایگزینی با میانه (پایدار در برابر مقادیر پرت)' : 'Impute with Median (Robust)'}</span>
                          ) : (
                            <span>{isRTL ? 'جایگزینی با مد (پرتکرارترین دسته)' : 'Impute with Mode (Preserves Distribution)'}</span>
                          )
                        ) : s && s.outlier_count > 0 ? (
                          <span>{isRTL ? 'محدودسازی به مرزهای Tukey IQR' : 'Clip to Tukey IQR Boundary'}</span>
                        ) : (
                          <span className="text-emerald-400">{isRTL ? 'سالم و بدون نیاز به اصلاح' : 'No action needed'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
