# DataFix

DataFix is an interactive dataset inspection, statistical hygiene analysis, and deterministic data preprocessing application designed for machine-learning practitioners. It ingests tabular datasets (CSV), parses and validates their structural integrity, identifies data quality defects (missing values, exact duplicates, statistical outliers, zero-IQR distributions, collinear pairs, and type inconsistencies), provides contextual recommendations with explicit risk rationales, executes non-destructive cleaning transformations under user control, and exports cleaned data along with an audit trail and an executable Python/Pandas preprocessing script.

The current implementation is a full-stack Node.js / Express and React SPA (Single Page Application) built with Vite and TypeScript. It features a dual-engine architecture: a deterministic Python processing engine (`engine/datafix_engine.py`) executed via standard I/O subprocesses by an Express server (`server.ts`), paired with an isomorphic client-side TypeScript engine (`src/utils/engine.ts`) that guarantees automatic fallback when running in static or browser-only environments.

---

## 1. Project Overview

### What DataFix Does
DataFix automates the mechanical, error-prone phase of dataset preparation prior to model training. Rather than requiring practitioners to write repetitive exploratory scripts in Jupyter notebooks, DataFix parses raw datasets, analyzes statistical distributions, calculates an objective dataset hygiene score, and allows users to configure and preview cleaning transformations with a real-time diff.

### The Problem It Solves
Data preprocessing consumes an estimated 60–80% of practical machine learning workflow time. Common defects—such as inconsistent encodings, malformed rows, localized missing sentinels, silent duplicate records, extreme leverage outliers, and collinear feature duplicates—frequently contaminate training matrices or cause data leakage between train and test splits. Manual cleaning code often introduces bugs, lacks reversibility, or applies dogmatic fixes (such as automatically imputing all missing values with column means or blindly clipping values outside 1.5× IQR) that destroy valid empirical variance.

### Target Users
* **Machine Learning Engineers & Data Scientists:** Who need a reliable, repeatable exploratory baseline and verifiable audit log before model training.
* **Data Engineers & Analysts:** Who need to sanitize raw tabular exports, reconcile duplicate entries, and validate schema integrity.
* **Full-Stack Developers:** Integrating tabular upload workflows into web applications (e.g., via the documented Laravel + Python architectural blueprint).

### What the Current Version Supports
* Parsing and RFC 4180 structural validation of CSV files (handling comma, semicolon, tab, and pipe delimiters).
* Automatic UTF-8 Byte Order Mark (BOM) stripping and Persian/Arabic numeral normalization.
* Localized sentinel detection for missing values (e.g., `NA`, `null`, `None`, `?`, `-`, and Persian sentinels `سفید`, `خالی`, `ندارد`, `نامشخص`).
* Columnar data type inference (`integer`, `float`, `boolean`, `string`, `date`).
* Statistical summary calculations: Min, Max, Mean, Median, Sample Standard Deviation, Q1, Q3, Tukey Interquartile Range (IQR), and Pearson correlation ($r$).
* Degenerate zero-IQR detection and guarded outlier handling.
* Heuristic target column identification based on semantic naming and extreme variance.
* Actionable, review-level, and informational recommendation generation.
* User-configured transformations: duplicate row removal, missing-value imputation (mean, median, mode, custom fill, drop rows), outlier handling (keep, clip to bounds, remove rows), feature dropping, feature renaming, type casting, and numeric/string row filtering.
* Reversible before-and-after change review with 5-part audit rationales (Detection, Why Detected, Rationale, Risk, User Action) and cell-level diff samples.
* Export of cleaned CSV with UTF-8 BOM, full JSON records, Markdown quality audit report, and reproducible Python/Pandas code.
* Bilingual localization (English and Persian) with right-to-left (RTL) layout switching.

### What DataFix Does NOT Attempt to Solve
* **It does not train machine learning models:** DataFix does not fit estimators, tune hyperparameters, or evaluate loss functions.
* **It does not perform automated feature engineering:** It does not synthesize interaction terms, polynomial features, or PCA embeddings.
* **It does not perform semantic text understanding or NLP:** Non-numeric columns are treated as categorical or text entities without embedding extraction.
* **It does not handle streaming data:** Processing operates on finite, in-memory tabular files.

### Dataset Hygiene vs. Model Suitability
A high DataFix Quality Score indicates technical cleanliness (valid structure, uniform types, resolved missingness, and verified duplicates). It does **not** guarantee that the dataset is sufficient or appropriate for machine learning. A dataset can have a 100% hygiene score while suffering from severe selection bias, high class imbalance, omitted confounders, or zero predictive correlation with the target variable. Aggressively imputing missing values or clipping extremes will raise the technical hygiene score, but may destroy predictive accuracy.

### Detection vs. Proof of Error
DataFix distinguishes strictly between **detecting an anomaly** and **proving data invalidity**:
* Statistical outlier detection identifies numbers that fall beyond mathematical boundaries (e.g., $Q3 + 1.5 \times \text{IQR}$). This does **not** prove the observation was entered in error.
* Duplicate detection finds identical observations across all columns. In real-world transactional data, two identical purchases on the same day can be legitimate distinct events.
Consequently, DataFix flags anomalies for human review and requires explicit user confirmation before modifying data.

---

## 2. Current Feature Set

