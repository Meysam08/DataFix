#!/usr/bin/env python3
"""
DataFix Python Data Processing Engine
Deterministic dataset analysis, quality scoring, and transformation engine.
"""

import sys
import json
import csv
import io
import math
import statistics
import re
from datetime import datetime
from collections import Counter

def is_empty_value(val):
    if val is None:
        return True
    s = str(val).strip().lower()
    return s in ('', 'null', 'nan', 'none', 'na', 'n/a', '?', 'nil', '#n/a')

def try_parse_numeric(val):
    if is_empty_value(val):
        return None
    s = str(val).strip().replace(',', '')
    try:
        if '.' in s or 'e' in s.lower():
            return float(s)
        return int(s)
    except ValueError:
        return None

def try_parse_date(val):
    if is_empty_value(val):
        return None
    s = str(val).strip()
    if len(s) < 6:
        return None
    date_formats = [
        "%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y",
        "%m-%d-%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"
    ]
    for fmt in date_formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None

def is_boolean(val):
    if is_empty_value(val):
        return None
    s = str(val).strip().lower()
    if s in ('true', 'false', 't', 'f', 'yes', 'no', '1', '0'):
        return s in ('true', 't', 'yes', '1')
    return None

def infer_column_type(values):
    non_empty = [v for v in values if not is_empty_value(v)]
    if not non_empty:
        return 'string'

    total = len(non_empty)
    int_count = 0
    float_count = 0
    date_count = 0
    bool_count = 0

    for v in non_empty:
        parsed_num = try_parse_numeric(v)
        if parsed_num is not None:
            if isinstance(parsed_num, int):
                int_count += 1
            else:
                float_count += 1
            continue

        if is_boolean(v) is not None:
            bool_count += 1
            continue

        if try_parse_date(v) is not None:
            date_count += 1
            continue

    if (int_count + float_count) / total >= 0.8:
        return 'integer' if (int_count / total >= 0.8 and float_count == 0) else 'float'
    if bool_count / total >= 0.8:
        return 'boolean'
    if date_count / total >= 0.8:
        return 'datetime'
    return 'string'

def parse_csv_stream(csv_content):
    if not csv_content:
        return [], []

    # Strip UTF-8 BOM if present
    if csv_content.startswith('\ufeff'):
        csv_content = csv_content[1:]

    # Detect delimiter by counting unquoted occurrences
    sample = csv_content[:4096]
    comma_count = 0
    semi_count = 0
    tab_count = 0
    in_quote = False
    for i, c in enumerate(sample):
        if c == '"':
            if in_quote and i + 1 < len(sample) and sample[i+1] == '"':
                continue
            in_quote = not in_quote
        elif not in_quote:
            if c == ',': comma_count += 1
            elif c == ';': semi_count += 1
            elif c == '\t': tab_count += 1
            elif c == '\n':
                if comma_count > 0 or semi_count > 0 or tab_count > 0:
                    break

    delimiter = ','
    if semi_count > comma_count and semi_count > tab_count:
        delimiter = ';'
    elif tab_count > comma_count and tab_count > semi_count:
        delimiter = '\t'

    f = io.StringIO(csv_content.strip())
    reader = csv.reader(f, delimiter=delimiter)
    try:
        rows = list(reader)
    except Exception:
        # Fallback if unclosed quote at end
        f.seek(0)
        rows = []
        for line in f:
            rows.append(line.rstrip('\r\n').split(delimiter))

    if not rows:
        return [], []
    headers = [h.strip() if h.strip() else f"column_{i+1}" for i, h in enumerate(rows[0])]
    data = rows[1:]
    # Normalize row lengths
    col_count = len(headers)
    normalized_data = []
    for r in data:
        if not any(r):
            continue
        if len(r) < col_count:
            r = r + [''] * (col_count - len(r))
        elif len(r) > col_count:
            r = r[:col_count]
        normalized_data.append(r)
    return headers, normalized_data

