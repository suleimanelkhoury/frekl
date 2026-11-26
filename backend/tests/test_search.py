"""Tests for the global search endpoint (GET /api/search?q=…).

Results are aggregated globally: one hit per distinct budget title,
category name, and item label (case-insensitive), with occurrence
counts and the most recent occurrence as context, newest-first.
"""

def _create_budget(client, headers, title, month, year):
    response = client.post(
        "/api/budgets/",
        json={"title": title, "month": month, "year": year},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _add_item(client, headers, budget_id, category, label):
    r = client.post(
        f"/api/budgets/{budget_id}/categories",
        json={"name": category, "sort_order": 0},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    cat_id = r.json()["id"]
    r = client.post(
        f"/api/categories/{cat_id}/items",
        json={"label": label, "projected_cost": "10", "actual_cost": "10"},
        headers=headers,
    )
    assert r.status_code == 201, r.text


def _search(client, headers, q):
    response = client.get("/api/search/", params={"q": q}, headers=headers)
    assert response.status_code == 200
    return response.json()


class TestSearchGroups:
    """The three result groups and their matching rules."""

    def test_finds_budget_category_and_item(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Urlaub August", 8, 2026)
        _add_item(client, auth_headers, b["id"], "Unterhaltung", "Netflix")

        result = _search(client, auth_headers, "august")
        assert len(result["budgets"]) == 1
        assert result["budgets"][0]["label"] == "Urlaub August"
        assert result["budgets"][0]["occurrences"] == 1
        assert result["budgets"][0]["budget_id"] == b["id"]

        cat = _search(client, auth_headers, "unterhalt")
        assert len(cat["categories"]) == 1
        assert cat["categories"][0]["label"] == "Unterhaltung"
        assert cat["categories"][0]["category"] is None
        assert cat["categories"][0]["occurrences"] == 1

        item = _search(client, auth_headers, "netfl")
        assert len(item["items"]) == 1
        hit = item["items"][0]
        assert hit["label"] == "Netflix"
        assert hit["category"] == "Unterhaltung"
        assert hit["budget_title"] == "Urlaub August"

    def test_case_insensitive(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Urlaub", 8, 2026)
        _add_item(client, auth_headers, b["id"], "Wohnen", "MiETE")

        assert len(_search(client, auth_headers, "URLAUB")["budgets"]) == 1
        assert len(_search(client, auth_headers, "miete")["items"]) == 1

    def test_recurring_item_is_one_global_hit(self, client, auth_headers):
        # "Streaming" in 3 months → ONE hit with occurrences 3 and the
        # most recent month as context (not three separate hits).
        for month in (3, 5, 7):
            b = _create_budget(client, auth_headers, f"M{month}", month, 2026)
            _add_item(client, auth_headers, b["id"], "Abo", "Streaming")

        result = _search(client, auth_headers, "stream")
        assert len(result["items"]) == 1
        hit = result["items"][0]
        assert hit["occurrences"] == 3
        assert hit["month"] == 7  # most recent occurrence
        assert hit["year"] == 2026

    def test_duplicate_budget_titles_are_one_hit(self, client, auth_headers):
        for month in (3, 7):
            _create_budget(client, auth_headers, "Same Title", month, 2026)

        result = _search(client, auth_headers, "same")
        assert len(result["budgets"]) == 1
        assert result["budgets"][0]["occurrences"] == 2
        assert result["budgets"][0]["month"] == 7


class TestSearchOrdering:
    """Groups are ordered by their most recent occurrence."""

    def test_items_newest_first(self, client, auth_headers):
        # "Zebra" only in July, "Alpha" only in March → Zebra first
        b_mar = _create_budget(client, auth_headers, "Mar", 3, 2026)
        _add_item(client, auth_headers, b_mar["id"], "A", "Alpha")
        b_jul = _create_budget(client, auth_headers, "Jul", 7, 2026)
        _add_item(client, auth_headers, b_jul["id"], "A", "Zebra")

        result = _search(client, auth_headers, "a")
        labels = [hit["label"] for hit in result["items"]]
        assert labels == ["Zebra", "Alpha"]
        assert result["items"][0]["month"] == 7
        assert result["items"][1]["month"] == 3


class TestSearchCaps:
    """Result groups are capped."""

    def test_item_hits_capped_at_twenty(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Jan", 1, 2026)
        for i in range(25):
            _add_item(client, auth_headers, b["id"], "A", f"Artikel {i:02d}")

        result = _search(client, auth_headers, "artikel")
        assert len(result["items"]) == 20


class TestSearchScope:
    """Isolation and validation."""

    def test_other_users_data_not_searchable(
        self, client, auth_headers, second_auth_headers
    ):
        b = _create_budget(client, auth_headers, "Geheim", 9, 2026)
        _add_item(client, auth_headers, b["id"], "X", "Geheimposten")

        result = _search(client, second_auth_headers, "geheim")
        assert result["budgets"] == []
        assert result["items"] == []
        assert result["categories"] == []

    def test_no_matches_empty_groups(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "Urlaub", 9, 2026)
        _add_item(client, auth_headers, b["id"], "Wohnen", "Miete")

        result = _search(client, auth_headers, "zzz-nil")
        assert result["budgets"] == []
        assert result["categories"] == []
        assert result["items"] == []

    def test_empty_query_rejected(self, client, auth_headers):
        response = client.get("/api/search/", params={"q": ""}, headers=auth_headers)
        assert response.status_code == 422
