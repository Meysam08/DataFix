/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, ScreenId } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { DatasetOverviewView } from './components/DatasetOverviewView';
import { QualityAnalysisView } from './components/QualityAnalysisView';
import { CleaningWorkspaceView } from './components/CleaningWorkspaceView';
import { ReviewChangesView } from './components/ReviewChangesView';
import { ExportView } from './components/ExportView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { WorkflowStepper } from './components/WorkflowStepper';
import { ActiveDataset, CleaningOperations, TransformPreviewResult } from './types/dataset';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import { executeDatasetAnalysis, executePreviewTransform } from './utils/engine';
import { getDefaultOperations } from './utils/recommendations';
import { useI18n } from './i18n/context';

export default function App() {
  const { isRTL } = useI18n();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('landing');
  const [datasets, setDatasets] = useState<ActiveDataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  // Active dataset accessor
  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || null;

  // Handle loading a sample dataset
  const handleLoadSample = async (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId) || SAMPLE_DATASETS[0];

    try {
      const analysis = await executeDatasetAnalysis(sample.csv);
      const defaultOps = getDefaultOperations(analysis);
      const newDataset: ActiveDataset = {
        id: `sample-${sample.id}-${Date.now()}`,
        name: sample.name,
        filename: sample.filename,
        rawCsv: sample.csv,
        fileSizeBytes: sample.csv.length,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        analysis,
        operations: defaultOps,
      };

      setDatasets((prev) => [newDataset, ...prev.filter((d) => d.id !== newDataset.id)]);
      setActiveDatasetId(newDataset.id);
      setCurrentScreen('overview');
    } catch (err) {
      console.error('Failed to load sample dataset:', err);
    }
  };

  // Handle user uploaded dataset
  const handleDatasetLoaded = (newDataset: ActiveDataset) => {
    const initialOps = getDefaultOperations(newDataset.analysis);
    const enrichedDataset: ActiveDataset = {
      ...newDataset,
      operations: initialOps,
    };
    setDatasets((prev) => [enrichedDataset, ...prev.filter((d) => d.id !== enrichedDataset.id)]);
    setActiveDatasetId(enrichedDataset.id);
    setCurrentScreen('overview');
  };

  // Handle operation updates from Quality or Workspace views
  const handleUpdateOperations = (ops: CleaningOperations) => {
    if (!activeDatasetId) return;

    setDatasets((prev) =>
      prev.map((d) =>
        d.id === activeDatasetId
          ? {
              ...d,
              operations: ops,
            }
          : d
      )
    );
  };

  // Handle preview generated in Cleaning Workspace
  const handlePreviewGenerated = (previewResult: TransformPreviewResult, operations: CleaningOperations) => {
    if (!activeDatasetId) return;

    setDatasets((prev) =>
      prev.map((d) =>
        d.id === activeDatasetId
          ? {
              ...d,
              currentTransform: previewResult,
              operations,
            }
          : d
      )
    );
  };

  // Handle final apply transformations
  const handleApplyComplete = (appliedData: {
    cleanedCsv: string;
    newAnalysis: any;
    appliedOperations: string[];
    pythonCode: string;
  }) => {
    if (!activeDatasetId) return;

    setDatasets((prev) =>
      prev.map((d) => {
        if (d.id === activeDatasetId) {
          return {
            ...d,
            cleanedCsv: appliedData.cleanedCsv,
            currentTransform: d.currentTransform
              ? {
                  ...d.currentTransform,
                  new_analysis: appliedData.newAnalysis,
                  new_quality_score: appliedData.newAnalysis.quality_score,
                  applied_operations: appliedData.appliedOperations,
                  python_code: appliedData.pythonCode,
                }
              : undefined,
          };
        }
        return d;
      })
    );
  };

  // Handle delete dataset
  const handleDeleteDataset = (id: string) => {
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    if (activeDatasetId === id) {
      setActiveDatasetId(null);
      setCurrentScreen('dashboard');
    }
  };

  // Reset / start fresh
  const handleReset = () => {
    setActiveDatasetId(null);
    setCurrentScreen('dashboard');
  };

  // Check if current screen is part of the dataset workflow
  const isWorkflowScreen =
    activeDataset !== null &&
    ['overview', 'quality', 'cleaning', 'review', 'export'].includes(currentScreen);

  return (
    <div
      className={`min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col ${
        isRTL ? 'rtl' : 'ltr'
      }`}
    >
      {/* Top Navbar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeDataset={activeDataset}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      {/* Visual Workflow Stepper shown during active dataset processing */}
      {isWorkflowScreen && (
        <WorkflowStepper
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          activeDataset={activeDataset}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1 pb-16">
        {currentScreen === 'landing' && (
          <LandingPage
            onNavigate={setCurrentScreen}
            onLoadSample={handleLoadSample}
          />
        )}

        {currentScreen === 'dashboard' && (
          <DashboardView
            datasets={datasets}
            activeDataset={activeDataset}
            onSelectDataset={(d) => {
              setActiveDatasetId(d.id);
            }}
            onNavigate={setCurrentScreen}
            onLoadSample={handleLoadSample}
            onDeleteDataset={handleDeleteDataset}
          />
        )}

        {currentScreen === 'upload' && (
          <UploadView
            onDatasetLoaded={handleDatasetLoaded}
            onLoadSample={handleLoadSample}
          />
        )}

        {currentScreen === 'overview' && activeDataset && (
          <DatasetOverviewView
            dataset={activeDataset}
            onNavigate={setCurrentScreen}
          />
        )}

        {currentScreen === 'quality' && activeDataset && (
          <QualityAnalysisView
            dataset={activeDataset}
            onNavigate={setCurrentScreen}
            onUpdateOperations={handleUpdateOperations}
          />
        )}

        {currentScreen === 'cleaning' && activeDataset && (
          <CleaningWorkspaceView
            dataset={activeDataset}
            onNavigate={setCurrentScreen}
            onPreviewGenerated={handlePreviewGenerated}
            onUpdateOperations={handleUpdateOperations}
          />
        )}

        {currentScreen === 'review' && activeDataset && (
          <ReviewChangesView
            dataset={activeDataset}
            transformResult={
              activeDataset.currentTransform || {
                status: 'success',
                original_rows: activeDataset.analysis.rows,
                original_columns: activeDataset.analysis.columns.length,
                new_rows: activeDataset.analysis.rows,
                new_columns: activeDataset.analysis.columns.length,
                rows_removed: 0,
                columns_removed: 0,
                applied_operations: [],
                warnings: [],
                diff_samples: [],
                new_quality_score: activeDataset.analysis.quality_score,
                new_analysis: activeDataset.analysis,
                python_code: '# Raw dataset (no operations applied)',
                preview_rows: [],
                new_headers: activeDataset.analysis.columns.map((c) => c.name),
              }
            }
            operations={activeDataset.operations || getDefaultOperations(activeDataset.analysis)}
            onNavigate={setCurrentScreen}
            onApplyComplete={handleApplyComplete}
          />
        )}

        {currentScreen === 'export' && activeDataset && (
          <ExportView
            dataset={activeDataset}
            onNavigate={setCurrentScreen}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Architecture Blueprint Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Persistent Technical Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 px-6 text-xs font-mono text-neutral-400">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">DataFix</span>
            <span>·</span>
            <span>
              {isRTL
                ? 'پلتفرم قطعی و دقیق پیش‌پردازش دیتاست‌های یادگیری ماشین'
                : 'Deterministic ML Dataset Preprocessing Platform'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Statistical 1.5× IQR Engine</span>
            <span>·</span>
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              Laravel + Python Blueprint
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