def calculate_stats(numbers):
    if not numbers:
        return None
    sorted_nums = sorted(numbers)
    n = len(sorted_nums)
    min_val = sorted_nums[0]
    max_val = sorted_nums[-1]
    mean_val = sum(sorted_nums) / n
    median_val = statistics.median(sorted_nums)
    
    std_val = statistics.stdev(sorted_nums) if n > 1 else 0.0

    # Percentiles for IQR
    def get_percentile(data, p):
        k = (len(data) - 1) * p
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return data[int(k)]
        d0 = data[int(f)] * (c - k)
        d1 = data[int(c)] * (k - f)
        return d0 + d1

    q1 = get_percentile(sorted_nums, 0.25)
    q3 = get_percentile(sorted_nums, 0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outliers = [x for x in sorted_nums if x < lower_bound or x > upper_bound]

    return {
        'min': round(min_val, 4),
        'max': round(max_val, 4),
        'mean': round(mean_val, 4),
        'median': round(median_val, 4),
        'std_dev': round(std_val, 4),
        'q1': round(q1, 4),
        'q3': round(q3, 4),
        'iqr': round(iqr, 4),
        'lower_bound': round(lower_bound, 4),
        'upper_bound': round(upper_bound, 4),
        'outlier_count': len(outliers),
        'sample_outliers': [round(x, 4) for x in outliers[:5]]
    }

def analyze_dataset(headers, data):
    total_rows = len(data)
    total_cols = len(headers)
    
    if total_rows == 0 or total_cols == 0:
        return {
            'rows': 0,
            'columns': [],
            'column_names': [],
            'missing_values': 0,
            'missing_pct': 0,
            'duplicate_rows': 0,
            'duplicate_pct': 0,
            'quality_score': 0,
            'detected_issues': [{'severity': 'high', 'title': 'Empty Dataset', 'description': 'The provided CSV file contains no data rows.'}],
            'preview_rows': []
        }

    # Duplicate rows detection
    row_strings = [tuple(r) for r in data]
    row_counts = Counter(row_strings)
    duplicate_rows = sum(count - 1 for count in row_counts.values() if count > 1)
    duplicate_pct = round((duplicate_rows / total_rows) * 100, 2)

    total_cells = total_rows * total_cols
    total_missing_cells = 0
    column_analysis = []
    detected_issues = []

    for col_idx, col_name in enumerate(headers):
        col_values = [r[col_idx] for r in data]
        non_empty = [v for v in col_values if not is_empty_value(v)]
        missing_count = total_rows - len(non_empty)
        total_missing_cells += missing_count
        missing_pct = round((missing_count / total_rows) * 100, 2)
        unique_vals = set(non_empty)
        unique_count = len(unique_vals)
        inferred_type = infer_column_type(col_values)
        is_empty = (len(non_empty) == 0)

        # Type consistency & numbers
        type_inconsistencies = 0
        numeric_values = []
        if inferred_type in ('integer', 'float'):
            for v in non_empty:
                num = try_parse_numeric(v)
                if num is not None:
                    numeric_values.append(num)
                else:
                    type_inconsistencies += 1

        stats = calculate_stats(numeric_values) if numeric_values else None

        # Mode calculation
        mode_val = None
        if non_empty:
            mode_val = Counter(non_empty).most_common(1)[0][0]

        # Issues detection
        if is_empty:
            detected_issues.append({
                'severity': 'high',
                'title': f'Empty Column: {col_name}',
                'column': col_name,
                'description': f'Column "{col_name}" contains 100% missing values and adds no predictive value.',
                'recommendation': 'Drop column'
            })
        elif missing_pct > 20:
            detected_issues.append({
                'severity': 'high' if missing_pct > 50 else 'medium',
                'title': f'High Missing Rate in {col_name}',
                'column': col_name,
                'description': f'Column has {missing_count} missing values ({missing_pct}% of rows).',
                'recommendation': 'Impute with median/mode or drop rows' if missing_pct <= 50 else 'Consider dropping column'
            })
        elif missing_count > 0:
            detected_issues.append({
                'severity': 'low',
                'title': f'Missing Values in {col_name}',
                'column': col_name,
                'description': f'{missing_count} empty cells detected ({missing_pct}%).',
                'recommendation': 'Impute or drop rows'
            })

        if type_inconsistencies > 0:
            detected_issues.append({
                'severity': 'medium',
                'title': f'Type Inconsistencies in {col_name}',
                'column': col_name,
                'description': f'{type_inconsistencies} values in column "{col_name}" cannot be parsed as {inferred_type}.',
                'recommendation': 'Cast or clean invalid text strings'
            })

        if stats and stats.get('outlier_count', 0) > 0:
            outlier_cnt = stats['outlier_count']
            outlier_pct = round((outlier_cnt / len(numeric_values)) * 100, 2)
            if outlier_pct > 1.0:
                detected_issues.append({
                    'severity': 'low' if outlier_pct < 5.0 else 'medium',
                    'title': f'Potential Outliers in {col_name}',
                    'column': col_name,
                    'description': f'{outlier_cnt} values ({outlier_pct}%) outside standard 1.5x IQR range [{stats["lower_bound"]}, {stats["upper_bound"]}].',
                    'recommendation': 'Inspect distribution or clip extreme outliers'
                })

        # Sample values
        sample_values = list(unique_vals)[:5]

        column_analysis.append({
            'index': col_idx,
            'name': col_name,
            'type': inferred_type,
            'missing_count': missing_count,
            'missing_pct': missing_pct,
            'unique_count': unique_count,
            'unique_pct': round((unique_count / total_rows) * 100, 2),
            'is_empty': is_empty,
            'mode': mode_val,
            'stats': stats,
            'type_inconsistencies': type_inconsistencies,
            'sample_values': sample_values
        })

    if duplicate_rows > 0:
        detected_issues.append({
            'severity': 'high' if duplicate_pct > 10 else 'medium',
            'title': f'{duplicate_rows} Duplicate Rows Detected',
            'column': 'All',
            'description': f'{duplicate_rows} exact duplicate rows found ({duplicate_pct}% of total dataset).',
            'recommendation': 'Remove duplicate rows'
        })

    # Deterministic Data Quality Score:
    # Starts at 100:
    # - Deduct up to 35 pts for missing cell ratio
    # - Deduct up to 25 pts for duplicate row ratio
    # - Deduct up to 20 pts for empty columns
    # - Deduct up to 10 pts for type inconsistencies
    # - Deduct up to 10 pts for extreme outliers (>5% of numeric rows)
    missing_ratio = total_missing_cells / total_cells if total_cells > 0 else 0
    missing_penalty = min(35, missing_ratio * 100 * 0.7)
    
    dup_ratio = duplicate_rows / total_rows if total_rows > 0 else 0
    dup_penalty = min(25, dup_ratio * 100 * 0.8)

    empty_cols = sum(1 for c in column_analysis if c['is_empty'])
    empty_col_penalty = min(20, (empty_cols / total_cols) * 100 if total_cols > 0 else 0)

    inconsistencies = sum(c['type_inconsistencies'] for c in column_analysis)
    incon_penalty = min(10, (inconsistencies / total_cells) * 100 * 5) if total_cells > 0 else 0

    total_outliers = sum(c['stats']['outlier_count'] for c in column_analysis if c.get('stats'))
    outlier_penalty = min(10, (total_outliers / total_cells) * 100 * 0.5) if total_cells > 0 else 0

    quality_score = max(5, round(100 - (missing_penalty + dup_penalty + empty_col_penalty + incon_penalty + outlier_penalty)))

    # Preview rows (first 25 rows as dicts for clean display)
    preview_rows = []
    for r_idx, row in enumerate(data[:25]):
        row_dict = {'_row_id': r_idx + 1}
        for c_idx, h in enumerate(headers):
            row_dict[h] = row[c_idx]
        preview_rows.append(row_dict)

    return {
        'rows': total_rows,
        'columns': column_analysis,
        'column_names': headers,
        'missing_values': total_missing_cells,
        'missing_pct': round((total_missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0,
        'duplicate_rows': duplicate_rows,
        'duplicate_pct': duplicate_pct,
        'quality_score': quality_score,
        'score_breakdown': {
            'missing_penalty': round(missing_penalty, 1),
            'duplicate_penalty': round(dup_penalty, 1),
            'empty_col_penalty': round(empty_col_penalty, 1),
            'type_penalty': round(incon_penalty, 1),
            'outlier_penalty': round(outlier_penalty, 1)
        },
        'detected_issues': detected_issues,
        'preview_rows': preview_rows
    }

def apply_transformations(headers, data, operations):
    """
    Applies operations deterministically.
    operations schema:
    {
      "remove_duplicates": bool,
      "missing_actions": {
         "global": "none" | "drop_rows",
         "columns": { "col_name": { "action": "drop_rows" | "mean" | "median" | "mode" | "custom", "value": "..." } }
      },
      "type_conversions": { "col_name": "integer" | "float" | "string" | "boolean" },
      "drop_columns": ["col_name", ...],
      "rename_columns": { "col_name": "new_name", ... },
      "filter_rules": [ { "column": "col_name", "operator": ">" | "<" | ">=" | "<=" | "==" | "!=" | "contains", "value": "..." } ],
      "outlier_actions": { "col_name": "remove" | "clip" }
    }
    """
    current_headers = list(headers)
    current_data = [list(r) for r in data]
    warnings = []
    applied_operations_summary = []
    diff_samples = []

    # 1. Remove duplicate rows
    if operations.get('remove_duplicates', False):
        orig_count = len(current_data)
        seen = set()
        deduped = []
        for r in current_data:
            t = tuple(r)
            if t not in seen:
                seen.add(t)
                deduped.append(r)
        removed = orig_count - len(deduped)
        current_data = deduped
        if removed > 0:
            applied_operations_summary.append(f"Removed {removed} duplicate row(s)")

    # 2. Missing value handling
    missing_actions = operations.get('missing_actions', {})
    col_actions = missing_actions.get('columns', {})
    global_action = missing_actions.get('global', 'none')

    # If global action is drop_rows
    if global_action == 'drop_rows':
        orig_count = len(current_data)
        filtered = [r for r in current_data if not any(is_empty_value(v) for v in r)]
        dropped = orig_count - len(filtered)
        current_data = filtered
        if dropped > 0:
            applied_operations_summary.append(f"Dropped {dropped} row(s) containing any missing values")

    # Column-specific missing actions
    for col_name, act in col_actions.items():
        if col_name not in current_headers:
            continue
        c_idx = current_headers.index(col_name)
        action_type = act.get('action')

        if action_type == 'drop_rows':
            orig_count = len(current_data)
            current_data = [r for r in current_data if not is_empty_value(r[c_idx])]
            dropped = orig_count - len(current_data)
            if dropped > 0:
                applied_operations_summary.append(f"Dropped {dropped} row(s) with missing '{col_name}'")

        elif action_type in ('mean', 'median', 'mode', 'custom'):
            col_vals = [r[c_idx] for r in current_data if not is_empty_value(r[c_idx])]
            fill_val = None

            if action_type == 'custom':
                fill_val = str(act.get('value', ''))
            elif action_type == 'mode':
                if col_vals:
                    fill_val = Counter(col_vals).most_common(1)[0][0]
            elif action_type in ('mean', 'median'):
                numeric_vals = [try_parse_numeric(v) for v in col_vals]
                numeric_vals = [n for n in numeric_vals if n is not None]
                if numeric_vals:
                    if action_type == 'mean':
                        fill_val = str(round(sum(numeric_vals) / len(numeric_vals), 2))
                    else:
                        fill_val = str(round(statistics.median(numeric_vals), 2))
                else:
                    warnings.append(f"Cannot calculate {action_type} for non-numeric column '{col_name}'")

            if fill_val is not None:
                imputed_count = 0
                for r_idx, r in enumerate(current_data):
                    if is_empty_value(r[c_idx]):
                        orig_val = r[c_idx]
                        r[c_idx] = fill_val
                        imputed_count += 1
                        if len(diff_samples) < 8:
                            diff_samples.append({
                                'row_index': r_idx + 1,
                                'column': col_name,
                                'original': orig_val if orig_val != '' else '(empty)',
                                'new': fill_val,
                                'action': f"Imputed with {action_type}"
                            })
                if imputed_count > 0:
                    applied_operations_summary.append(f"Filled {imputed_count} missing cell(s) in '{col_name}' with {action_type} ({fill_val})")

    # 3. Outlier handling
    outlier_actions = operations.get('outlier_actions', {})
    for col_name, act in outlier_actions.items():
        if col_name not in current_headers:
            continue
        c_idx = current_headers.index(col_name)
        num_vals = []
        for r in current_data:
            n = try_parse_numeric(r[c_idx])
            if n is not None:
                num_vals.append(n)
        if not num_vals:
            continue
        stats = calculate_stats(num_vals)
        if not stats or stats['outlier_count'] == 0:
            continue

        lb = stats['lower_bound']
        ub = stats['upper_bound']

        if act == 'remove':
            orig_count = len(current_data)
            def keep_row(r):
                n = try_parse_numeric(r[c_idx])
                if n is None:
                    return True
                return lb <= n <= ub
            current_data = [r for r in current_data if keep_row(r)]
            removed = orig_count - len(current_data)
            if removed > 0:
                applied_operations_summary.append(f"Removed {removed} row(s) with outliers in '{col_name}' outside [{lb}, {ub}]")

        elif act == 'clip':
            clipped_count = 0
            for r in current_data:
                n = try_parse_numeric(r[c_idx])
                if n is not None:
                    if n < lb:
                        r[c_idx] = str(lb)
                        clipped_count += 1
                    elif n > ub:
                        r[c_idx] = str(ub)
                        clipped_count += 1
            if clipped_count > 0:
                applied_operations_summary.append(f"Clipped {clipped_count} outlier value(s) in '{col_name}' to boundary [{lb}, {ub}]")

    # 4. Filter rules
    filter_rules = operations.get('filter_rules', [])
    for rule in filter_rules:
        col_name = rule.get('column')
        op = rule.get('operator')
        target_val = rule.get('value')
        if col_name not in current_headers or target_val is None:
            continue
        c_idx = current_headers.index(col_name)
        orig_count = len(current_data)

        def matches_rule(r):
            cell = r[c_idx]
            if is_empty_value(cell):
                return False
            # Check numeric comparison
            num_cell = try_parse_numeric(cell)
            num_target = try_parse_numeric(target_val)
            if num_cell is not None and num_target is not None:
                if op == '>': return num_cell > num_target
                if op == '<': return num_cell < num_target
                if op == '>=': return num_cell >= num_target
                if op == '<=': return num_cell <= num_target
                if op == '==': return num_cell == num_target
                if op == '!=': return num_cell != num_target
            # Text comparison
            s_cell = str(cell).lower()
            s_target = str(target_val).lower()
            if op == '==': return s_cell == s_target
            if op == '!=': return s_cell != s_target
            if op == 'contains': return s_target in s_cell
            return True

        current_data = [r for r in current_data if matches_rule(r)]
        removed = orig_count - len(current_data)
        applied_operations_summary.append(f"Filtered rows where '{col_name}' {op} '{target_val}' ({removed} rows removed)")

    # 5. Type Conversions
    type_conversions = operations.get('type_conversions', {})
    for col_name, target_type in type_conversions.items():
        if col_name not in current_headers:
            continue
        c_idx = current_headers.index(col_name)
        conv_failures = 0
        converted_count = 0

        for r in current_data:
            cell = r[c_idx]
            if is_empty_value(cell):
                continue
            if target_type == 'integer':
                num = try_parse_numeric(cell)
                if num is not None:
                    r[c_idx] = str(int(round(num)))
                    converted_count += 1
                else:
                    conv_failures += 1
            elif target_type == 'float':
                num = try_parse_numeric(cell)
                if num is not None:
                    r[c_idx] = str(float(num))
                    converted_count += 1
                else:
                    conv_failures += 1
            elif target_type == 'boolean':
                b = is_boolean(cell)
                if b is not None:
                    r[c_idx] = "True" if b else "False"
                    converted_count += 1
                else:
                    conv_failures += 1
            elif target_type == 'string':
                r[c_idx] = str(cell)
                converted_count += 1

        if conv_failures > 0:
            warnings.append(f"{conv_failures} cell(s) in '{col_name}' could not be converted to {target_type} and were left unchanged")
        if converted_count > 0:
            applied_operations_summary.append(f"Cast column '{col_name}' to {target_type} ({converted_count} cells formatted)")

    # 6. Drop columns
    drop_columns = operations.get('drop_columns', [])
    valid_drops = [c for c in drop_columns if c in current_headers]
    if valid_drops:
        keep_indices = [i for i, h in enumerate(current_headers) if h not in valid_drops]
        current_headers = [current_headers[i] for i in keep_indices]
        current_data = [[r[i] for i in keep_indices] for r in current_data]
        applied_operations_summary.append(f"Dropped {len(valid_drops)} column(s): {', '.join(valid_drops)}")

    # 7. Rename columns
    rename_map = operations.get('rename_columns', {})
    renamed_count = 0
    for i, h in enumerate(current_headers):
        if h in rename_map and rename_map[h].strip():
            new_name = rename_map[h].strip()
            if new_name != h:
                current_headers[i] = new_name
                renamed_count += 1
    if renamed_count > 0:
        applied_operations_summary.append(f"Renamed {renamed_count} column(s)")

    # Calculate post-transformation analysis
    new_analysis = analyze_dataset(current_headers, current_data)

    return {
        'headers': current_headers,
        'data': current_data,
        'new_analysis': new_analysis,
        'applied_operations': applied_operations_summary,
        'warnings': warnings,
        'diff_samples': diff_samples
    }

def format_csv_field(val):
    if val is None:
        return ''
    s = str(val)
    if any(c in s for c in (',', '"', '\n', '\r', ';', '\t')) or (s and (s[0].isspace() or s[-1].isspace())):
        return '"' + s.replace('"', '""') + '"'
    return s

def export_csv_string(headers, data):
    lines = [','.join(format_csv_field(h) for h in headers)]
    for r in data:
        lines.append(','.join(format_csv_field(cell) for cell in r))
    return '\n'.join(lines)

def generate_python_repro_code(operations, filename="dataset.csv"):
    """
    Generates reproducible pandas cleaning code for ML practitioners.
    Safely escapes column names, filenames, and replacement values.
    Uses semantic boolean conversion instead of raw astype(bool).
    """
    clean_filename = "cleaned_" + filename if not filename.startswith("cleaned_") else filename
    lines = [
        "# DataFix Generated Preparation Pipeline",
        "# Deterministic ML Preprocessing Script",
        "import pandas as pd",
        "import numpy as np",
        "",
        "# 1. Load Dataset",
        f"df = pd.read_csv({json.dumps(filename)})",
        "print(f'Initial shape: {df.shape}')",
        ""
    ]

    if operations.get('remove_duplicates', False):
        lines.append("# 2. Remove duplicate rows")
        lines.append("initial_rows = len(df)")
        lines.append("df = df.drop_duplicates()")
        lines.append("print(f'Dropped {initial_rows - len(df)} duplicate row(s)')\n")

    missing = operations.get('missing_actions', {})
    if missing.get('global') == 'drop_rows':
        lines.append("# 3. Drop rows with any missing values")
        lines.append("initial_rows = len(df)")
        lines.append("df = df.dropna()")
        lines.append("print(f'Dropped {initial_rows - len(df)} row(s) containing missing values')\n")
    
    col_missing = missing.get('columns', {})
    for col, act in col_missing.items():
        a = act.get('action')
        col_repr = json.dumps(col)
        if a == 'drop_rows':
            lines.append(f"df = df.dropna(subset=[{col_repr}])")
        elif a == 'mean':
            lines.append(f"df[{col_repr}] = df[{col_repr}].fillna(df[{col_repr}].mean())")
        elif a == 'median':
            lines.append(f"df[{col_repr}] = df[{col_repr}].fillna(df[{col_repr}].median())")
        elif a == 'mode':
            lines.append(f"mode_val = df[{col_repr}].mode()[0] if not df[{col_repr}].mode().empty else np.nan")
            lines.append(f"df[{col_repr}] = df[{col_repr}].fillna(mode_val)")
        elif a == 'custom':
            val = act.get('value', '')
            lines.append(f"df[{col_repr}] = df[{col_repr}].fillna({json.dumps(val)})")

    outlier_actions = operations.get('outlier_actions', {})
    for col, act in outlier_actions.items():
        if act == 'keep':
            continue
        col_repr = json.dumps(col)
        lines.append(f"\n# Outlier handling for {col_repr} (1.5x IQR)")
        lines.append(f"q1 = df[{col_repr}].quantile(0.25)")
        lines.append(f"q3 = df[{col_repr}].quantile(0.75)")
        lines.append("iqr = q3 - q1")
        lines.append("lower_bound = q1 - 1.5 * iqr")
        lines.append("upper_bound = q3 + 1.5 * iqr")
        if act == 'remove':
            lines.append(f"df = df[(df[{col_repr}] >= lower_bound) & (df[{col_repr}] <= upper_bound)]")
        elif act == 'clip':
            lines.append(f"df[{col_repr}] = df[{col_repr}].clip(lower=lower_bound, upper=upper_bound)")

    filter_rules = operations.get('filter_rules', [])
    for rule in filter_rules:
        col = rule.get('column')
        op = rule.get('operator')
        val = rule.get('value')
        if col and op and val is not None:
            col_repr = json.dumps(col)
            num_val = try_parse_numeric(val)
            if num_val is not None and op in ('>', '<', '>=', '<=', '=='):
                lines.append(f"df = df[pd.to_numeric(df[{col_repr}], errors='coerce') {op} {num_val}]")
            elif num_val is not None and op == '!=':
                lines.append(f"df = df[pd.to_numeric(df[{col_repr}], errors='coerce') != {num_val}]")
            elif op == '==':
                lines.append(f"df = df[df[{col_repr}].astype(str).str.lower() == {json.dumps(str(val).lower())}]")
            elif op == '!=':
                lines.append(f"df = df[df[{col_repr}].astype(str).str.lower() != {json.dumps(str(val).lower())}]")
            elif op == 'contains':
                lines.append(f"df = df[df[{col_repr}].astype(str).str.contains({json.dumps(str(val))}, case=False, na=False)]")

    type_conversions = operations.get('type_conversions', {})
    for col, dtype in type_conversions.items():
        col_repr = json.dumps(col)
        if dtype == 'integer':
            lines.append(f"df[{col_repr}] = pd.to_numeric(df[{col_repr}], errors='coerce').round().astype('Int64')")
        elif dtype == 'float':
            lines.append(f"df[{col_repr}] = pd.to_numeric(df[{col_repr}], errors='coerce')")
        elif dtype == 'string':
            lines.append(f"df[{col_repr}] = df[{col_repr}].astype(str)")
        elif dtype == 'boolean':
            lines.append(f"# Safe semantic boolean conversion for {col_repr} (explicit mapping, never naive astype(bool))")
            lines.append(f"_bool_map = {{'true': True, 't': True, 'yes': True, '1': True, '1.0': True, 'false': False, 'f': False, 'no': False, '0': False, '0.0': False}}")
            lines.append(f"_norm = df[{col_repr}].astype(str).str.strip().str.lower()")
            lines.append(f"_mapped = _norm.map(_bool_map)")
            lines.append(f"_invalid_cnt = (df[{col_repr}].notna() & _mapped.isna()).sum()")
            lines.append(f"if _invalid_cnt > 0:")
            lines.append(f"    print(f'Warning: {{_invalid_cnt}} invalid boolean value(s) in {col_repr} coerced to NA')")
            lines.append(f"df[{col_repr}] = _mapped.astype('boolean')")

    drop_cols = operations.get('drop_columns', [])
    if drop_cols:
        lines.append(f"\n# Drop unneeded columns")
        lines.append(f"df = df.drop(columns={json.dumps(drop_cols)}, errors='ignore')")

    rename_cols = operations.get('rename_columns', {})
    if rename_cols:
        lines.append(f"\n# Rename columns")
        lines.append(f"df = df.rename(columns={json.dumps(rename_cols)})")

    lines.append("\n# Final output")
    lines.append("print(f'Final cleaned shape: {df.shape}')")
    lines.append(f"df.to_csv({json.dumps(clean_filename)}, index=False)")
    lines.append(f"print(f'Saved cleaned dataset to {clean_filename}')")

    return "\n".join(lines)

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({'error': 'No input provided'}))
            sys.exit(1)
        
        payload = json.loads(raw_input, strict=False)
        command = payload.get('command', 'analyze')
        csv_content = payload.get('csv_content', '')

        headers, data = parse_csv_stream(csv_content)

        if command == 'analyze':
            analysis = analyze_dataset(headers, data)
            print(json.dumps({'status': 'success', 'analysis': analysis}))

        elif command == 'preview_transform':
            operations = payload.get('operations', {})
            result = apply_transformations(headers, data, operations)
            preview_rows = []
            for r_idx, row in enumerate(result['data'][:25]):
                row_dict = {'_row_id': r_idx + 1}
                for c_idx, h in enumerate(result['headers']):
                    row_dict[h] = row[c_idx]
                preview_rows.append(row_dict)

            py_code = generate_python_repro_code(operations, payload.get('filename', 'dataset.csv'))

            print(json.dumps({
                'status': 'success',
                'original_rows': len(data),
                'new_rows': len(result['data']),
                'rows_removed': len(data) - len(result['data']),
                'original_columns': len(headers),
                'new_columns': len(result['headers']),
                'columns_removed': len(headers) - len(result['headers']),
                'new_headers': result['headers'],
                'new_quality_score': result['new_analysis']['quality_score'],
                'new_analysis': result['new_analysis'],
                'applied_operations': result['applied_operations'],
                'warnings': result['warnings'],
                'diff_samples': result['diff_samples'],
                'preview_rows': preview_rows,
                'python_code': py_code
            }))

        elif command == 'apply_transform':
            operations = payload.get('operations', {})
            result = apply_transformations(headers, data, operations)
            cleaned_csv = export_csv_string(result['headers'], result['data'])
            py_code = generate_python_repro_code(operations, payload.get('filename', 'dataset.csv'))
            print(json.dumps({
                'status': 'success',
                'cleaned_csv': cleaned_csv,
                'new_analysis': result['new_analysis'],
                'applied_operations': result['applied_operations'],
                'warnings': result['warnings'],
                'python_code': py_code,
                'final_rows': len(result['data']),
                'final_cols': len(result['headers'])
            }))

        else:
            print(json.dumps({'error': f"Unknown command: {command}"}))
            sys.exit(1)

    except Exception as e:
        import traceback
        print(json.dumps({'error': str(e), 'trace': traceback.format_exc()}))
        sys.exit(1)

if __name__ == '__main__':
    main()