| Feature | Status | Description | Main Implementation Area |
| :--- | :--- | :--- | :--- |
| **CSV Parsing & Validation** | Complete | RFC 4180 compliant streaming state-machine parser handling quotes, multiline fields, and delimiters (`,`, `;`, `\t`, `\|`). | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **BOM Handling** | Complete | Strips UTF-8 BOM (`\uFEFF` / `0xEF,0xBB,0xBF`) on ingest; prepends BOM on CSV export for Microsoft Excel & Persian compatibility. | `src/utils/engine.ts`, `src/components/ExportView.tsx` |
| **Numeral Normalization** | Complete | Normalizes Eastern Arabic (`٠-٩`) and Persian (`۰-۹`) digits to ASCII digits (`0-9`), and handles Persian decimal (`٫`) and thousands (`٬`) separators. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Localized Null Detection** | Complete | Identifies standard English nulls (`null`, `nan`, `none`, `na`, `n/a`, `?`, `nil`, `-`) and Persian sentinels (`سفید`, `خالی`, `ندارد`, `نامشخص`). | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Malformed Row Detection** | Complete | Tracks row-by-row field count discrepancies against expected header length and surfaces row numbers and raw content. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Type Inference** | Complete | Evaluates columns across integer, float, boolean (English & Persian truth values), date patterns, and string categories. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Statistical Calculations** | Complete | Computes Min, Max, Mean, Median, Sample StdDev ($N-1$), Q1, Q3, Tukey IQR, and Pearson correlation coefficients. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Zero-IQR Guard** | Complete | Identifies columns where $Q1 = \text{Median} = Q3$ (e.g., concentrated distributions), prevents artificial clipping, and marks issues as `review`. | `src/utils/engine.ts`, `engine/datafix_engine.py`, `src/utils/recommendations.ts` |
| **Data Hygiene Score** | Complete | Deterministic 5-component penalty formula computing an objective score from 5 to 100 with a visible breakdown. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Target Candidate Identification** | Complete | Heuristic detection of modeling targets via regex keywords (`price`, `label`, `target`, etc.) and variance checks; supports manual user override. | `src/utils/engine.ts`, `src/components/CleaningWorkspaceView.tsx` |
| **Collinearity Detection** | Complete | Calculates pairwise Pearson correlations ($r \ge 0.98$) to flag redundant measurements and prevents dual target confusion. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Recommendation Engine** | Complete | Generates contextual, ranked recommendations classified by confidence (`actionable`, `review`, `informational`) with impact recovery estimates. | `src/utils/recommendations.ts` |
| **Cleaning Workspace** | Complete | Interactive workspace to configure duplicate handling, missing value strategy, outlier clipping/removal, type casting, drops, and filters. | `src/components/CleaningWorkspaceView.tsx` |
| **Pending Changes Summary** | Complete | Prominent workspace widget tracking unapplied configuration count, estimated rows affected, and quick clear actions. | `src/components/PendingChangesSummary.tsx` |
| **Preview & Diff Engine** | Complete | Computes dry-run transformations, generates row-level diff samples, and updates the quality score prior to final application. | `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Audit Trail & Review** | Complete | Visualizes 5-part audit structures (Detection, Why Detected, Rationale, Risk, User Action) for all applied operations. | `src/components/ReviewChangesView.tsx` |
| **Export Formats** | Complete | Exports sanitized CSV (with BOM), complete JSON record array, and Markdown quality audit summary report. | `src/components/ExportView.tsx` |
| **Reproducible Python Script** | Complete | Generates a standalone, executable Python/Pandas script reproducing the exact sequence of configured transformations. | `src/utils/engine.ts`, `src/components/ExportView.tsx` |
| **Bilingual Localization** | Complete | Comprehensive English and Persian interface with RTL/LTR layout transitions and language persistence. | `src/i18n/context.tsx`, `src/i18n/translations.ts` |
| **Full-Stack Dual Engine** | Complete | Express server routing requests to Python child processes via JSON over stdin/stdout, with automatic isomorphic browser fallback. | `server.ts`, `src/utils/engine.ts`, `engine/datafix_engine.py` |
| **Laravel Integration Blueprint** | Complete | Interactive developer documentation modal providing a complete 4-step architectural blueprint (Service, Migration, Routes, Controller). | `src/components/ArchitectureModal.tsx` |
| **Regression Test Suites** | Complete | Parity-tested regression suites in both TypeScript (`tests/regression_suite.ts`) and Python (`tests/test_datafix_engine.py`). | `tests/` |

---

## 3. Architecture

DataFix operates on a full-stack dual-engine architecture. In a standard Node.js server environment, operations are executed by a native Python process through an Express proxy. In browser-only or static deployments, an identical isomorphic TypeScript engine handles execution transparently.

```text
                               +-----------------------------------+
                               |           User Browser            |
                               +-----------------------------------+
                                                 |
                                                 v
                               +-----------------------------------+
                               |     React 19 / Vite Frontend      |
                               |  - Navigation Router (ScreenId)   |
                               |  - ActiveDataset State Context    |
                               |  - Bilingual i18n Provider        |
                               +-----------------------------------+
                                                 |
                               +-----------------+-----------------+
                               |                                   |
                  (HTTP Fetch: /api/*)                 (Network Error / Fallback)
                               |                                   |
                               v                                   v
             +-----------------------------------+   +---------------------------+
             |      Node.js / Express Server     |   |  Isomorphic TypeScript   |
             |            (server.ts)            |   |          Engine           |
             +-----------------------------------+   |   (src/utils/engine.ts)   |
                               |                     +---------------------------+
                       (JSON over stdin)                           |
                               v                                   |
             +-----------------------------------+                 |
             |       Python 3 Data Engine        |                 |
             |    (engine/datafix_engine.py)     |                 |
             +-----------------------------------+                 |
                               |                                   |
                      (JSON over stdout)                           |
                               v                                   |
             +-----------------------------------+                 |
             |     Structured Analysis Output    |<----------------+
             |  - rows, columns, metrics         |
             |  - detected_issues, score         |
             |  - collinear_pairs, diff_samples  |
             +-----------------------------------+
                               |
                               v
             +-----------------------------------+
             |    Recommendation Engine Heuristic|
             |    (src/utils/recommendations.ts) |
             +-----------------------------------+
                               |
                               v
             +-----------------------------------+
             |    Cleaning Workspace Config      |
             |      (CleaningOperations)         |
             +-----------------------------------+
                               |
                               v
             +-----------------------------------+
             |   Review Changes & 5-Part Audit   |
             |   (src/components/ReviewChanges)  |
             +-----------------------------------+
                               |
                               v
             +-----------------------------------+
             |          Export Layer             |
             |  - Cleaned CSV (UTF-8 BOM)        |
             |  - Complete JSON Record Array     |
             |  - Markdown Audit Report          |
             |  - Reproducible Python Script     |
             +-----------------------------------+
```

### Communication Protocol
* **Frontend to Server:** `fetch('/api/analyze')`, `fetch('/api/preview-transform')`, and `fetch('/api/apply-transform')` sending JSON payloads with body limits up to 50MB.
* **Server to Python Engine:** `child_process.spawn('python3', ['engine/datafix_engine.py'])`. The Express server serializes the request payload to JSON, writes it to Python's `stdin`, and closes `stdin`. The Python engine reads `sys.stdin.read()`, executes the command, and writes the resulting JSON to `sys.stdout`.
* **Fallback Guarantee:** If the Node.js server is unavailable or fails to spawn Python, `src/utils/engine.ts` catches the error and executes `localAnalyzeDataset` or `localApplyTransformations` in the browser with zero user interruption.

---

## 4. Repository Structure

```text
/
├── engine/
│   └── datafix_engine.py          # Standalone deterministic Python data processing engine
├── public/                        # Static public web assets
├── src/
│   ├── components/                # React UI view components
│   │   ├── ArchitectureModal.tsx  # Laravel + Python integration guide & code modal
│   │   ├── CleaningWorkspaceView.tsx # Interactive transformation workspace
│   │   ├── DashboardView.tsx      # Multi-dataset registry and management view
│   │   ├── DatasetOverviewView.tsx# Grid, Schema, and Statistical distribution views
│   │   ├── ExportView.tsx         # Cleaned CSV, JSON, Markdown, and script export view
│   │   ├── LandingPage.tsx        # Application entry and workflow overview
│   │   ├── Navbar.tsx             # Global navigation bar and language switcher
│   │   ├── PendingChangesSummary.tsx # Prominent workspace pending operations summary
│   │   ├── QualityAnalysisView.tsx# Data hygiene score and issue recommendations view
│   │   ├── ReviewChangesView.tsx  # Pre-apply diff and 5-part structured audit trail
│   │   ├── UploadView.tsx         # File drag-and-drop, raw text paste, sample datasets
│   │   └── WorkflowStepper.tsx    # Visual workflow progress indicator
│   ├── data/
│   │   └── sampleDatasets.ts      # Built-in sample datasets (Tehran housing, Churn, etc.)
│   ├── i18n/                      # Internationalization system
│   │   ├── context.tsx            # React context provider for language and RTL state
│   │   ├── translations.ts        # English and Persian string dictionaries
│   │   └── types.ts               # Translation interface definitions
│   ├── types/
│   │   └── dataset.ts             # Core TypeScript interfaces, types, and schemas
│   ├── utils/
│   │   ├── engine.ts              # Client-side isomorphic engine, parser & API caller
│   │   └── recommendations.ts     # Actionable recommendation engine heuristics
│   ├── App.tsx                    # Top-level application state router
│   ├── index.css                  # Global Tailwind CSS styles and font bindings
│   └── main.tsx                   # React root entry point
├── tests/
│   ├── regression_suite.ts        # TypeScript regression and edge-case test suite
│   └── test_datafix_engine.py     # Python engine parity and regression test suite
├── .env.example                   # Environment variable documentation template
├── .gitignore                     # Git exclusion rules
├── bun.lock                       # Bun lockfile
├── index.html                     # HTML5 entry template with typography links
├── metadata.json                  # AI Studio applet metadata & capabilities
├── package.json                   # Project metadata, scripts, and dependencies
├── server.ts                      # Express.js backend server with Vite middleware & Python bridge
├── tsconfig.json                  # TypeScript compiler configuration
└── vite.config.ts                 # Vite build and plugin configuration
```

### Component Breakdown
* **`engine/`**: Houses the backend Python engine. It has zero external dependencies and runs on Python 3.10+ standard libraries (`math`, `statistics`, `csv`, `json`, `sys`, `re`, `datetime`).
* **`src/types/dataset.ts`**: The canonical data contract. Defines schemas for `DatasetAnalysis`, `ColumnDetail`, `ColumnStats`, `DetectedIssue`, `CleaningOperations`, `OperationAuditDetail`, and `TransformPreviewResult`.
* **`src/utils/engine.ts`**: Contains the full isomorphic TypeScript engine. Provides RFC 4180 parsing, digit normalization, Tukey outlier calculations, Pearson correlations, transformation routines, and Python script generation.
* **`src/utils/recommendations.ts`**: Houses the heuristics that evaluate statistical analyses and generate prioritized recommendations with risk trade-offs and confidence levels.
* **`server.ts`**: Express backend that mounts Vite middlewares in development, serves `dist/` in production, and provides `/api/*` routes to spawn `datafix_engine.py`.

---

## 5. Technology Stack

| Technology | Version | Purpose | Where Used |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` (active: `v22.23.2`) | Server runtime environment | Development and full-stack production server |
| **Python** | `>= 3.10.0` (active: `3.10.12`) | Deterministic backend calculation engine | Subprocess execution via `engine/datafix_engine.py` |
| **React** | `^19.0.1` | UI view rendering and reactive state | Client application (`src/`) |
| **React DOM** | `^19.0.1` | DOM renderer for React | Client application (`src/main.tsx`) |
| **TypeScript** | `^7.0.2` | Static type checking and interface contracts | Entire codebase (`src/`, `server.ts`, `tests/`) |
| **Vite** | `^8.3.0` | Frontend tooling, HMR, and bundling | Build pipeline and dev middleware |
| **Express** | `^4.21.2` | HTTP API proxy server and static file host | Backend entry point (`server.ts`) |
| **Tailwind CSS** | `^4.3.3` | Utility-first styling engine | CSS styling (`src/index.css`) |
| **@tailwindcss/vite** | `^4.3.3` | Tailwind integration plugin for Vite | Build configuration (`vite.config.ts`) |
| **Lucide React** | `^0.546.0` | Consistent iconography | UI components (`src/components/`) |
| **Motion** | `^12.23.24` | Animation and transition primitives | UI transitions |
| **tsx** | `^4.21.0` | TypeScript execution engine for Node.js | Development server and TypeScript test runner |
| **Dotenv** | `^17.2.3` | Environment variable loader | Server initialization (`server.ts`) |
| **@google/genai** | `^2.4.0` | Gemini API SDK (available platform dependency) | Declared dependency in `package.json` |

*Note on Python libraries:* `engine/datafix_engine.py` uses **only** the Python Standard Library (`sys`, `json`, `csv`, `io`, `math`, `statistics`, `re`, `datetime`, `collections`). It does **not** require `pandas`, `numpy`, or `scikit-learn` in the host environment. Downstream users who download the generated pipeline will need `pandas` and `numpy` to run the resulting script.

---

## 6. Application Lifecycle

1. **Application Boot:** `server.ts` starts Express on port 3000, mounting Vite middleware in development or serving static assets in production.
2. **Dataset Ingestion:** The user selects a preloaded sample, pastes raw text, or uploads a `.csv` file via `UploadView`.
3. **Parsing & Structural Validation:** `parseCsv` reads the text stream, removes UTF-8 BOMs, detects delimiters (`,`, `;`, `\t`, `|`), parses quoted strings according to RFC 4180, normalizes Persian/Arabic numerals, and identifies malformed rows.
4. **Statistical Profiling & Type Inference:** Columns are evaluated for data type (`integer`, `float`, `boolean`, `date`, `string`). Summary statistics (min, max, mean, median, standard deviation, Q1, Q3, IQR, bounds, outlier counts) and Pearson correlation coefficients ($r$) are calculated.
5. **Hygiene Score Calculation:** A deterministic penalty-based quality score is computed, starting at 100 and deducting points for missing cells, duplicate rows, empty columns, type inconsistencies, and feature outliers (excluding zero-IQR distributions).
6. **Recommendation Generation:** `getActionableRecommendations` evaluates the analysis and produces contextual recommendations classified as `actionable`, `review`, or `informational`.
7. **Interactive Cleaning Configuration:** The user enters `CleaningWorkspaceView`. They may optionally designate a target column, adjust missing value remediation (mean, median, mode, custom fill, drop rows), toggle deduplication, configure outlier actions (keep, clip, remove), drop or rename columns, cast types, or add row filters.
8. **Transformation Preview & Diff:** Clicking "Preview Changes / Diff" triggers `executePreviewTransform`. The engine performs an in-memory dry run, calculating rows removed, columns removed, resulting dataset hygiene score, and cell-by-cell diff samples.
9. **Audit Trail Review:** The user inspects `ReviewChangesView`, examining structured 5-part cards (Detection, Why Detected, Rationale, Risk, User Action) explaining why each transformation was performed.
10. **Application & Finalization:** The user applies the changes. `activeDataset.cleanedCsv` is stored in state, and the user navigates to `ExportView`.
11. **Export & Pipeline Emission:** The user downloads the cleaned CSV (with UTF-8 BOM), complete JSON records, or Markdown audit report, or copies the generated Python/Pandas code.

---

## 7. Dataset Input and Parsing

### Supported Formats & Limits
* **File Format:** Plaintext Comma-Separated Values (`.csv`, `.txt`).
* **File Size:** Default browser upload supports datasets up to 50MB. Express server body parser limit is set to `50mb`.
* **Encoding:** UTF-8 is assumed. UTF-8 BOM (`0xEF, 0xBB, 0xBF` / `\uFEFF`) is automatically detected and stripped from the first line.

### Delimiter Detection
The parser reads the first 4,096 characters of the unquoted stream and counts occurrences of `,`, `;`, `\t`, and `|`. The delimiter with the highest count across unquoted lines is selected, falling back to `,`.

### RFC 4180 Streaming State Machine
Parsing is performed using a streaming character-by-character state machine:
* Tracks `inQuotes` state.
* Handles escaped double quotes (`""` inside quotes resolved to a single `"`).
* Accurately preserves literal line breaks (`\n`, `\r\n`) within quoted fields.
* Strips trailing empty carriage returns.

### Malformed Row Detection
The column count of the header row (line 1) establishes the expected column count $C$. Every subsequent row $i$ is inspected:
* If row $i$ contains $C' \ne C$ fields, the row is recorded in `CsvStructure.malformed_row_details`.
* For analysis purposes, rows with $C' < C$ are padded with empty strings; rows with $C' > C$ are truncated to $C$ while preserving extra fields in `_extra_fields` for audit display.

### Numeral & Digit Normalization
Persian and Arabic numerals are normalized to standard ASCII characters:
```text
[۰-۹] (0x06F0 - 0x06F9) -> '0' - '9'
[٠-٩] (0x0660 - 0x0669) -> '0' - '9'
'٫' (Persian decimal separator) -> '.'
'٬' (Persian thousands separator) -> ',' (stripped for numeric parsing)
```

### Localized Null Values
The following string representations (case-insensitive, trimmed) evaluate to `null` / empty:
* English: `""`, `"null"`, `"nan"`, `"none"`, `"na"`, `"n/a"`, `"?"`, `"nil"`, `"#n/a"`, `"-"`, `"undefined"`
* Persian: `"سفید"`, `"خالی"`, `"ندارد"`, `"نامشخص"`

### Column Type Inference
Evaluated across non-empty cells in priority order:
1. **Boolean:** Matches True (`true`, `t`, `yes`, `y`, `1`, `1.0`, `بله`, `صحیح`, `درست`) or False (`false`, `f`, `no`, `n`, `0`, `0.0`, `خیر`, `غلط`, `نادرست`, `نه`). If $\ge 90\%$ of non-empty cells match, the column is classified as `boolean`.
2. **Integer:** Matches `^[+-]?\d+$`. If $\ge 90\%$ match, column is `integer`.
3. **Float:** Matches standard floating-point representation (`^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$`). If $\ge 90\%$ match, column is `float`.
4. **Date:** Matches ISO 8601, `YYYY-MM-DD`, `YYYY/MM/DD`, `DD-MM-YYYY`, `MM/DD/YYYY`, and timestamps. If $\ge 80\%$ match, column is `date`.
5. **String:** Default fallback for non-numeric, mixed, or high-cardinality text.

---

## 8. Data Validation

DataFix validates data across three distinct analytical tiers:

1. **Structural Validation (Deterministic):**
   * Verifies file is non-empty and contains at least 1 header and 1 data row.
   * Compares field counts per row against header length.
   * Confirms consistent quoting and absence of unclosed quotation tokens.
2. **Semantic & Type Validation (Heuristic):**
   * Identifies type inconsistencies (e.g., text values in an otherwise integer column).
   * Detects 100% empty columns.
   * Detects duplicate records (exact matches across all fields).
3. **Statistical Anomaly Detection (Stochastic):**
   * Identifies observations falling outside $Q1 - 1.5 \times \text{IQR}$ and $Q3 + 1.5 \times \text{IQR}$.
   * Identifies zero-IQR distributions ($Q1 = \text{Median} = Q3$).
   * Calculates collinear feature pairs ($r \ge 0.98$).

---

## 9. Data Quality / Hygiene Score

### Mathematical Specification
The DataFix Quality Score ($Q$) is a deterministic hygiene metric bounded between 5 and 100:

$$Q = \max\left(5, \text{round}\left(100 - (P_{\text{missing}} + P_{\text{duplicate}} + P_{\text{empty}} + P_{\text{type}} + P_{\text{outlier}})\right)\right)$$

Where $N_{\text{rows}}$ is total rows, $N_{\text{cols}}$ is total columns, and $N_{\text{cells}} = N_{\text{rows}} \times N_{\text{cols}}$.

#### 1. Missing Value Penalty ($P_{\text{missing}}$)
$$P_{\text{missing}} = \min\left(35, \frac{\text{Total Missing Cells}}{N_{\text{cells}}} \times 100 \times 0.7\right)$$
Maximum deduction: **35 points**.

#### 2. Duplicate Row Penalty ($P_{\text{duplicate}}$)
$$P_{\text{duplicate}} = \min\left(25, \frac{\text{Duplicate Rows}}{N_{\text{rows}}} \times 100 \times 0.8\right)$$
Maximum deduction: **25 points**.

#### 3. Empty Column Penalty ($P_{\text{empty}}$)
$$P_{\text{empty}} = \min\left(20, \frac{\text{Count of 100\% Empty Columns}}{N_{\text{cols}}} \times 100\right)$$
Maximum deduction: **20 points**.

#### 4. Type Inconsistency Penalty ($P_{\text{type}}$)
$$P_{\text{type}} = \min\left(10, \frac{\text{Total Inconsistent Cells}}{N_{\text{cells}}} \times 100 \times 5.0\right)$$
Maximum deduction: **10 points**.

#### 5. Statistical Outlier Penalty ($P_{\text{outlier}}$)
$$P_{\text{outlier}} = \min\left(10, \frac{\text{Outliers in Non-Zero-IQR Columns}}{N_{\text{cells}}} \times 100 \times 0.5\right)$$
Maximum deduction: **10 points**.

*Critical Zero-IQR Exception:* Outliers in columns with $\text{IQR} = 0$ are **strictly excluded** from the outlier penalty calculation to prevent penalizing concentrated distributions.

### What the Hygiene Score Does NOT Represent
* **Not an ML performance metric:** A score of 95 does not mean an XGBoost or Random Forest model will achieve high $R^2$ or AUC.
* **Not a measure of data truth:** Synthetically filling missing fields with mean values increases the score, but introduces bias into regression weights.
* **Not an indicator of feature relevance:** A dataset consisting of noise columns with no missing values can receive a score of 100.

---

## 10. Issue Detection Engine

| Issue | Detection Rule | Required Data | Threshold | Output Produced | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Missing Values** | Cell evaluates to empty or recognized missing sentinel | Column values | Count $> 0$ | Issue with severity based on % missing; recommendation to impute or drop | Cannot infer *why* data is missing (MCAR vs MAR vs MNAR). |
| **Duplicate Rows** | Exact row-level string match across all columns | Entire table | Count $> 0$ | High severity issue if $> 10\%$, medium otherwise; row count & % | Legitimate repeated real-world events may be flagged. |
| **Empty Columns** | $100\%$ of observations evaluate to empty | Column values | $100\%$ missing | High severity issue; recommendation to drop feature | Columns with single placeholder strings may evade detection. |
| **Type Inconsistency** | Cell deviates from majority inferred column type | Column values | Count $> 0$ | Medium severity issue; count of non-parseable values | Rare valid alphanumeric IDs in numeric-like fields get flagged. |
| **Statistical Outliers** | $v < Q1 - 1.5 \times \text{IQR}$ or $v > Q3 + 1.5 \times \text{IQR}$ | Numeric array ($N \ge 4$) | Outside bounds | Count of outliers, sample values, Tukey bounds | Assumes unimodal distribution; fails on multimodal data. |
| **Zero-IQR Column** | $Q1 = \text{Median} = Q3$ ($\text{IQR} = 0$) | Sorted numbers | $\text{IQR} == 0$ | Issue marked `review`; notice explaining distribution concentration | Discrete features (e.g. rooms: 1, 2, 2, 2, 3) get flagged as outliers if clipped. |
| **Collinear Pairs** | Pairwise Pearson $r \ge 0.98$ | Dual numeric arrays | $r \ge 0.98$ | Informational issue; pair names and correlation value | Only detects linear correlation; misses non-linear dependencies. |
| **Target Extremes** | Outlier detected in designated target column | Target column stats | Outside bounds | Issue marked `review`; warning against clipping dependent variable | High target values may be valid empirical phenomena (e.g. luxury home sales). |

---

## 11. Outlier Detection

### Tukey IQR Method
For each numeric column with $N \ge 4$ non-empty entries:
1. Sort values: $x_1 \le x_2 \le \dots \le x_N$.
2. Calculate percentiles via linear interpolation:
   $$k = (N - 1) \times p, \quad f = \lfloor k \rfloor, \quad c = \lceil k \rceil$$
   $$P(p) = x_f \times (c - k) + x_c \times (k - f)$$
3. Compute $Q1 = P(0.25)$ and $Q3 = P(0.75)$.
4. Compute Interquartile Range: $\text{IQR} = Q3 - Q1$.
5. Compute lower and upper Tukey bounds:
   $$\text{Lower Bound} = Q1 - 1.5 \times \text{IQR}$$
   $$\text{Upper Bound} = Q3 + 1.5 \times \text{IQR}$$
6. Identify outliers: Any $x_i < \text{Lower Bound}$ or $x_i > \text{Upper Bound}$.

### The Zero-IQR Problem
In concentrated or discrete numeric features, $\ge 50\%$ of observations may share an identical value.
* Example (`housePrice.csv` `Room` column):
  Values: `[1, 2, 2, 2, 2, 2, 2, 2, 3, 4]` ($N = 10$).
  $Q1 = 2$, $\text{Median} = 2$, $Q3 = 2$, $\text{IQR} = 0$.
  Lower Bound = 2, Upper Bound = 2.
  Under standard algorithms, all values other than 2 (`1`, `3`, `4`) are flagged as outliers.
* **DataFix Guard:** DataFix flags $\text{IQR} = 0$ as a concentrated distribution, sets confidence to `review`, defaults the action to `keep`, and excludes these values from quality score penalty deductions. Clipping is explicitly advised against because clipping to $[2, 2]$ would destroy all feature variance.

### Target-Column Outliers
When extreme values occur in a target column (e.g., apartment price of 35,000,000,000 IRR):
* Clipping truncates the dependent variable distribution, causing systematic underprediction of high-value items.
* DataFix marks target outliers as `review`, defaults to `keep`, and recommends robust regression loss functions (Huber / MAE) or log transformations rather than clipping.

---

## 12. Recommendation Engine

The core design principle of DataFix is:
```text
Detection != Recommendation != Automatic Transformation
```

1. **Detection:** Identifies a mathematical pattern (e.g., 5 cells outside 1.5× IQR).
2. **Recommendation:** Evaluates the pattern in context (feature vs. target, continuous vs. discrete, sample size).
3. **User Action:** The user reviews the recommendation, understands the associated risk, and explicitly chooses whether to apply, adjust, or ignore it.

### Confidence Classification
* **Actionable:** High-confidence engineering improvements with negligible mathematical risk (e.g., dropping 100% empty columns, resolving exact duplicate entries).
* **Review:** Changes that require domain understanding and involve statistical trade-offs (e.g., imputing missing values in critical features, handling outliers, zero-IQR columns).
* **Informational:** Contextual observations that alert the practitioner without requiring transformation (e.g., collinear measurement pairs, target candidate identification).

---

## 13. Target Identification and Correlation Analysis

### Target Candidate Heuristics
DataFix scans headers using the regex:
```regex
/(price|target|label|cost|salary|revenue|churn|outcome|grade|score|sales|profit|value)/i
```
Or columns ending in `(usd)` or `_usd`.
Users can manually designate or override the target column at any time in the Cleaning Workspace.

### Pairwise Pearson Correlation
For every pair of numeric columns with $N \ge 5$ overlapping valid entries:
$$r_{xy} = \frac{\sum_{i=1}^N (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^N (x_i - \bar{x})^2 \sum_{i=1}^N (y_i - \bar{y})^2}}$$
Pairs with $|r| \ge 0.98$ are flagged as redundant measurements (e.g., `Price` in IRR and `Price(USD)` in USD with $r = 1.00$). The recommendation engine alerts the user to avoid training models with both columns simultaneously.

---

## 14. Cleaning Engine

| Operation | Parameters | Transformation Logic | Affected Scope | Output / Audit |
| :--- | :--- | :--- | :--- | :--- |
| **Remove Duplicates** | `remove_duplicates: boolean` | Keeps the first occurrence of each unique serialized row; discards subsequent duplicates. | Whole dataset | Records count of removed rows and risk regarding empirical event frequency. |
| **Global Missing Drop** | `global: 'drop_rows'` | Discards any row containing at least one empty or sentinel value. | Rows with any missing cell | Records row reduction count and potential selection bias risk. |
| **Column Imputation** | `action: 'mean' \| 'median' \| 'mode' \| 'custom'` | Replaces missing cells in column with computed mean, median, mode, or user string. | Missing cells in specified column | Records imputed value, cell count, and variance compression risk. |
| **Column Missing Drop** | `action: 'drop_rows'` | Discards rows where the specified column is empty. | Rows missing specified column | Records rows removed and sample size impact. |
| **Outlier Clipping** | `action: 'clip'` | Clips values $< \text{Lower Bound}$ to Lower Bound and $> \text{Upper Bound}$ to Upper Bound. | Extreme numeric cells | Records boundary values $[LB, UB]$ and distribution truncation risk. |
| **Outlier Removal** | `action: 'remove'` | Discards entire rows where specified column value falls outside Tukey bounds. | Rows with outlier values | Records row reduction count. |
| **Type Casting** | `type: 'integer' \| 'float' \| 'boolean' \| 'string'` | Parses and formats cell string to target type representation (e.g. rounding integers, standardizing True/False). | Column cells | Records conversion success/failure counts. |
| **Drop Column** | `drop_columns: string[]` | Excludes specified column indices from output dataset matrix. | Column schema | Records dropped feature name and zero-variance rationale. |
| **Rename Column** | `rename_columns: Record<string, string>` | Replaces column header name in output schema. | Column header | Records old and new names (zero data risk). |
| **Filter Rules** | `operator: '>' \| '<' \| '>=' \| '<=' \| '==' \| '!=' \| 'contains'` | Filters rows based on numeric or case-insensitive string comparison against target value. | Dataset rows | Records rule expression and count of filtered rows. |

---

## 15. Cleaning Workspace

The Cleaning Workspace (`src/components/CleaningWorkspaceView.tsx`) manages complex preprocessing configuration:

* **State Isolation:** Local `operations` state (`CleaningOperations`) tracks pending configuration changes.
* **Parent Synchronization:** Changes are synchronized to the parent dataset state using a safe `useEffect` hook that avoids React render-phase update warnings:
  ```typescript
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
  ```
* **Target Designation Bar:** Allows assigning a prediction target column at the top of the workspace.
* **Tabbed Organization:** Segregates operations into logical categories (`missing`, `duplicates`, `outliers`, `types`, `columns`, `filters`).
* **Pending Summary Widget:** Displays total configured modifications before previewing.

---

## 16. Review and Audit Trail

Before committing changes, the user reviews a structured transformation audit (`src/components/ReviewChangesView.tsx`):

### 5-Part Audit Card Structure
Every configured operation produces a structured audit record:
1. **Detection:** What anomaly was identified (e.g., "2 exact duplicate row(s) identified").
2. **Why Detected:** The mathematical or structural cause (e.g., "Row contents are completely identical across all columns").
3. **Rationale:** Why the transformation is recommended (e.g., "Deduplication prevents data leakage between train/test splits").
4. **Risk:** The statistical trade-off (e.g., "If identical observations represent distinct real-world events, sample frequency is altered").
5. **User Action:** The exact command being executed (e.g., "Removed 2 duplicate row(s)").

### Diff Sample Viewer
Displays a tabular comparison showing:
* Row index
* Column name
* Original value
* New / Transformed value
* Operation badge (`Imputed`, `Clipped`, `Type Cast`)

---

## 17. Export System

Export functionality lives in `src/components/ExportView.tsx`:

1. **Sanitized CSV (`cleaned_<filename>.csv`):**
   * Encoded as UTF-8.
   * Prepended with the UTF-8 Byte Order Mark (`\uFEFF`) to ensure correct rendering in Microsoft Excel and support Persian Unicode characters.
   * Fields containing commas, quotation marks, or newlines are escaped according to RFC 4180 (`"value with ""quotes"""`).
2. **Complete JSON Records (`cleaned_<filename>.json`):**
   * Exports an array of JSON objects representing the **entire cleaned dataset**, not merely preview rows.
3. **Markdown Audit Report (`audit_<filename>.md`):**
   * Summary of initial vs. final rows and columns.
   * Initial vs. final DataFix hygiene scores.
   * Itemized log of all applied operations and remaining defect counts.
4. **Export Integrity Revalidation:**
   * Prior to download, the export system runs `parseCsv` on the generated CSV string to verify that row count and column count match the post-transformation analysis metrics.

---

## 18. Generated Python / Pandas Pipeline

DataFix emits a clean, reproducible Python script (`generatePythonScript` in `src/utils/engine.ts`):
* Uses standard `pandas` and `numpy`.
* Reflects the exact sequence of configured operations in logical order:
  1. Load raw dataset via `pd.read_csv()`.
  2. Drop unneeded feature columns (`df.drop(columns=[...])`).
  3. Rename columns (`df.rename(columns={...})`).
  4. Deduplicate rows (`df.drop_duplicates(keep='first')`).
  5. Apply row filtering rules (`df = df[df['col'] > val]`).
  6. Impute or drop missing values (`df['col'].fillna(...)` / `df.dropna()`).
  7. Clip or drop outliers (`df['col'].clip(lower=..., upper=...)`).
  8. Cast data types (`df['col'] = df['col'].astype(...)`).
  9. Save cleaned dataset (`df.to_csv('cleaned_dataset.csv', index=False)`).

*Limitation:* Complex custom string filter rules or mixed-type date conversions may require slight syntax adjustments if column names contain special characters or non-standard date formats.

---

## 19. Localization

DataFix features bilingual support for English (`en`) and Persian (`fa`):
* **Context Provider (`src/i18n/context.tsx`):** Exposes `language`, `setLanguage`, `t(key)`, and `isRTL`.
* **Directionality:** Automatically attaches `dir="rtl"` and switches typography classes when Persian is active.
* **Code Isolation:** All code snippets, CSV tables, terminal previews, and formulas strictly preserve `dir="ltr"` and monospace font rendering (`JetBrains Mono`) regardless of active locale.
* **Numeral Parsing:** Both engines parse English (`0-9`), Eastern Arabic (`٠-٩`), and Persian (`۰-۹`) digits seamlessly.

---

## 20. Laravel Integration

DataFix contains developer documentation and blueprint code for integrating the Python data engine into a Laravel application (`src/components/ArchitectureModal.tsx`).

```text
Current DataFix Application:
[React / Vite Frontend] <---> [Express Proxy / Isomorphic TS] <---> [datafix_engine.py]

Optional Production Blueprint (Documented in ArchitectureModal):
[Browser / Blade UI] <---> [Laravel Controller / Service] <---> [datafix_engine.py via Symfony Process]
```

*Status:* **The Laravel integration is an architectural blueprint and reference implementation.** The repository does not run a live Laravel server; it provides the complete, production-ready code files for developers wishing to deploy DataFix inside a Laravel infrastructure:
1. `app/Services/PythonDataEngineService.php`: Manages `Symfony\Component\Process\Process` executing `python3 engine/datafix_engine.py` over stdin/stdout.
2. `database/migrations/2026_01_01_000000_create_datasets_table.php`: Migrations for `projects`, `datasets`, `analyses`, and `transformations`.
3. `routes/web.php`: Resource route definitions for upload, analysis, preview, and export.
4. `app/Http/Controllers/DatasetController.php`: Controller coordinating file storage, service calls, and persistence.
5. `engine/datafix_engine.py`: The Python processing engine.

---

## 21. State Management

Application state is managed in `src/App.tsx` and distributed via props and contexts:
* **Active Datasets (`datasets: ActiveDataset[]`):** Maintains the collection of ingested datasets.
* **Current Active ID (`activeDatasetId: string | null`):** Identifies the currently active dataset.
* **Workflow Screen (`currentScreen: ScreenId`):** Controls screen routing (`landing`, `dashboard`, `upload`, `overview`, `quality`, `cleaning`, `review`, `export`).
* **Active Dataset Schema:**
  ```typescript
  interface ActiveDataset {
    id: string;
    name: string;
    filename: string;
    rawCsv: string;
    cleanedCsv?: string;
    fileSizeBytes: number;
    uploadedAt: string;
    analysis: DatasetAnalysis;
    operations?: CleaningOperations;
    currentTransform?: TransformPreviewResult;
  }
  ```
* **State Updates:** State updates follow immutable patterns (`setDatasets(prev => prev.map(...))`).

---

## 22. Error Handling

* **Malformed CSV:** Non-matching column counts are caught during parsing. The number of malformed rows and raw field contents are captured in `CsvStructure` and surfaced in the Overview and Quality views without crashing the app.
* **Type Conversion Failures:** Values that cannot be parsed to the requested target type (e.g., text string to integer) remain intact, and a warning is logged in `TransformPreviewResult.warnings`.
* **Zero Row / Empty Files:** Ingestion of an empty CSV returns a valid `DatasetAnalysis` with 0 rows, 0 columns, a quality score of 0, and a high-severity `Empty Dataset` issue card.
* **Subprocess Failures:** If `server.ts` encounters an unhandled exception or non-zero exit from `python3`, the API returns a 500 JSON error. `src/utils/engine.ts` intercepts this and falls back to local browser computation.
* **UI Notifications:** Clean error notice cards (`AlertCircle`) display localized explanations if transformations fail.

---

## 23. Testing

DataFix maintains dual test suites ensuring complete parity between the TypeScript and Python processing engines.

| Test Suite | Purpose | Command | Status |
| :--- | :--- | :--- | :--- |
| **TypeScript Regression** | Validates TypeScript engine edge cases (Zero IQR, Target Extremes, Missing Categoricals, Deduplication, Tehran CSV) | `npx tsx tests/regression_suite.ts` | **Passing (5/5)** |
| **Python Regression** | Validates Python engine parity across identical edge-case datasets | `python3 tests/test_datafix_engine.py` | **Passing (5/5)** |
| **TypeScript Typecheck** | Validates type contracts and syntax | `npm run lint` (`tsc --noEmit`) | **Passing (0 errors)** |
| **Application Build** | Tests production Vite bundling and asset emission | `npm run build` (`vite build`) | **Passing** |

### Key Regression Test Scenarios
1. **Test A — Zero IQR Safety:** Tests discrete features where $Q1 = \text{Median} = Q3$. Verifies that values are classified as `review`, default to `keep`, and do not deduct penalties from the hygiene score.
2. **Test B — Target Extreme Values:** Verifies that extreme observations in prediction targets are preserved rather than automatically clipped.
3. **Test C — Missing Categorical Nuance:** Tests categorical missingness (e.g. Tehran apartment addresses), ensuring mode imputation and row dropping are presented with statistical trade-offs.
4. **Test D — Exact Duplicate Deduplication:** Ingests duplicate records, executes deduplication, and verifies that exactly 2 duplicate rows are removed with an audit trail.
5. **Test E — Tehran `housePrice.csv` Structural Parsing:** Validates end-to-end parsing of real estate transaction data containing concentrated distributions, missing strings, extreme leverage typos, duplicates, and dual collinear currencies.

---

## 24. Local Development

### Prerequisites
* **Node.js:** Version 20.0.0 or higher (Node 22 recommended).
* **Python:** Version 3.10 or higher.
* **Package Manager:** `npm` (bundled with Node) or `bun`.

### Installation & Startup
```bash
# 1. Clone repository
git clone <repository-url>
cd datafix

# 2. Install dependencies
npm install

# 3. Start development server (Node.js + Vite middleware)
npm run dev

# The application is now running on http://localhost:3000
```

### Running Tests
```bash
# Run TypeScript regression tests
npx tsx tests/regression_suite.ts

# Run Python engine regression tests
python3 tests/test_datafix_engine.py

# Run static type checks
npm run lint

# Build production bundle
npm run build
```

---

## 25. Environment Variables

| Variable | Required | Used By | Purpose | Example |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Optional (Provided by Railway) | `server.ts` | The HTTP port Express binds to. Defaults to `3000` locally. Railway automatically injects this variable. | `PORT=4173` |
| `NODE_ENV` | Optional | `server.ts` | When set to `production`, Express serves precompiled assets from `dist/`. When `development`, mounts Vite middlewares. | `production` |
| `GEMINI_API_KEY` | Optional | `.env.example` | Template variable for optional AI Studio features (unused in core data engine). | `MY_GEMINI_API_KEY` |
| `APP_URL` | Optional | `.env.example` | Application host URL template for Cloud Run. | `https://my-app.run.app` |

*Important Configuration Notes:*
* **No `.env` file is required for Railway deployment.**
* Railway automatically injects the assigned service port via `process.env.PORT`.
* The server reads `const PORT = Number(process.env.PORT) || 3000;` and binds to `0.0.0.0:${PORT}`.
* Local developers can copy `.env.example` to `.env` if desired, but default local startup (`npm run dev`) works out-of-the-box with zero configuration.

---

## 26. Deployment

### Current AI Studio Deployment
In Google AI Studio Build, the application runs on Cloud Run with container port 3000 mapped to `server.ts` (`npm run start` or `npm run dev`). Node.js and Python 3 are present in the Linux container environment.

### Railway Deployment
DataFix is configured for seamless single-service deployment on Railway using Nixpacks:

* **Configuration Files:** `nixpacks.toml` and `railway.json`.
* **Builder:** `NIXPACKS` (defined in `railway.json`).
* **Environment Provisioning (`nixpacks.toml`):**
  ```toml
  [phases.setup]
  nixPkgs = ["nodejs_22", "python3"]

  [phases.install]
  cmds = ["npm install"]

  [phases.build]
  cmds = ["npm run build"]

  [start]
  cmd = "npm run start"
  ```
* **Node.js Requirement:** Node.js `>= 20.0.0` (provided as `nodejs_22` via Nixpacks).
* **Python Requirement:** Python `>= 3.10.0` (provided as `python3` via Nixpacks).
* **Python Dependencies:** **None.** The Python calculation engine (`engine/datafix_engine.py`) uses strictly the Python standard library. No `requirements.txt` or `pip install` is required or needed.
* **Build Command:** `npm run build`
* **Start Command:** `npm run start` (executes `tsx server.ts`)
* **Service Binding:** Express listens on `0.0.0.0` and respects Railway's dynamic `PORT` via `Number(process.env.PORT) || 3000`.
* **Health Check:** Liveness endpoint at `GET /health` returning `{"status":"ok"}` with path configured in `railway.json`.
* **Single-Service Architecture:** Railway hosts both the Express server (serving compiled React `dist/` assets) and executes `python3 engine/datafix_engine.py` for `/api/*` requests in a single container.

### Generic Production Deployment (Docker / VPS / PaaS)
To deploy DataFix in standard production environments:
1. Ensure both **Node.js (>= 20)** and **Python 3 (>= 3.10)** are installed on the host or container.
2. Build the frontend: `npm run build`.
3. Set `NODE_ENV=production`.
4. Start the server: `npm run start` (or `tsx server.ts`).
Express will serve precompiled assets from `dist/` and spawn `engine/datafix_engine.py` for API requests.

### Static Hosting (Vercel / GitHub Pages / Netlify / S3)
Because DataFix contains an isomorphic TypeScript data engine (`src/utils/engine.ts`), the application can also be deployed as a **pure static SPA**:
1. Run `npm run build`.
2. Deploy the `dist/` directory to any static hosting provider.
If `/api/*` endpoints return 404 or are unreachable, the application automatically falls back to in-browser execution with identical statistical behavior.

---

## 27. Security Considerations

* **Client-Side Data Isolation:** Uploaded datasets are processed in memory and never written to permanent disk storage by default.
* **Subprocess Security:** In `server.ts`, Python execution is invoked using `spawn('python3', [path.resolve(process.cwd(), 'engine/datafix_engine.py')])` without shell expansion (`shell: false`). Command-line injection is prevented because input is passed strictly through `stdin` streams, not shell arguments.
* **Payload Limits:** Request bodies on Express are capped at `50mb` to prevent memory exhaustion attacks.
* **No Arbitrary Code Execution:** User filter expressions (`>`, `<`, `==`, `contains`) are parsed using strict numeric comparison and substring matching; `eval()` or dynamic code evaluation is never used.
* **Output Sanitization:** Exported CSV values containing delimiters, quotes, or control characters are enclosed in double quotes according to RFC 4180.

---

## 28. Data Privacy

* In the static deployment, **100% of data processing occurs inside the user's browser memory**. No dataset rows, column names, or cell values are transmitted over the network.
* In the full-stack Express configuration, dataset payloads are transmitted locally to `localhost:3000/api/*` and piped to a local Python subprocess. Data is never forwarded to external third-party APIs, LLM endpoints, or cloud telemetry systems.
* Closing the browser tab clears all dataset state from memory.

---

## 29. Performance Considerations

* **Sweet Spot:** Datasets between **100 and 500,000 cells** (e.g., 50 columns $\times$ 10,000 rows) process with near-instant responsiveness (< 100ms for parsing and scoring).
* **Browser Memory Limits:** Because datasets are stored as JavaScript string arrays in React state, files larger than 100MB may cause noticeable browser garbage collection pauses. For multi-gigabyte datasets, use the documented Laravel / Python batch service architecture.
* **Pagination:** Grid previews render 25 rows at a time to maintain high DOM rendering frame rates.

---

## 30. Known Limitations

1. **In-Memory Scale:** Datasets must fit within client browser memory. Very large datasets (> 100MB) can cause browser tab sluggishness.
2. **Tabular Only:** DataFix is tailored for rectangular tabular data (CSV/TXT). It does not ingest unstructured text, audio, images, or hierarchical JSON/XML trees.
3. **Linear Collinearity Only:** The correlation detector calculates Pearson coefficients ($r$). It does not detect non-linear dependencies (which would require Mutual Information or Spearman rank metrics).
4. **Univariate Outlier Detection:** Outlier detection is based on the Tukey IQR method on individual columns. It does not perform multivariate outlier detection (e.g., Isolation Forest, Mahalanobis distance).
5. **No Native XLSX Ingest:** Direct ingestion of Microsoft Excel `.xlsx` binary workbooks is not currently implemented; workbooks must be saved as `.csv` prior to upload.

---

## 31. Design Decisions

* **Deterministic Logic over LLMs:** DataFix intentionally avoids using Large Language Models to decide how to clean data. Machine learning requires reproducible, deterministic data pipelines. Using an LLM to guess missing values introduces non-deterministic hallucinations into datasets.
* **Separation of Detection and Transformation:** Finding an anomaly is an objective statistical observation; fixing it is a business decision. DataFix never modifies data without user authorization.
* **Isomorphic Architecture:** Implementing the data engine in both Python and TypeScript provides the best developer experience: native Python power when running in full-stack setups, coupled with zero-setup browser execution on static CDNs.
* **Zero-IQR Safety:** Traditional cleaning tools blindly apply IQR clipping to columns with concentrated medians, corrupting features. DataFix treats zero-IQR as a distribution state, not a defect.
* **Zero External Python Dependencies:** Ensuring `datafix_engine.py` runs on the Python Standard Library eliminates `pip install` failures and version conflicts in deployment.

---

## 32. Known Technical Debt

| Area | Problem | Impact | Suggested Direction |
| :--- | :--- | :--- | :--- |
| **Vite Config Warning** | `__dirname` usage in `vite.config.ts` flags a deprecation notice for native config loader. | Build prints a minor deprecation notice. | Migrate to `import.meta.dirname`. |
| **Chunk Size Warning** | Production client bundle (`dist/assets/index-*.js`) is ~790kB, exceeding Vite's 500kB warning threshold. | Initial load time on slow mobile connections. | Introduce `React.lazy()` code-splitting on large views (`ArchitectureModal`, `ExportView`). |
| **State Duplication** | Active dataset state is held in `App.tsx` and duplicated in view components during edit cycles. | Requires careful `useEffect` synchronization. | Consider a lightweight state store (e.g. Zustand) in future major versions. |
| **Excel Ingestion** | Users must convert `.xlsx` files to `.csv` before upload. | Minor user friction when working with Excel workbooks. | Add an in-browser parser for `.xlsx` (e.g. `sheetjs` / `xlsx` library). |

---

## 33. Future Work

### Planned Next Steps
* **Native Excel (.xlsx) Support:** Add client-side parsing for spreadsheet files with sheet selection.
* **Spearman Rank & Mutual Information:** Extend correlation analysis to capture non-linear relationships between non-normal features.
* **Multivariate Outlier Flagging:** Introduce Mahalanobis distance or Isolation Forest indicators for multi-feature leverage points.
* **Vite Bundle Optimization:** Implement route-level code splitting to reduce the vendor bundle below 400kB.

### Speculative Future Concepts
* **SQL Export:** Generate `CREATE TABLE` and SQL DML cleaning queries alongside Python scripts.
* **Multi-Table Joins:** Detect foreign key relationships across multiple uploaded CSV files.
* **Automated Data Profiling PDF:** Render professional quality audit reports as downloadable PDFs.

---

## 34. Development Workflow

To safely modify and extend DataFix:
1. **Inspect Parity:** If modifying data processing math, update **both** `engine/datafix_engine.py` and `src/utils/engine.ts`.
2. **Execute Tests:** Run both regression suites to verify parity:
   ```bash
   npx tsx tests/regression_suite.ts
   python3 tests/test_datafix_engine.py
   ```
3. **Verify Types:** Run the linter to ensure no type regressions:
   ```bash
   npm run lint
   ```
4. **Compile Bundle:** Confirm production build succeeds:
   ```bash
   npm run build
   ```
5. **Verify UI:** Test both English and Persian locales to ensure RTL layouts do not break.

---

## 35. Troubleshooting

* **Python subprocess errors on `/api/*`:** Ensure `python3` is installed and in your system PATH (`python3 --version`). If Python is missing, the application will automatically fall back to browser execution.
* **Vite deprecation warning during build:** Vite 8 flags `__dirname`. This is a build-time warning and does not affect the runtime bundle.
* **Persian characters corrupted in Excel:** Excel requires a UTF-8 BOM to correctly recognize Persian text. DataFix automatically includes this BOM when clicking "Download Cleaned CSV".
* **Port 3000 in use:** Set the `PORT` environment variable before running `npm run dev`:
  ```bash
  PORT=3001 npm run dev
  ```

---

## 36. File-by-File Technical Reference

### `src/utils/engine.ts`
* **Purpose:** Core client-side processing engine and full-stack API caller.
* **Exports:** `parseCsv`, `localAnalyzeDataset`, `localApplyTransformations`, `executeDatasetAnalysis`, `executePreviewTransform`, `executeApplyTransform`, `generatePythonScript`, `calculatePearsonCorrelation`, `normalizePersianArabicDigits`.
* **Consumes:** `src/types/dataset.ts`.
* **Used by:** `App.tsx`, `UploadView.tsx`, `CleaningWorkspaceView.tsx`, `ReviewChangesView.tsx`, `ExportView.tsx`, `tests/regression_suite.ts`.
* **Important Behavior:** Implements the RFC 4180 parser, Tukey outlier math, Pearson correlation, and fallback logic if Express `/api/*` routes are unreachable.

### `engine/datafix_engine.py`
* **Purpose:** Backend Python calculation engine.
* **Exports:** Python script executable via CLI / stdin JSON protocol.
* **Consumes:** Python Standard Library (`sys`, `json`, `csv`, `math`, `statistics`, `re`).
* **Used by:** `server.ts` (via `child_process.spawn`) and `tests/test_datafix_engine.py`.
* **Important Behavior:** Executes analysis, previews, and transformations with identical output structure to `src/utils/engine.ts`.

### `src/utils/recommendations.ts`
* **Purpose:** Heuristic recommendation engine.
* **Exports:** `getActionableRecommendations`, `applyRecommendation`, `applyAllRecommendations`, `getDefaultOperations`.
* **Consumes:** `src/types/dataset.ts`.
* **Used by:** `QualityAnalysisView.tsx`, `CleaningWorkspaceView.tsx`, `tests/regression_suite.ts`.
* **Important Behavior:** Evaluates dataset analysis metrics and creates prioritized recommendations with confidence ratings, risk warnings, and score recovery calculations.

### `server.ts`
* **Purpose:** Express application server.
* **Exports:** Web server listening on port 3000.
* **Consumes:** `express`, `vite`, `child_process`, `path`, `fs`.
* **Used by:** `npm run dev`, `npm run start`.
* **Important Behavior:** Spawns `engine/datafix_engine.py` for `/api/analyze`, `/api/preview-transform`, and `/api/apply-transform`, and serves Vite middlewares or static files.

### `src/components/CleaningWorkspaceView.tsx`
* **Purpose:** Primary workspace for configuring cleaning transformations.
* **Exports:** `CleaningWorkspaceView`.
* **Consumes:** `src/types/dataset.ts`, `src/utils/engine.ts`, `src/utils/recommendations.ts`, `src/i18n/context.tsx`.
* **Used by:** `src/App.tsx`.
* **Important Behavior:** Manages pending operations state, target column designation, tabbed configuration views, and initiates transformation previews.

### `src/components/ReviewChangesView.tsx`
* **Purpose:** Review screen displaying pre-apply transformation diffs and audit trail.
* **Exports:** `ReviewChangesView`.
* **Consumes:** `src/types/dataset.ts`, `src/i18n/context.tsx`.
* **Used by:** `src/App.tsx`.
* **Important Behavior:** Visualizes 5-part audit cards (Detection, Why Detected, Rationale, Risk, User Action) and cell-level diff samples.

### `src/components/ArchitectureModal.tsx`
* **Purpose:** Interactive developer documentation modal for Laravel + Python integration.
* **Exports:** `ArchitectureModal`.
* **Consumes:** `src/i18n/context.tsx`.
* **Used by:** `src/components/Navbar.tsx`, `src/App.tsx`.
* **Important Behavior:** Provides step-by-step and full-source file views for integrating DataFix into a Laravel application.

---

## 37. Glossary

* **Dataset Hygiene:** Technical data cleanliness (absence of corruption, uniform types, resolved missingness, verified duplicates, and valid encodings), distinct from predictive model suitability.
* **Structural Validation:** Verification that a file conforms to CSV format standards (delimiter consistency, quote escaping, field counts matching header length).
* **Outlier:** A numerical value that lies beyond $1.5 \times \text{IQR}$ from the first or third quartile. Does not automatically imply the observation is an error.
* **Interquartile Range (IQR):** The distance between the 75th percentile ($Q3$) and the 25th percentile ($Q1$).
* **Zero-IQR Column:** A numeric column where $Q1 = \text{Median} = Q3$, indicating that at least 50% of values are identical. Standard clipping algorithms fail on these distributions.
* **Imputation:** Replacing missing or unrecorded cells with estimated values (such as column mean, median, mode, or custom placeholder).
* **Prediction Target:** The dependent variable ($y$) intended to be predicted by machine learning models.
* **Redundant / Collinear Pair:** Two columns exhibiting a near-perfect linear correlation ($|r| \ge 0.98$), often representing the same physical phenomenon measured in different units.
* **Audit Trail:** A complete, human-readable record detailing what operations were performed, why they were detected, what statistical trade-offs were considered, and how many records were affected.
* **Reproducible Pipeline:** An executable Python/Pandas script reflecting the exact sequence of cleaning transformations executed in the UI.

---

## 38. Final Project Status

| Area | Status | Factual Notes |
| :--- | :--- | :--- |
| **Frontend Application** | Complete | React 19 SPA running on Vite with TypeScript, Tailwind CSS, and bilingual i18n. |
| **Python Engine** | Complete | Standalone, deterministic script using Python Standard Library; parity-tested against TypeScript. |
| **Isomorphic TypeScript Engine** | Complete | Browser-compatible engine providing seamless offline/static fallback. |
| **Recommendation Engine** | Complete | Context-aware heuristics with confidence ratings and explicit statistical trade-offs. |
| **Cleaning Workspace** | Complete | Multi-category transformation interface with pending changes tracking and preview diffs. |
| **Export Subsystem** | Complete | Cleaned CSV (with UTF-8 BOM), JSON records array, Markdown report, and Python script. |
| **Regression Test Suites** | Passing | 5/5 TypeScript regression tests and 5/5 Python engine parity tests passing. |
| **Static Analysis / Lint** | Passing | `tsc --noEmit` passes with 0 warnings or errors. |
| **Build Pipeline** | Passing | `vite build` compiles production assets cleanly. |
| **Laravel Integration** | Complete (Blueprint) | Architectural documentation and code reference model accessible via UI modal. |
| **Database / Persistence** | In-Memory | Active sessions store state in browser memory; persistent database storage is documented in the Laravel blueprint. |
