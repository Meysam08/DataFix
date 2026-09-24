import React from 'react';
import {
  UploadCloud,
  FileSearch,
  ShieldAlert,
  Wrench,
  CheckCheck,
  Download,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { ActiveDataset } from '../types/dataset';
import { ScreenId } from './Navbar';
import { useI18n } from '../i18n/context';

interface WorkflowStepperProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  activeDataset: ActiveDataset;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentScreen,
  onNavigate,
  activeDataset,
}) => {
  const { t, isRTL } = useI18n();

  const { analysis } = activeDataset;
  const issuesCount = analysis.detected_issues.length;
  const pendingCount = activeDataset.operations
    ? (activeDataset.operations.remove_duplicates ? 1 : 0) +
      (activeDataset.operations.missing_actions.global === 'drop_rows' ? 1 : 0) +
      Object.keys(activeDataset.operations.missing_actions.columns).length +
      Object.keys(activeDataset.operations.type_conversions).length +
      activeDataset.operations.drop_columns.length +
      Object.keys(activeDataset.operations.rename_columns).length +
      activeDataset.operations.filter_rules.length +
      Object.values(activeDataset.operations.outlier_actions).filter((a) => a !== 'keep').length
    : 0;

  const steps: {
    id: ScreenId;
    labelKey: 'stepUpload' | 'stepInspect' | 'stepQuality' | 'stepClean' | 'stepReview' | 'stepExport';
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'upload',
      labelKey: 'stepUpload',
      icon: UploadCloud,
    },
    {
      id: 'overview',
      labelKey: 'stepInspect',
      icon: FileSearch,
    },
    {
      id: 'quality',
      labelKey: 'stepQuality',
      icon: ShieldAlert,
      badge: issuesCount > 0 ? issuesCount : undefined,
      badgeColor: issuesCount > 0 ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : undefined,
    },
    {
      id: 'cleaning',
      labelKey: 'stepClean',
      icon: Wrench,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: pendingCount > 0 ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60' : undefined,
    },
    {
      id: 'review',
      labelKey: 'stepReview',
      icon: CheckCheck,
    },
    {
      id: 'export',
      labelKey: 'stepExport',
      icon: Download,
    },
  ];

  const currentIdx = steps.findIndex((s) => s.id === currentScreen);
  const SeparatorIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="w-full border-b border-neutral-900 bg-neutral-950/95 py-2.5 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Stepper links */}
        <nav aria-label="Workflow progress" className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {steps.map((step, idx) => {
            const isActive = currentScreen === step.id;
            const isCompleted = currentIdx > idx;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onNavigate(step.id)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/40 shadow-xs'
                      : isCompleted
                      ? 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : 'bg-neutral-850 text-neutral-400'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <StepIcon
                    className={`h-3.5 w-3.5 ${
                      isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  />

                  <span>{t(step.labelKey)}</span>

                  {step.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                        step.badgeColor || 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {step.badge}
                    </span>
                  )}
                </button>

                {idx < steps.length - 1 && (
                  <SeparatorIcon className="h-3 w-3 text-neutral-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Dataset Quick Glance Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="text-neutral-300 font-semibold truncate max-w-[160px]">
              {activeDataset.filename}
            </span>
            <span className="text-neutral-700">·</span>
            <span>
              {analysis.rows} {t('rows')}
            </span>
            <span className="text-neutral-700">·</span>
            <span>
              {analysis.columns.length} {t('columns')}
            </span>
          </div>

          <div
            className={`px-2 py-0.5 rounded text-xs font-semibold ${
              analysis.quality_score >= 80
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                : analysis.quality_score >= 60
                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
            }`}
          >
            {t('qualityScore')}: {analysis.quality_score}%
          </div>
        </div>
      </div>
    </div>
  );
};
