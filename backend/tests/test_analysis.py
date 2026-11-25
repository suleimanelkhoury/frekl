"""Tests for GET /api/budgets/analysis — label hygiene analysis."""

from decimal import Decimal


class TestBudgetAnalysis:
    """GET /api/budgets/analysis — one-time rows and similar names."""

    def _make_budget(self, client, auth_headers, title, month, year):
        response = client.post(
            "/api/budgets/",
            json={"title": title, "month": month, "year": year},
            headers=auth_headers,
        )
        return response.json()["id"]

    def _add_item(self, client, auth_headers, budget_id, name, label, **costs):
        r = client.post(
            f"/api/budgets/{budget_id}/categories",
            json={"name": name},
            headers=auth_headers,
        )
        cat = r.json()["id"]
        client.post(
            f"/api/categories/{cat}/items",
            json={"label": label, **costs},
            headers=auth_headers,
        )

    def test_one_time_and_similar(self, client, auth_headers, budget):
        # Budget 1 (July 2026, the `budget` fixture)
        bid1 = budget["id"]
        self._add_item(
            client, auth_headers, bid1, "Essen", "Lidl",
            projected_cost="100", actual_cost="120.50",
        )
        self._add_item(
            client, auth_headers, bid1, "Essen", "Rewe", actual_cost="40",
        )
        self._add_item(
            client, auth_headers, bid1, "Mobilität", "Deutsche Bahn",
            actual_cost="7.00",
        )

        # Budget 2 (December 2026): "Lidl" spelled differently, "Rewe"
        # recurring, another near-duplicate pair
        bid2 = self._make_budget(client, auth_headers, "Next", 12, 2026)
        self._add_item(
            client, auth_headers, bid2, "Haushalt", "LIDL",
            projected_cost="30", actual_cost="30.25",
        )
        self._add_item(
            client, auth_headers, bid2, "Haushalt", "Rewe", actual_cost="41",
        )
        self._add_item(
            client, auth_headers, bid2, "Mobilität", "Deutschebahn",
            actual_cost="5.00",
        )

        response = client.get("/api/budgets/analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # One-time rows: Lidl, LIDL, Deutsche Bahn, Deutschebahn —
        # but not the recurring "Rewe". Sorted by total desc.
        one_time = [u["label"] for u in data["one_time"]]
        assert one_time == ["Lidl", "LIDL", "Deutsche Bahn", "Deutschebahn"]
        assert Decimal(data["one_time"][0]["total_actual"]) == Decimal("120.50")
        assert data["one_time"][0]["occurrences"] == 1
        assert data["one_time"][0]["budget_count"] == 1
        assert data["one_time"][0]["month"] == 7
        assert data["one_time"][0]["year"] == 2026
        assert data["one_time"][0]["category"] == "Essen"

        # Similar clusters: {Lidl, LIDL} and {Deutsche Bahn,
        # Deutschebahn}; "Rewe" alone is not a group. Groups sorted by
        # summed total, members sorted by total desc.
        assert len(data["similar"]) == 2
        assert Decimal(data["similar"][0]["labels"][0]["total_actual"]) == Decimal(
            "120.50"
        )
        group_labels = [
            sorted(u["label"] for u in g["labels"]) for g in data["similar"]
        ]
        assert sorted(group_labels) == [
            ["Deutsche Bahn", "Deutschebahn"],
            ["LIDL", "Lidl"],
        ]

    def test_recurring_rows_not_flagged(self, client, auth_headers, budget):
        bid1 = budget["id"]
        self._add_item(
            client, auth_headers, bid1, "Essen", "Rewe", actual_cost="40"
        )
        bid2 = self._make_budget(client, auth_headers, "Next", 12, 2026)
        self._add_item(
            client, auth_headers, bid2, "Essen", "Rewe", actual_cost="41"
        )

        response = client.get("/api/budgets/analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["one_time"] == []
        assert data["similar"] == []

    def test_occurrence_count_and_budget_count(self, client, auth_headers, budget):
        # "Snacks" twice within the SAME budget: not one-time, and its
        # budget_count stays 1
        bid1 = budget["id"]
        self._add_item(
            client, auth_headers, bid1, "Essen", "Snacks", actual_cost="3"
        )
        self._add_item(
            client, auth_headers, bid1, "Essen", "Snacks", actual_cost="4"
        )

        response = client.get("/api/budgets/analysis", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["one_time"] == []
        assert data["similar"] == []

    def test_requires_auth(self, client):
        response = client.get("/api/budgets/analysis")
        assert response.status_code == 401
