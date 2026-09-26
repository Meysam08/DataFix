import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Cpu,
  Server,
  Database,
  ArrowRight,
  FileCode,
  ChevronDown,
  ChevronUp,
  Workflow,
  Sparkles,
  Layers,
  Terminal,
  CheckCircle2,
  FolderTree
} from 'lucide-react';
import { useI18n } from '../i18n/context';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LARAVEL_FILES: Record<
  string,
  {
    label: string;
    path: string;
    language: string;
    description: string;
    content: string;
  }
> = {
  service: {
    label: 'PythonDataEngineService.php',
    path: 'app/Services/PythonDataEngineService.php',
    language: 'php',
    description:
      'Service wrapper that invokes DataFix Python engine via Symfony Process using standard I/O (JSON over stdin/stdout).',
    content: `<?php

namespace App\\Services;

use Symfony\\Component\\Process\\Process;
use Symfony\\Component\\Process\\Exception\\ProcessFailedException;

class PythonDataEngineService
{
    protected string $scriptPath;

    public function __construct()
    {
        $this->scriptPath = base_path('engine/datafix_engine.py');
    }

    /**
     * Execute a command on the Python Data Engine via standard I/O (JSON).
     */
    protected function execute(array $payload): array
    {
        $process = new Process(['python3', $this->scriptPath]);
        $process->setInput(json_encode($payload));
        $process->setTimeout(60);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        $output = $process->getOutput();
        $decoded = json_decode($output, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \\RuntimeException('Invalid JSON returned from Python Data Engine: ' . $output);
        }

        return $decoded;
    }

    public function analyze(string $csvContent): array
    {
        $res = $this->execute([
            'command' => 'analyze',
            'csv_content' => $csvContent,
        ]);
        return $res['analysis'];
    }

    public function previewTransform(string $csvContent, array $operations, string $filename): array
    {
        return $this->execute([
            'command' => 'preview_transform',
            'csv_content' => $csvContent,
            'operations' => $operations,
            'filename' => $filename,
        ]);
    }

    public function applyTransform(string $csvContent, array $operations, string $filename): array
    {
        return $this->execute([
            'command' => 'apply_transform',
            'csv_content' => $csvContent,
            'operations' => $operations,
            'filename' => $filename,
        ]);
    }
}
`,
  },
  migration: {
    label: 'create_datasets_table.php',
    path: 'database/migrations/2026_01_01_000000_create_datasets_table.php',
    language: 'php',
    description:
      'Schema definition for datasets, statistical quality analyses, and reversible transformation history.',
    content: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('datasets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('original_filename');
            $table->string('storage_path');
            $table->string('cleaned_storage_path')->nullable();
            $table->unsignedBigInteger('file_size_bytes');
            $table->unsignedInteger('row_count')->default(0);
            $table->unsignedInteger('column_count')->default(0);
            $table->unsignedTinyInteger('quality_score')->default(0);
            $table->string('status')->default('uploaded'); // uploaded, analyzed, cleaned
            $table->timestamps();
        });

        Schema::create('analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dataset_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('quality_score');
            $table->json('metrics_json');
            $table->timestamps();
        });

        Schema::create('transformations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dataset_id')->constrained()->cascadeOnDelete();
            $table->string('cleaned_path');
            $table->unsignedInteger('rows_before');
            $table->unsignedInteger('rows_after');
            $table->unsignedTinyInteger('quality_before');
            $table->unsignedTinyInteger('quality_after');
            $table->json('operations_json');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transformations');
        Schema::dropIfExists('analyses');
        Schema::dropIfExists('datasets');
        Schema::dropIfExists('projects');
    }
};
`,
  },
  routes: {
    label: 'routes/web.php',
    path: 'routes/web.php',
    language: 'php',
    description:
      'Web endpoints for dataset uploading, quality metric inspection, real-time transformation previews, and CSV export.',
    content: `<?php

use App\\Http\\Controllers\\DatasetController;
use App\\Http\\Controllers\\DashboardController;
use Illuminate\\Support\\Facades\\Route;

Route::get('/', function () {
    return view('landing');
})->name('home');

Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

