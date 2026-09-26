#!/usr/bin/env python3
"""
DataFix Engine Python Parity & Regression Tests
Validates:
Test A — Zero IQR handling
Test B — Target column extremes handling
Test C — Missing categorical contextual strategy
Test D — Exact duplicate detection & audit trail
Test E — Tehran housePrice.csv statistical parsing & collinearity
"""

import sys
import os

# Add root / engine to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from engine.datafix_engine import (
    calculate_stats,
    analyze_dataset,
    apply_transformations,
    calculate_pearson_correlation
)

def run_tests():
    print("=== Running DataFix Python Regression & Parity Tests ===\n")

    # -------------------------------------------------------------------------
    # Test A: Zero IQR handling
    # -------------------------------------------------------------------------
    print("Running Test A: Zero IQR column safety...")
    headers = ["Room", "Price"]
    data = [
        ["2", "100"],
        ["2", "120"],
        ["2", "110"],
        ["2", "130"],
        ["2", "125"],
        ["2", "115"],
        ["2", "105"],
        ["1", "90"],
        ["3", "150"],
        ["4", "200"],
    ]
    analysis = analyze_dataset(headers, data)
    room_col = next(c for c in analysis["columns"] if c["name"] == "Room")
    assert room_col["stats"]["iqr"] == 0, "Room IQR must be 0"
    assert room_col["stats"]["iqr_is_zero"] is True, "iqr_is_zero must be True"

    # Check detected issues
    room_issue = next(i for i in analysis["detected_issues"] if i.get("column") == "Room")
    assert room_issue["confidence"] == "review", "Degenerate IQR issue must have confidence 'review'"
    assert "Degenerate IQR" in room_issue["title"], "Title must state Degenerate IQR"
    assert "cannot reliably distinguish" in room_issue["description"] or "differ from the IQR boundary" in room_issue["description"]

    # When transformation is executed with 'keep', values must not be modified
    ops = {
        "outlier_actions": {"Room": "keep"}
    }
    result = apply_transformations(headers, data, ops)
    room_vals = [r[0] for r in result["data"]]
    expected_vals = [r[0] for r in data]
    assert room_vals == expected_vals, "Values must remain untouched when keep is selected"
    room_detail = next(d for d in result["operation_details"] if d.get("column") == "Room")
    assert room_detail["confidence"] == "review"
    assert "Preserved original values" in room_detail["rationale"]
    print("✓ Test A Passed: Zero IQR safely handled in Python engine.")

    # -------------------------------------------------------------------------
    # Test B: Legitimate target extremes
    # -------------------------------------------------------------------------
    print("\nRunning Test B: Legitimate target extremes...")
    target_headers = ["sqft", "Price"]
    target_data = [
        ["1000", "200000"],
        ["1200", "240000"],
        ["1100", "220000"],
        ["1500", "300000"],
        ["1300", "260000"],
        ["1400", "280000"],
        ["1600", "320000"],
        ["1700", "340000"],
        ["3500", "2500000"],
    ]
    target_analysis = analyze_dataset(target_headers, target_data, target_column="Price")
    price_col = next(c for c in target_analysis["columns"] if c["name"] == "Price")
    assert price_col["is_target_candidate"] is True
    assert price_col["stats"]["outlier_count"] > 0

    price_issue = next(i for i in target_analysis["detected_issues"] if i.get("column") == "Price")
    assert price_issue["confidence"] == "review", "Target outlier must be 'review'"
    assert "Extreme target values may be legitimate observations" in price_issue["description"]
    print("✓ Test B Passed: Target extremes flagged for review without automatic modification.")

    # -------------------------------------------------------------------------
    # Test C: Missing categorical value
    # -------------------------------------------------------------------------
    print("\nRunning Test C: Missing categorical values & contextual strategy...")
    cat_headers = ["id", "Address", "Price"]
    cat_data = [
        ["1", "Shahran", "100"],
        ["2", "Punak", "120"],
        ["3", "", "110"],
        ["4", "Punak", "130"],
        ["5", "Saadat Abad", "150"],
        ["6", "", "140"],
    ]
    cat_analysis = analyze_dataset(cat_headers, cat_data)
    addr_issue = next(i for i in cat_analysis["detected_issues"] if i.get("column") == "Address")
    assert "Mode imputation is one possible strategy" in addr_issue["recommendation"]
    assert "row removal may be preferable" in addr_issue["recommendation"]
    print("✓ Test C Passed: Categorical missingness strategy is contextual and nuanced.")

    # -------------------------------------------------------------------------
    # Test D: Exact duplicates
    # -------------------------------------------------------------------------
    print("\nRunning Test D: Exact duplicate rows detection and auditability...")
    dup_headers = ["A", "B", "C"]
    dup_data = [
        ["1", "X", "10"],
        ["2", "Y", "20"],
        ["2", "Y", "20"],
        ["3", "Z", "30"],
        ["2", "Y", "20"],
    ]
    dup_analysis = analyze_dataset(dup_headers, dup_data)
    assert dup_analysis["duplicate_rows"] == 2
    dup_issue = next(i for i in dup_analysis["detected_issues"] if i.get("detection_type") == "duplicate")
    assert "confirm that duplicate observations do not represent legitimate repeated records" in dup_issue["description"]

    # Transform with deduplication
    dedup_ops = {"remove_duplicates": True}
    dedup_res = apply_transformations(dup_headers, dup_data, dedup_ops)
    assert len(dedup_res["data"]) == 3
    dedup_detail = next(d for d in dedup_res["operation_details"] if d["category"] == "duplicates")
    assert dedup_detail["confidence"] == "actionable"
    assert "Deduplication prevents data leakage" in dedup_detail["rationale"]
    print("✓ Test D Passed: Exact duplicates correctly detected with audit trail.")

    # -------------------------------------------------------------------------
    # Test E: Tehran housePrice.csv parsing & collinearity
    # -------------------------------------------------------------------------
    print("\nRunning Test E: Current housePrice.csv parsing and structural statistics...")
    hp_headers = ["Area", "Room", "Parking", "Warehouse", "Elevator", "Address", "Price", "Price(USD)"]
    hp_data = [
        ["63", "1", "True", "True", "True", "Shahran", "1850000000", "61666.67"],
        ["60", "1", "True", "True", "True", "Shahran", "1850000000", "61666.67"],
        ["79", "2", "True", "True", "True", "Pardis", "550000000", "18333.33"],
        ["95", "2", "True", "True", "True", "Shahrake Gharb", "9025000000", "300833.33"],
        ["123", "2", "True", "True", "True", "Shahrake Gharb", "7000000000", "233333.33"],
        ["105", "2", "True", "True", "True", "Shahrake Gharb", "7000000000", "233333.33"],
        ["105", "2", "True", "True", "True", "Shahrake Gharb", "7000000000", "233333.33"], # Duplicate
        ["145", "2", "True", "True", "True", "Saadat Abad", "12500000000", "416666.67"],
        ["100", "2", "True", "True", "True", "Punak", "5000000000", "166666.67"],
        ["85", "2", "True", "True", "True", "", "4200000000", "140000.00"], # Missing
        ["110", "2", "True", "True", "True", "Punak", "5800000000", "193333.33"],
        ["65", "2", "True", "True", "True", "West Ferdows", "3200000000", "106666.67"],
        ["70", "2", "True", "True", "True", "West Ferdows", "3500000000", "116666.67"],
        ["120", "2", "True", "True", "True", "Gheitarieh", "9600000000", "320000.00"],
        ["88", "2", "True", "True", "True", "Ostad Moein", "2900000000", "96666.67"],
        ["130", "2", "True", "True", "True", "Gheitarieh", "11000000000", "366666.67"],
        ["75", "2", "True", "True", "True", "Pardis", "600000000", "20000.00"],
        ["82", "2", "True", "True", "True", "", "3900000000", "130000.00"], # Missing
        ["1000000000", "2", "True", "True", "True", "Abazar", "4500000000", "150000.00"], # Area outlier
        ["115", "2", "True", "True", "True", "Niavaran", "16000000000", "533333.33"],
        ["90", "2", "True", "True", "True", "Punak", "4800000000", "160000.00"],
        ["92", "2", "True", "True", "True", "Shahran", "3700000000", "123333.33"],
        ["108", "2", "True", "True", "True", "West Ferdows", "6200000000", "206666.67"],
        ["73", "2", "True", "True", "True", "Pardis", "580000000", "19333.33"],
        ["180", "3", "True", "True", "True", "Saadat Abad", "19500000000", "650000.00"],
        ["200", "3", "True", "True", "True", "Zaferanieh", "28000000000", "933333.33"],
        ["160", "3", "True", "True", "True", "Niavaran", "22000000000", "733333.33"],
        ["210", "3", "True", "True", "True", "Elahieh", "35000000000", "1166666.67"],
        ["150", "3", "True", "True", "True", "Pasdaran", "14500000000", "483333.33"],
        ["80", "2", "True", "True", "True", "Amir Abad", "5200000000", "173333.33"],
    ]
    hp_analysis = analyze_dataset(hp_headers, hp_data)
    assert hp_analysis["rows"] == 30
    assert hp_analysis["duplicate_rows"] == 1

    room_c = next(c for c in hp_analysis["columns"] if c["name"] == "Room")
    assert room_c["stats"]["iqr_is_zero"] is True

    area_c = next(c for c in hp_analysis["columns"] if c["name"] == "Area")
    assert area_c["stats"]["max"] >= 1000000000

    assert len(hp_analysis["collinear_pairs"]) > 0
    pair = hp_analysis["collinear_pairs"][0]
    assert "Price" in pair["col1"] and "Price" in pair["col2"]
    assert pair["correlation"] > 0.99

    assert "Price" in hp_analysis["target_candidates"]
    assert "Price(USD)" in hp_analysis["target_candidates"]
    print("✓ Test E Passed: Python engine accurately analyzes housePrice dataset and captures all edge cases.")

    print("\n======================================")
    print("🎉 ALL 5 PYTHON REGRESSION TESTS PASSED!")
    print("======================================\n")

if __name__ == "__main__":
    run_tests()
