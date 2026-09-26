import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to execute Python data engine
function runPythonEngine(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [path.resolve(process.cwd(), 'engine/datafix_engine.py')]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python engine exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(`Failed to parse Python engine output: ${err.message}. Raw: ${stdout}`));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

// API Routes
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { csv_content, target_column } = req.body;
    if (!csv_content || typeof csv_content !== 'string') {
      return res.status(400).json({ error: 'csv_content string is required' });
    }

    const result = await runPythonEngine({
      command: 'analyze',
      csv_content,
      target_column,
    });

    res.json(result);
  } catch (error: any) {
    console.error('API /api/analyze error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

app.post('/api/preview-transform', async (req: Request, res: Response) => {
  try {
    const { csv_content, operations, filename } = req.body;
    if (!csv_content) {
      return res.status(400).json({ error: 'csv_content string is required' });
    }

    const result = await runPythonEngine({
      command: 'preview_transform',
      csv_content,
      operations: operations || {},
      filename: filename || 'dataset.csv',
    });

    res.json(result);
  } catch (error: any) {
    console.error('API /api/preview-transform error:', error);
    res.status(500).json({ error: error.message || 'Transform preview failed' });
  }
});

app.post('/api/apply-transform', async (req: Request, res: Response) => {
  try {
    const { csv_content, operations, filename } = req.body;
    if (!csv_content) {
      return res.status(400).json({ error: 'csv_content string is required' });
    }

    const result = await runPythonEngine({
      command: 'apply_transform',
      csv_content,
      operations: operations || {},
      filename: filename || 'dataset.csv',
    });

    res.json(result);
  } catch (error: any) {
    console.error('API /api/apply-transform error:', error);
    res.status(500).json({ error: error.message || 'Transform apply failed' });
  }
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DataFix server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DataFix server:', err);
  process.exit(1);
});