Route::prefix('datasets')->name('datasets.')->group(function () {
    Route::get('/upload', [DatasetController::class, 'create'])->name('upload');
    Route::post('/', [DatasetController::class, 'store'])->name('store');
    Route::get('/{dataset}', [DatasetController::class, 'show'])->name('overview');
    Route::get('/{dataset}/quality', [DatasetController::class, 'quality'])->name('quality');
    Route::get('/{dataset}/cleaning', [DatasetController::class, 'cleaning'])->name('cleaning');
    Route::post('/{dataset}/preview-transform', [DatasetController::class, 'previewTransform'])->name('preview');
    Route::post('/{dataset}/apply-transform', [DatasetController::class, 'applyTransform'])->name('apply');
    Route::get('/{dataset}/export', [DatasetController::class, 'export'])->name('export');
});
`,
  },
  controller: {
    label: 'DatasetController.php',
    path: 'app/Http/Controllers/DatasetController.php',
    language: 'php',
    description:
      'Orchestrates dataset file uploads, invokes Python engine analysis, previews changes in real time, and persists cleaned outputs.',
    content: `<?php

namespace App\\Http\\Controllers;

use App\\Models\\Dataset;
use App\\Models\\Project;
use App\\Services\\PythonDataEngineService;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Storage;

class DatasetController extends Controller
{
    protected PythonDataEngineService $engine;

    public function __construct(PythonDataEngineService $engine)
    {
        $this->engine = $engine;
    }

    /**
     * Store and analyze an uploaded dataset.
     */
    public function store(Request $request)
    {
        $request->validate([
            'dataset_file' => 'required|file|mimes:csv,txt|max:51200', // 50MB
            'project_id'   => 'nullable|exists:projects,id',
        ]);

        $file = $request->file('dataset_file');
        $storedPath = $file->store('datasets/raw');
        $csvContent = Storage::get($storedPath);

        // Delegate statistical analysis to Python Data Engine
        $analysisResult = $this->engine->analyze($csvContent);

        // Persist dataset record in PostgreSQL/MySQL
        $dataset = Dataset::create([
            'project_id'       => $request->input('project_id'),
            'original_filename'=> $file->getClientOriginalName(),
            'storage_path'     => $storedPath,
            'file_size_bytes'  => $file->getSize(),
            'row_count'        => $analysisResult['rows'],
            'column_count'     => count($analysisResult['columns']),
            'quality_score'    => $analysisResult['quality_score'],
            'status'           => 'analyzed',
        ]);

        // Save detailed column schemas and quality metrics
        $dataset->analyses()->create([
            'metrics_json'     => $analysisResult,
            'quality_score'    => $analysisResult['quality_score'],
        ]);

        return redirect()->route('datasets.overview', $dataset->id)
            ->with('success', 'Dataset successfully analyzed.');
    }

    /**
     * Preview non-destructive transformations.
     */
    public function previewTransform(Request $request, Dataset $dataset)
    {
        $operations = $request->input('operations', []);
        $rawCsv = Storage::get($dataset->storage_path);

        $preview = $this->engine->previewTransform($rawCsv, $operations, $dataset->original_filename);

        return response()->json($preview);
    }

    /**
     * Apply cleaning transformations and write final CSV.
     */
    public function applyTransform(Request $request, Dataset $dataset)
    {
        $operations = $request->input('operations', []);
        $rawCsv = Storage::get($dataset->storage_path);

        $result = $this->engine->applyTransform($rawCsv, $operations, $dataset->original_filename);

        $cleanedPath = "datasets/cleaned/cleaned_{$dataset->id}.csv";
        Storage::put($cleanedPath, $result['cleaned_csv']);

        // Record transformation history
        $dataset->transformations()->create([
            'operations_json'  => $operations,
            'cleaned_path'     => $cleanedPath,
            'rows_before'      => $dataset->row_count,
            'rows_after'       => $result['new_analysis']['rows'],
            'quality_before'   => $dataset->quality_score,
            'quality_after'    => $result['new_analysis']['quality_score'],
        ]);

        $dataset->update([
            'cleaned_storage_path' => $cleanedPath,
            'quality_score'        => $result['new_analysis']['quality_score'],
            'status'               => 'cleaned',
        ]);

        return redirect()->route('datasets.export', $dataset->id);
    }
}
`,
  },
  engine: {
    label: 'engine/datafix_engine.py',
    path: 'engine/datafix_engine.py',
    language: 'python',
    description:
      'Deterministic Python calculation service that performs Tukey IQR math, type inference, deduplication, and non-destructive transformations.',
    content: `# engine/datafix_engine.py
# Deterministic Python Processing Service
# Executes CSV parsing, type inference, IQR outlier detection, and non-destructive transformations.
import sys
import json
import csv
import io
import math

