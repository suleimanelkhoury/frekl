"""Tests for the recurring-items endpoint (GET /api/budgets/recurring).

Aggregates subscription-style rows across all budgets: case-insensitive
grouping, average cost, first/last appearance, and a price trend
(earliest entries vs. latest entries). A row counts as recurring only
when it appears at a regular cadence (monthly, quarterly, yearly …);
random appearances don't qualify.
"""

from decimal import Decimal


def _create_budget(client, headers, title, month, year):
    response = client.post(
        "/api/budgets/",
        json={"title": title, "month": month, "year": year},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _add_item(client, headers, budget_id, category, label, projected, actual):
    """Add one category + item (creating the category if needed)."""
    r = client.post(
        f"/api/budgets/{budget_id}/categories",
        json={"name": category, "sort_order": 0},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    category_id = r.json()["id"]
    r = client.post(
        f"/api/categories/{category_id}/items",
        json={
            "label": label,
            "projected_cost": str(projected),
            "actual_cost": str(actual),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _recurring(client, headers):
    response = client.get("/api/budgets/recurring", headers=headers)
    assert response.status_code == 200
    return response.json()


def _by_label(response_json, label):
    matches = [i for i in response_json["items"] if i["label"] == label]
    assert matches, f"{label} not in response"
    return matches[0]


class TestRecurringAggregation:
    """Grouping, spellings, averages, and first/last appearance."""

    def test_aggregates_case_insensitive_with_recent_spelling(
        self, client, auth_headers
    ):
        # "Netflix" in Jun, "netflix " in Jul → one row, latest spelling
        b1 = _create_budget(client, auth_headers, "Jun", 6, 2026)
        _add_item(client, auth_headers, b1["id"], "Unterhaltung", "Netflix", 10, 8.99)
        b2 = _create_budget(client, auth_headers, "Jul", 7, 2026)
        _add_item(client, auth_headers, b2["id"], "Unterhaltung", "netflix ", 10, 8.99)

        data = _recurring(client, auth_headers)
        assert len(data["items"]) == 1
        row = data["items"][0]
        assert row["label"] == "netflix "  # most recent spelling
        assert row["category"] == "Unterhaltung"
        assert row["occurrences"] == 2
        assert row["budget_count"] == 2
        assert row["cadence_months"] == 1  # consecutive months
        assert row["first_month"] == 6 and row["first_year"] == 2026
        assert row["last_month"] == 7 and row["last_year"] == 2026
        assert Decimal(row["total_actual"]) == Decimal("17.98")
        assert Decimal(row["avg_actual"]) == Decimal("8.99")

    def test_one_off_rows_excluded(self, client, auth_headers):
        # Appears twice within ONE budget → single month, no cadence
        b1 = _create_budget(client, auth_headers, "Jun", 6, 2026)
        _add_item(client, auth_headers, b1["id"], "Sonstiges", "Fahrrad", 100, 90)
        _add_item(client, auth_headers, b1["id"], "Sonstiges", "fahrrad", 100, 60)
        b2 = _create_budget(client, auth_headers, "Jul", 7, 2026)
        _add_item(client, auth_headers, b2["id"], "Sonstiges", "Alltag", 50, 50)
        _add_item(client, auth_headers, b2["id"], "Sonstiges", "Alltag", 50, 50)

        data = _recurring(client, auth_headers)
        assert data["items"] == []  # nothing spans two months

    def test_two_random_appearances_excluded(self, client, auth_headers):
        # Bought twice, months apart: with a single gap there is no way
        # to tell a slow cadence from randomness — excluded.
        b1 = _create_budget(client, auth_headers, "Feb", 2, 2026)
        _add_item(client, auth_headers, b1["id"], "Sonstiges", "Wiki", 10, 10)
        b2 = _create_budget(client, auth_headers, "May", 5, 2026)
        _add_item(client, auth_headers, b2["id"], "Sonstiges", "Wiki", 10, 10)

        data = _recurring(client, auth_headers)
        assert data["items"] == []

    def test_quarterly_cadence_detected(self, client, auth_headers):
        # GEZ-style: every three months → cadence 3
        for month in (1, 4, 7, 10):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Gebühren", "Rundfunk", 60, 18.33)

        row = _by_label(_recurring(client, auth_headers), "Rundfunk")
        assert row["cadence_months"] == 3
        assert row["budget_count"] == 4
        assert Decimal(row["avg_actual"]) == Decimal("18.33")

    def test_quarterly_with_month_boundary_drift(self, client, auth_headers):
        # Real-world GEZ pattern: quarterly bills that drift across
        # month boundaries — gaps 4, 2, 3, 3, 3 (Jun 2025 → Sep 2026)
        for year, month in (
            (2025, 6),
            (2025, 10),
            (2025, 12),
            (2026, 3),
            (2026, 6),
            (2026, 9),
        ):
            b = _create_budget(client, auth_headers, f"M{month}/{year}", month, year)
            _add_item(client, auth_headers, b["id"], "Gebühren", "GEZ", 60, 18.33)

        row = _by_label(_recurring(client, auth_headers), "GEZ")
        assert row["cadence_months"] == 3
        assert row["budget_count"] == 6

    def test_burst_pattern_excluded(self, client, auth_headers):
        # Months 1, 2, 3, 7, 8, 9: two bursts — gaps [1, 1, 4, 1, 1].
        # Mean 1.6, but the 4-month gap is far off any cadence.
        for month in (1, 2, 3, 7, 8, 9):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Sonstiges", "Burst", 20, 20)

        data = _recurring(client, auth_headers)
        assert data["items"] == []

    def test_yearly_cadence_detected(self, client, auth_headers):
        # Insurance every January → cadence 12
        for year in (2024, 2025, 2026):
            b = _create_budget(client, auth_headers, f"Jan {year}", 1, year)
            _add_item(client, auth_headers, b["id"], "Versicherungen", "Hausrat", 100, 90)

        row = _by_label(_recurring(client, auth_headers), "Hausrat")
        assert row["cadence_months"] == 12
        assert row["first_year"] == 2024 and row["last_year"] == 2026

    def test_skipped_month_tolerated_for_monthly_rows(
        self, client, auth_headers
    ):
        # Monthly row with one month missed: gaps [1, 1, 2] stay within
        # the one-month tolerance → still monthly
        for month in (2, 3, 4, 6):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Streaming", 10, 10)

        row = _by_label(_recurring(client, auth_headers), "Streaming")
        assert row["cadence_months"] == 1
        assert row["budget_count"] == 4

    def test_larger_hole_tolerated_for_monthly_rows(
        self, client, auth_headers
    ):
        # Real-world pattern (Internet / MSCI Emerging Market): monthly
        # with a single two-month hole — gaps [1, 1, 3, 1] → monthly
        for month in (1, 2, 3, 6, 7):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Internet", 30, 30)

        row = _by_label(_recurring(client, auth_headers), "Internet")
        assert row["cadence_months"] == 1
        assert row["budget_count"] == 5

    def test_irregular_pattern_excluded(self, client, auth_headers):
        # Months 1, 2, 6: gaps [1, 4] — bursts, not a cadence
        for month in (1, 2, 6):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Sonstiges", "Random", 20, 20)

        data = _recurring(client, auth_headers)
        assert data["items"] == []

    def test_sorted_by_total_spending(self, client, auth_headers):
        for month in (6, 7):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "A", "Cheap", 5, 5)
            _add_item(client, auth_headers, b["id"], "B", "Pricey", 40, 40)

        data = _recurring(client, auth_headers)
        labels = [i["label"] for i in data["items"]]
        assert labels == ["Pricey", "Cheap"]


class TestRecurringTrend:
    """Direction and change percentage (earliest vs. latest entries)."""

    def test_upward_trend_reveals_price_creep(self, client, auth_headers):
        # n=3: halves are [first] and [last] (middle skipped)
        # 8.99 → 8.99 → 12.99: up, +44.5 %
        for month, price in ((5, 8.99), (6, 8.99), (7, 12.99)):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Streaming", 10, price)

        row = _by_label(_recurring(client, auth_headers), "Streaming")
        assert row["direction"] == "up"
        assert row["change_pct"] == 44.5
        assert Decimal(row["early_avg"]) == Decimal("8.99")
        assert Decimal(row["late_avg"]) == Decimal("12.99")

    def test_downward_trend(self, client, auth_headers):
        # 30 → 20: down, -33.3 %
        for month, price in ((5, 30), (6, 20)):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Gym", 25, price)

        row = _by_label(_recurring(client, auth_headers), "Gym")
        assert row["direction"] == "down"
        assert row["change_pct"] == -33.3

    def test_flat_trend(self, client, auth_headers):
        for month in (5, 6, 7):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Flat", 10, 12)

        row = _by_label(_recurring(client, auth_headers), "Flat")
        assert row["direction"] == "flat"
        assert row["change_pct"] == 0.0

    def test_four_entries_split_into_two_pairs(self, client, auth_headers):
        # n=4: early = [9, 9], late = [11, 11] → up, +22.2 %
        for month, price in ((4, 9), (5, 9), (6, 11), (7, 11)):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Box", 10, price)

        row = _by_label(_recurring(client, auth_headers), "Box")
        assert row["direction"] == "up"
        assert row["change_pct"] == 22.2
        assert Decimal(row["early_avg"]) == Decimal("9.00")
        assert Decimal(row["late_avg"]) == Decimal("11.00")


class TestRecurringScope:
    """Per-user isolation and empty states."""

    def test_other_users_rows_not_visible(
        self, client, auth_headers, second_auth_headers
    ):
        b = _create_budget(client, auth_headers, "Jun", 6, 2026)
        _add_item(client, auth_headers, b["id"], "A", "Mine", 10, 10)
        b2 = _create_budget(client, auth_headers, "Jul", 7, 2026)
        _add_item(client, auth_headers, b2["id"], "A", "Mine", 10, 10)

        data = _recurring(client, second_auth_headers)
        assert data["items"] == []

    def test_empty_user_gets_empty_response(self, client, auth_headers):
        data = _recurring(client, auth_headers)
        assert data["items"] == []
