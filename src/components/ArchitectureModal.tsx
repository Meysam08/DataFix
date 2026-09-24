import React, { useState } from 'react';
import { X, Code2, Copy, Check, Layers, Cpu, Server, Database, ArrowRight } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LARAVEL_FILES: Record<string, { label: string; language: string; content: string }> = {
  controller: {
    label: 'DatasetController.php',
    language: 'php',
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
  service: {
    label: 'PythonDataEngineService.php',
    language: 'php',
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
    language: 'php',
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
    language: 'php',
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
  engine: {
    label: 'engine/datafix_engine.py',
    language: 'python',
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

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<keyof typeof LARAVEL_FILES>('controller');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFile = LARAVEL_FILES[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Laravel + Python Full-Stack Architecture
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Clean separation of concerns: Python calculates. Laravel orchestrates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* High Level Flow Chart */}
        <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 text-xs font-mono grid grid-cols-1 md:grid-cols-4 gap-3 text-neutral-300">
          <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-blue-400 font-semibold flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" /> 1. Browser & Blade
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              User uploads dataset CSV and selects cleaning rules.
            </p>
          </div>

          <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> 2. Laravel Orchestrator
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Authenticates, saves file to storage, and calls PythonDataEngineService.
            </p>
          </div>

          <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-amber-400 font-semibold flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> 3. Python Data Engine
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Runs IQR math, type inference, deduplication, and generates diffs.
            </p>
          </div>

          <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 space-y-1">
            <div className="text-purple-400 font-semibold flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> 4. JSON Response & DB
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Laravel saves quality scores and outputs audit log & cleaned CSV.
            </p>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {Object.entries(LARAVEL_FILES).map(([key, item]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                  activeTab === key
                    ? 'bg-neutral-800 text-blue-400 font-semibold border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-neutral-300 hover:text-white px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Code
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-neutral-950">
          <pre className="font-mono text-xs text-neutral-300 leading-relaxed overflow-x-auto">
            {currentFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