# Reads commands via stdin and emits JSON to stdout
def main():
    raw_input = sys.stdin.read()
    if not raw_input:
        return
    payload = json.loads(raw_input)
    command = payload.get('command')
    csv_content = payload.get('csv_content', '')

    if command == 'analyze':
        analysis = analyze_dataset(csv_content)
        print(json.dumps({'status': 'success', 'analysis': analysis}))
    elif command in ('preview_transform', 'apply_transform'):
        ops = payload.get('operations', {})
        filename = payload.get('filename', 'dataset.csv')
        result = apply_transformations(csv_content, ops, filename)
        print(json.dumps(result))

if __name__ == '__main__':
    main()
`,
  },
};

interface CodeBlockProps {
  id: string;
  title: string;
  language: string;
  content: string;
  maxHeightClass?: string;
  defaultExpanded?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  title,
  language,
  content,
  maxHeightClass = 'max-h-72',
  defaultExpanded = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const lines = content.trim().split('\n');
  const hasManyLines = lines.length > 18;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800/80 bg-neutral-900/70 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="font-mono font-medium text-neutral-200 truncate text-[11px] sm:text-xs">
            {title}
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-400 border border-neutral-750">
            {language}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 hidden md:inline">
            {lines.length} lines
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasManyLines && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-mono text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {isExpanded ? 'Collapse' : `Expand (${lines.length} lines)`}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title={`Copy ${title}`}
            aria-label={`Copy code from ${title}`}
            className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500 ${
              copied
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-750 border border-neutral-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-neutral-400" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div
        className={`overflow-x-auto p-3.5 font-mono text-xs text-neutral-300 leading-relaxed text-left transition-all ${
          isExpanded ? 'max-h-[600px] overflow-y-auto' : `${maxHeightClass} overflow-y-auto`
        }`}
        dir="ltr"
      >
        <pre className="text-[11.5px] sm:text-xs">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const { isRTL } = useI18n();
  const [viewMode, setViewMode] = useState<'steps' | 'files'>('steps');
  const [activeFileKey, setActiveFileKey] = useState<keyof typeof LARAVEL_FILES>('service');
  const [showEngineDetails, setShowEngineDetails] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="laravel-integration-title"
      >
        {/* 1. Integration Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 px-5 sm:px-6 py-4 bg-neutral-950 gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-md bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="laravel-integration-title" className="text-base font-bold text-neutral-100">
                    Laravel Integration
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300">
                      Laravel 11+
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300">
                      Python 3.10+
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-900/60 bg-blue-950/40 text-blue-300">
                      DataFix Engine
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Connect your Laravel application to DataFix's preprocessing engine.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-950 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('steps')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer text-xs ${
                  viewMode === 'steps'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Workflow className="h-3.5 w-3.5 text-blue-400" />
                <span>Integration Steps</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('files')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer text-xs ${
                  viewMode === 'files'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FolderTree className="h-3.5 w-3.5 text-emerald-400" />
                <span>Source Files</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Architecture Flow Strip */}
        <div className="px-5 sm:px-6 py-3 bg-neutral-950/80 border-b border-neutral-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-2 rounded-md bg-neutral-900/60 border border-neutral-800/70">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-600/20 text-blue-400 font-mono text-[11px] font-bold border border-blue-500/30">
                1
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 text-xs">Upload Dataset</div>
                <div className="text-[11px] text-neutral-400 leading-tight truncate">
                  User uploads CSV from web view
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-md bg-neutral-900/60 border border-neutral-800/70">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-600/20 text-emerald-400 font-mono text-[11px] font-bold border border-emerald-500/30">
                2
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 text-xs">Laravel Service</div>
                <div className="text-[11px] text-neutral-400 leading-tight truncate">
                  Streams CSV via JSON standard I/O
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-md bg-neutral-900/60 border border-neutral-800/70">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-600/20 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/30">
                3
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 text-xs">Python Engine</div>
                <div className="text-[11px] text-neutral-400 leading-tight truncate">
                  Runs IQR math & type inference
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-md bg-neutral-900/60 border border-neutral-800/70">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-purple-600/20 text-purple-400 font-mono text-[11px] font-bold border border-purple-500/30">
                4
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 text-xs">Store & Output</div>
                <div className="text-[11px] text-neutral-400 leading-tight truncate">
                  Persists metrics & exports clean CSV
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-neutral-900/40">
          {viewMode === 'steps' ? (
            /* STEP-BY-STEP GUIDED VIEW */
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Step 1: Install / Service Bridge */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-400 text-xs font-mono font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">
                      Service Bridge: PythonDataEngineService
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-8">
                  Create the service that bridges Laravel to DataFix's Python engine using Symfony
                  Process. This executes commands via standard I/O (JSON over stdin and stdout) with
                  zero external network dependencies.
                </p>
                <div className="pl-0 sm:pl-8 pt-1">
                  <CodeBlock
                    id="service"
                    title={LARAVEL_FILES.service.path}
                    language={LARAVEL_FILES.service.language}
                    content={LARAVEL_FILES.service.content}
                    maxHeightClass="max-h-60"
                  />
                </div>
              </section>

              {/* Step 2: Database Migration */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">
                      Database Schema: Create Datasets & Analyses Tables
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-8">
                  Run this migration to persist dataset metadata, quality analysis scores, and
                  transformation history in MySQL or PostgreSQL.
                </p>
                <div className="pl-0 sm:pl-8 pt-1">
                  <CodeBlock
                    id="migration"
                    title={LARAVEL_FILES.migration.path}
                    language={LARAVEL_FILES.migration.language}
                    content={LARAVEL_FILES.migration.content}
                    maxHeightClass="max-h-60"
                  />
                </div>
              </section>

              {/* Step 3: Web Routes */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-600/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">
                      HTTP Web Routes: Register Dataset Endpoints
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-8">
                  Register the route endpoints in your web routing file to handle dataset uploads,
                  quality metrics inspection, preview generation, and final exports.
                </p>
                <div className="pl-0 sm:pl-8 pt-1">
                  <CodeBlock
                    id="routes"
                    title={LARAVEL_FILES.routes.path}
                    language={LARAVEL_FILES.routes.language}
                    content={LARAVEL_FILES.routes.content}
                    maxHeightClass="max-h-48"
                  />
                </div>
              </section>

              {/* Step 4: Controller Orchestration */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600/20 border border-purple-500/40 text-purple-400 text-xs font-mono font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">
                      Controller Orchestration: DatasetController
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed pl-8">
                  The controller handles file validation, calls the engine service to perform
                  statistical analysis or preview cleanings, and writes cleaned CSV files to storage.
                </p>
                <div className="pl-0 sm:pl-8 pt-1">
                  <CodeBlock
                    id="controller"
                    title={LARAVEL_FILES.controller.path}
                    language={LARAVEL_FILES.controller.language}
                    content={LARAVEL_FILES.controller.content}
                    maxHeightClass="max-h-64"
                  />
                </div>
              </section>

              {/* 5. Progressive Disclosure: Advanced Python Engine Script */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
                  <button
                    type="button"
                    onClick={() => setShowEngineDetails(!showEngineDetails)}
                    className="w-full flex items-center justify-between text-left cursor-pointer focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-200">
                          Advanced: Underlying Python Processing Service
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Inspect the Python script (engine/datafix_engine.py) called by Laravel
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <span>{showEngineDetails ? 'Hide' : 'Show details'}</span>
                      {showEngineDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {showEngineDetails && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2">
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        This deterministic Python script reads command payloads from stdin, computes
                        summary statistics (IQR, outliers, type inference, missingness), and returns
                        JSON to stdout.
                      </p>
                      <CodeBlock
                        id="engine"
                        title={LARAVEL_FILES.engine.path}
                        language={LARAVEL_FILES.engine.language}
                        content={LARAVEL_FILES.engine.content}
                        maxHeightClass="max-h-60"
                        defaultExpanded={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ALL SOURCE FILES TABBED EXPLORER VIEW */
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-800">
                {Object.entries(LARAVEL_FILES).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveFileKey(key as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer shrink-0 ${
                      activeFileKey === key
                        ? 'bg-neutral-800 text-blue-400 font-semibold border border-neutral-700 shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80 text-xs">
                  <div className="font-semibold text-neutral-200">
                    {LARAVEL_FILES[activeFileKey].path}
                  </div>
                  <p className="text-neutral-400 text-[11.5px] mt-0.5">
                    {LARAVEL_FILES[activeFileKey].description}
                  </p>
                </div>

                <CodeBlock
                  id={activeFileKey}
                  title={LARAVEL_FILES[activeFileKey].path}
                  language={LARAVEL_FILES[activeFileKey].language}
                  content={LARAVEL_FILES[activeFileKey].content}
                  maxHeightClass="max-h-[500px]"
                  defaultExpanded={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 px-5 sm:px-6 py-3 bg-neutral-950 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-[11px] text-neutral-400">
              Clean separation of concerns: Python calculates. Laravel orchestrates.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
