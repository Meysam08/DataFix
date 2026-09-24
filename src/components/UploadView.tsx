import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Play,
  FileText,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { executeDatasetAnalysis } from '../utils/engine';
import { ActiveDataset } from '../types/dataset';
import { useI18n } from '../i18n/context';

interface UploadViewProps {
  onDatasetLoaded: (dataset: ActiveDataset) => void;
  onLoadSample: (sampleId: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onDatasetLoaded, onLoadSample }) => {
  const { t, isRTL } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [pastedName, setPastedName] = useState('pasted_dataset.csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCsvString = async (csvContent: string, filename: string, sizeBytes: number) => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (!csvContent.trim()) {
        throw new Error(
          isRTL
            ? 'فایل بارگذاری‌شده خالی است. لطفاً یک دیتاست CSV معتبر دارای هدر انتخاب نمایید.'
            : 'The uploaded file is empty. Please provide a valid CSV dataset with headers.'
        );
      }

      const analysis = await executeDatasetAnalysis(csvContent);

      if (analysis.rows === 0) {
        throw new Error(
          isRTL
            ? 'هیچ سطری در فایل CSV یافت نشد. اطمینان حاصل کنید فایل شامل حداقل یک سطر عناوین و یک سطر داده است.'
            : 'No data rows found in CSV. Make sure the file contains at least one header row and one data row.'
        );
      }

      const newDataset: ActiveDataset = {
        id: `ds-${Date.now()}`,
        name: filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        filename,
        rawCsv: csvContent,
        fileSizeBytes: sizeBytes || csvContent.length,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        analysis,
      };

      onDatasetLoaded(newDataset);
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (isRTL ? 'خطا در تجزیه و تحلیل ساختار دیتاست CSV.' : 'Failed to parse and analyze CSV dataset.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setErrorMessage(
        isRTL ? 'لطفاً یک فایل CSV، TSV یا TXT معتبر بارگذاری کنید.' : 'Please upload a valid CSV, TSV, or TXT file.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCsvString(content, file.name, file.size);
    };
    reader.onerror = () => {
      setErrorMessage(isRTL ? 'خواندن فایل با شکست مواجه شد.' : 'Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setErrorMessage(
        isRTL ? 'لطفاً یک فایل CSV، TSV یا TXT معتبر رها کنید.' : 'Please drop a valid CSV, TSV, or TXT file.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCsvString(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setErrorMessage(
        isRTL ? 'لطفاً متن داده‌های CSV را در کادر وارد نمایید.' : 'Please paste CSV text into the textarea.'
      );
      return;
    }
    processCsvString(pastedText, pastedName || 'pasted_dataset.csv', pastedText.length);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-8">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
          {t('uploadTitle')}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          {t('uploadSubtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-neutral-900 border border-neutral-800 p-1">
          <button
            onClick={() => {
              setActiveTab('upload');
              setErrorMessage(null);
            }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'upload' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('tabFileUpload')}
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setErrorMessage(null);
            }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'paste' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('tabPaste')}
          </button>
          <button
            onClick={() => {
              setActiveTab('samples');
              setErrorMessage(null);
            }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'samples' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t('tabSamples')}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 rounded-md border border-rose-900/60 bg-rose-950/40 text-rose-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">{isRTL ? 'خطای اعتبارسنجی فایل' : 'Dataset Parsing Notice'}</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isProcessing && (
        <div className="p-8 rounded-lg border border-neutral-800 bg-neutral-900/80 text-center space-y-3">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <div className="text-sm font-semibold text-neutral-200">
            {t('processingAnalysis')}
          </div>
          <p className="text-xs font-mono text-neutral-400">
            {t('processingSub')}
          </p>
        </div>
      )}

      {/* Tab 1: Drag & Drop Zone */}
      {!isProcessing && activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-950/20'
              : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.tsv,.txt"
            className="hidden"
          />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-850 group-hover:bg-blue-600/20 transition-colors">
            <Upload className="h-6 w-6 text-neutral-300 group-hover:text-blue-400 transition-colors" />
          </div>

          <h3 className="mt-4 text-base font-semibold text-neutral-200">
            {t('dragDropTitle')}
          </h3>
          <p className="mt-1 text-xs text-neutral-400">
            {isRTL ? 'یا فایل را از سیستم خود ' : 'or '}
            <span className="text-blue-400 underline font-medium">
              {isRTL ? 'انتخاب کنید' : 'browse files'}
            </span>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-neutral-400">
            <span>Supports .csv, .tsv, .txt</span>
            <span className="text-neutral-700">·</span>
            <span>Up to 50MB</span>
            <span className="text-neutral-700">·</span>
            <span>Automatic Delimiter Detection</span>
          </div>
        </div>
      )}

      {/* Tab 2: Paste CSV */}
      {!isProcessing && activeTab === 'paste' && (
        <form onSubmit={handlePasteSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-300">
              {isRTL ? 'نام فایل دیتاست' : 'Dataset File Name'}
            </label>
            <input
              type="text"
              value={pastedName}
              onChange={(e) => setPastedName(e.target.value)}
              placeholder="my_dataset.csv"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-blue-500"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-300">
              {isRTL ? 'متن خام CSV همراه با سطر عناوین (Headers)' : 'Raw CSV Text (with headers)'}
            </label>
            <textarea
              rows={10}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="id,feature_1,feature_2,target&#10;1,42.5,CategoryA,0&#10;2,18.0,,1&#10;3,999.0,CategoryB,0"
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-blue-500"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer"
          >
            {t('parseAndInspectBtn')}
          </button>
        </form>
      )}

      {/* Tab 3: Curated Benchmark Samples */}
      {!isProcessing && activeTab === 'samples' && (
        <div className="space-y-4">
          <p className="text-xs text-neutral-400">
            {isRTL
              ? 'یکی از دیتاست‌های استاندارد و دارای عیوب واقعی زیر را انتخاب کنید تا چرخه کامل آماده‌سازی داده را تجربه نمایید:'
              : 'Select one of these curated dirty datasets to experience the entire DataFix workflow without needing your own files:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_DATASETS.map((sample) => (
              <div
                key={sample.id}
                className="p-4 rounded-lg border border-neutral-850 bg-neutral-900/50 hover:border-neutral-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-mono text-blue-400 font-semibold mb-1" dir="ltr">
                    {sample.task}
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-100" dir="ltr">{sample.name}</h3>
                  <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed font-sans">
                    {sample.description}
                  </p>
                  <div className="mt-3 text-[11px] font-mono text-neutral-400">
                    {isRTL ? 'مشکلات عمدی:' : 'Defects:'}
                    <ul className="mt-1 space-y-0.5 text-neutral-400 font-sans">
                      {sample.knownIssues.slice(0, 3).map((issue, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-amber-500">·</span> {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => onLoadSample(sample.id)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-md bg-neutral-800 hover:bg-blue-600 px-3 py-2 text-xs font-medium text-neutral-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Play className="h-3 w-3" />
                  <span>{t('loadDatasetBtn')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Guarantee */}
      <div className="rounded-lg border border-neutral-850 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-start gap-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-neutral-200">
            {t('guaranteeTitle')}
          </div>
          <p className="leading-relaxed">
            {t('guaranteeDesc')}
          </p>
        </div>
      </div>
    </div>
  );
};
