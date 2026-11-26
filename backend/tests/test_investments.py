"""Tests for the investments overview (GET /api/budgets/investments).

Aggregates the Investitionen categories across all budgets: per-month
SOLL/IST with a running cumulative total, plus a per-row breakdown of
the individual investments.
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


def _investments(client, headers):
    response = client.get("/api/budgets/investments", headers=headers)
    assert response.status_code == 200
    return response.json()


class TestInvestmentMonths:
    """Per-month amounts and the cumulative total."""

    def test_cumulative_accumulates_and_includes_zero_months(
        self, client, auth_headers
    ):
        b1 = _create_budget(client, auth_headers, "Jan", 1, 2026)
        _add_item(
            client, auth_headers, b1["id"], "Investitionen", "MSCI World", 500, 500
        )
        b2 = _create_budget(client, auth_headers, "Feb", 2, 2026)  # no investing
        _add_item(
            client, auth_headers, b2["id"], "Wohnen", "Miete", 900, 900
        )
        b3 = _create_budget(client, auth_headers, "Mar", 3, 2026)
        _add_item(
            client, auth_headers, b3["id"], "Investitionen", "MSCI World", 500, 300
        )

        data = _investments(client, auth_headers)
        assert len(data["months"]) == 3
        m1, m2, m3 = data["months"]
        assert Decimal(m1["actual"]) == Decimal("500.00")
        assert Decimal(m1["cumulative"]) == Decimal("500.00")
        # Feb has no investment category → zeros, cumulative unchanged
        assert Decimal(m2["actual"]) == Decimal("0")
        assert Decimal(m2["projected"]) == Decimal("0")
        assert Decimal(m2["cumulative"]) == Decimal("500.00")
        assert Decimal(m3["actual"]) == Decimal("300.00")
        assert Decimal(m3["cumulative"]) == Decimal("800.00")
        assert Decimal(data["total"]) == Decimal("800.00")

    def test_projected_and_actual_separate(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Jan", 1, 2026)
        _add_item(
            client, auth_headers, b["id"], "Investitionen", "BYD", 400, 250
        )
        data = _investments(client, auth_headers)
        assert Decimal(data["months"][0]["projected"]) == Decimal("400.00")
        assert Decimal(data["months"][0]["actual"]) == Decimal("250.00")

    def test_english_category_name_counts_too(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Jan", 1, 2026)
        _add_item(
            client, auth_headers, b["id"], "Investments", "MSCI World", 100, 100
        )
        data = _investments(client, auth_headers)
        assert Decimal(data["total"]) == Decimal("100.00")

    def test_non_investment_spending_ignored(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Jan", 1, 2026)
        _add_item(
            client, auth_headers, b["id"], "Wohnen", "Miete", 900, 900
        )
        data = _investments(client, auth_headers)
        assert Decimal(data["total"]) == Decimal("0")
        assert data["items"] == []


class TestInvestmentItems:
    """Per-row breakdown across budgets."""

    def test_rows_aggregated_case_insensitive_recent_spelling(
        self, client, auth_headers
    ):
        b1 = _create_budget(client, auth_headers, "Jan", 1, 2026)
        _add_item(
            client, auth_headers, b1["id"], "Investitionen", "msci world", 200, 200
        )
        b2 = _create_budget(client, auth_headers, "Feb", 2, 2026)
        _add_item(
            client, auth_headers, b2["id"], "Investitionen", "MSCI World", 200, 150
        )
        _add_item(
            client, auth_headers, b2["id"], "Investitionen", "BYD", 100, 100
        )

        data = _investments(client, auth_headers)
        labels = [i["label"] for i in data["items"]]
        assert labels == ["MSCI World", "BYD"]  # sorted by total desc
        world = data["items"][0]
        assert world["label"] == "MSCI World"  # most recent spelling
        assert world["occurrences"] == 2
        assert Decimal(world["total"]) == Decimal("350.00")

    def test_empty_user_gets_empty_response(self, client, auth_headers):
        data = _investments(client, auth_headers)
        assert data["months"] == []
        assert data["items"] == []
        assert Decimal(data["total"]) == Decimal("0")

    def test_other_users_data_not_visible(
        self, client, auth_headers, second_auth_headers
    ):
        b = _create_budget(client, auth_headers, "Jan", 1, 2026)
        _add_item(
            client, auth_headers, b["id"], "Investitionen", "MSCI World", 100, 100
        )
        data = _investments(client, second_auth_headers)
        assert data["months"] == []
        assert Decimal(data["total"]) == Decimal("0")
