import React from 'react';
import {
  ArrowRight,
  Database,
  ShieldCheck,
  Wrench,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Sparkles,
  Play,
  Layers,
  Check
} from 'lucide-react';
import { ScreenId } from './Navbar';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { useI18n } from '../i18n/context';

interface LandingPageProps {
  onNavigate: (screen: ScreenId) => void;
  onLoadSample: (sampleId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onLoadSample }) => {
  const { t, isRTL } = useI18n();

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-20 border-b border-neutral-900 bg-radial from-neutral-900/60 via-neutral-950 to-neutral-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-6 text-xs font-mono text-neutral-400 bg-neutral-900/80 border border-neutral-800 rounded-md px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>{t('heroBadge')}</span>
          </div>

          <h1
            className="text-4xl sm:text-6xl font-bold tracking-tight text-neutral-100 max-w-3xl mx-auto leading-tight"
            style={{ textWrap: 'balance' }}
          >
            {t('heroTitle')}{' '}
            <span className="text-blue-500">{t('heroTitleHighlight')}</span>
          </h1>

          <p
            className="mt-5 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed font-sans"
            style={{ textWrap: 'balance' }}
          >
            {t('heroSubtitle')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('upload')}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all hover:shadow-blue-500/20 hover:shadow-md cursor-pointer"
            >
              <span>{t('heroCta')}</span>
              <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => onLoadSample(SAMPLE_DATASETS[0].id)}
              className="flex items-center gap-2 rounded-md bg-neutral-900 border border-neutral-800 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-850 hover:border-neutral-750 transition-colors cursor-pointer"
            >
              <Play className="h-4 w-4 text-emerald-400" />
              <span>{t('heroSecondaryCta')}</span>
            </button>
          </div>

          {/* Social Proof / Claim Adjacency */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-mono text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('featureDeterministic')}</span>
            </span>
            <span className="text-neutral-700 hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('featureOutliers')}</span>
            </span>
            <span className="text-neutral-700 hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t('featureReproducible')}</span>
            </span>
          </div>
        </div>

        {/* Workstation Visual Interactive Preview */}
        <div className="mt-14 mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 shadow-2xl overflow-hidden">
            {/* Window Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <span className="ml-2 text-xs font-mono text-neutral-400" dir="ltr">
                  DataFix Workspace — housing_market_train.csv
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-neutral-400">{t('qualityScore')}:</span>
                <span className="text-emerald-400 font-semibold">96% (Up from 71%)</span>
              </div>
            </div>

            {/* Mock Workspace Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-900/60 text-xs">
              <div className="p-3 rounded border border-neutral-800 bg-neutral-950/60 space-y-1">
                <div className="text-neutral-400 font-mono">{t('missingValuesMetric')}</div>
                <div className="text-lg font-semibold text-neutral-200 font-mono">0 cells</div>
                <div className="text-neutral-400 text-[11px] font-sans">
                  {isRTL ? '۴ خانه خالی با میانه ستون جایگزین شدند' : '4 cells filled with column median'}
                </div>
              </div>
              <div className="p-3 rounded border border-neutral-800 bg-neutral-950/60 space-y-1">
                <div className="text-neutral-400 font-mono">{t('duplicateRowsMetric')}</div>
                <div className="text-lg font-semibold text-neutral-200 font-mono">0 rows</div>
                <div className="text-neutral-400 text-[11px] font-sans">
                  {isRTL ? '۲ سطر کاملاً تکراری حذف شدند' : '2 exact duplicate rows dropped'}
                </div>
              </div>
              <div className="p-3 rounded border border-neutral-800 bg-neutral-950/60 space-y-1">
                <div className="text-neutral-400 font-mono">{isRTL ? 'داده‌های پرت (IQR)' : 'Outliers (IQR)'}</div>
                <div className="text-lg font-semibold text-neutral-200 font-mono">1 remediated</div>
                <div className="text-neutral-400 text-[11px] font-sans">
                  {isRTL ? 'محدودسازی داده‌های پرت به مرز بالا' : 'Clipped extreme value to upper bound'}
                </div>
              </div>
            </div>

            {/* Table Preview */}
            <div className="overflow-x-auto border-t border-neutral-800">
              <table className="w-full text-left text-xs font-mono" dir="ltr">
                <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">sqft_living</th>
                    <th className="py-2 px-3">bedrooms</th>
                    <th className="py-2 px-3">bathrooms</th>
                    <th className="py-2 px-3">price</th>
                    <th className="py-2 px-3">status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 text-neutral-300">
                  <tr className="hover:bg-neutral-850/50">
                    <td className="py-2 px-3 text-neutral-400">101</td>
                    <td className="py-2 px-3">1850</td>
                    <td className="py-2 px-3">3</td>
                    <td className="py-2 px-3">2.0</td>
                    <td className="py-2 px-3 tabular-nums">$425,000</td>
                    <td className="py-2 px-3 text-emerald-400">Clean</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50 bg-blue-950/10">
                    <td className="py-2 px-3 text-neutral-400">106</td>
                    <td className="py-2 px-3">1420</td>
                    <td className="py-2 px-3 font-semibold text-emerald-400">
                      3.0 <span className="text-[10px] text-neutral-400">(imputed)</span>
                    </td>
                    <td className="py-2 px-3">1.5</td>
                    <td className="py-2 px-3 tabular-nums">$310,000</td>
                    <td className="py-2 px-3 text-emerald-400">Resolved</td>
                  </tr>
                  <tr className="hover:bg-neutral-850/50 bg-blue-950/10">
                    <td className="py-2 px-3 text-neutral-400">112</td>
                    <td className="py-2 px-3">2100</td>
                    <td className="py-2 px-3">4</td>
                    <td className="py-2 px-3">2.5</td>
                    <td className="py-2 px-3 tabular-nums text-amber-400">
                      $780,000 <span className="text-[10px] text-neutral-400">(clipped)</span>
                    </td>
                    <td className="py-2 px-3 text-emerald-400">Resolved</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 6-Step Workflow Section */}
      <section className="py-16 border-b border-neutral-900 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-wider">
              {t('stepWorkflowBadge')}
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
              {t('stepWorkflowTitle')}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              {t('stepWorkflowSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                step: '01',
                title: t('stepUpload'),
                desc: isRTL ? 'بارگذاری آسان فایل‌های CSV بدون محدودیت ساختار' : 'Upload real CSV tabular datasets seamlessly.',
              },
              {
                step: '02',
                title: t('stepInspect'),
                desc: isRTL ? 'مشاهده ابعاد، آمار توصیفی و نوع متغیرها' : 'Audit schemas, dimensions, and distributions.',
              },
              {
                step: '03',
                title: t('stepQuality'),
                desc: isRTL ? 'محاسبه امتیاز کیفیت و کشف عیوب ساختاری' : 'Deterministic score evaluating data defects.',
              },
              {
                step: '04',
                title: t('stepClean'),
                desc: isRTL ? 'اعمال جایگزینی مقادیر خالی، حذف تکراری و فیلتر' : 'Configure median/mode imputation & clipping.',
              },
              {
                step: '05',
                title: t('stepReview'),
                desc: isRTL ? 'بررسی تفاضلی سلول‌به‌سلول قبل از اعمال نهایی' : 'Inspect cell-level before/after differences.',
              },
              {
                step: '06',
                title: t('stepExport'),
                desc: isRTL ? 'دریافت CSV تمیز و کدهای پایتون قابل بازتولید' : 'Download clean CSV and Python pandas scripts.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/40 space-y-2"
              >
                <div className="text-xs font-mono text-blue-400 font-semibold">{item.step}</div>
                <h3 className="text-sm font-semibold text-neutral-200">{item.title}</h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Clean Data Matters For ML */}
      <section className="py-16 bg-neutral-950 border-b border-neutral-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-mono text-blue-400 uppercase tracking-wider">
              {isRTL ? 'چرا پاک‌سازی داده اهمیت دارد؟' : 'Why Clean Data Matters'}
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-100">
              {isRTL ? 'جلوگیری از خطاهای مهلک در آموزش مدل‌ها' : 'Prevent Catastrophic Failures in Machine Learning'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-900/40 space-y-2">
              <div className="text-amber-400 font-mono font-semibold">
                {isRTL ? 'نشت داده (Data Leakage)' : 'Train-Test Data Leakage'}
              </div>
              <p className="text-neutral-400 leading-relaxed font-sans">
                {isRTL
                  ? 'وجود سطرهای تکراری در دیتاست باعث ورود نمونه‌های یکسان به مجموعه‌های آموزش و آزمون می‌شود و نتایج اعتبارسنجی را به شدت غیرواقعی می‌کند.'
                  : 'Duplicate rows spanning training and test splits artificially inflate cross-validation metrics, resulting in models that fail in production.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-900/40 space-y-2">
              <div className="text-amber-400 font-mono font-semibold">
                {isRTL ? 'ناپایداری گرادیان در داده‌های پرت' : 'Gradient Destabilization'}
              </div>
              <p className="text-neutral-400 leading-relaxed font-sans">
                {isRTL
                  ? 'مقادیر فرین و پرت باعث ایجاد گرادیان‌های بسیار بزرگ در رگرسیون و شبکه‌های عصبی شده و همگرایی مدل را به تأخیر می‌اندازد.'
                  : 'Extreme outliers exert massive leverage on gradient-based estimators, slowing convergence and biasing regression decision boundaries.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-neutral-850 bg-neutral-900/40 space-y-2">
              <div className="text-amber-400 font-mono font-semibold">
                {isRTL ? 'خطاهای NaN در Scikit-Learn' : 'NaN Errors in Scikit-Learn'}
              </div>
              <p className="text-neutral-400 leading-relaxed font-sans">
                {isRTL
                  ? 'بسیاری از الگوریتم‌های استاندارد یادگیری ماشین قادر به پردازش مقادیر خالی نیستند و با خطای توقف اجرا مواجه می‌شوند.'
                  : 'Most classical algorithms (SVM, KNN, Logistic Regression) throw immediate exceptions when encountering unhandled missing/null values.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-16 bg-neutral-900/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
            {isRTL ? 'هم‌اکنون دیتاست خود را بررسی کنید' : 'Ready to inspect and prepare your dataset?'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto font-sans">
            {isRTL
              ? 'دیتاست CSV خود را بارگذاری کنید یا با نمونه‌های آماده کار با ابزار را تجربه کنید.'
              : 'Start by uploading any CSV file or try our curated sample datasets.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('upload')}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
            >
              <span>{t('heroCta')}</span>
              <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
