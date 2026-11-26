"""Tests for smart prefill (POST /api/budgets with `prefill`).

The prefill drafts a new budget's SOLL rows from spending history:
"last" copies the previous budget's plan (with the correct Extra
carryover), "average" plans recurring rows (present in every budget of
the window) from the actual spending of the last up to three budgets
before the target month.
"""

from decimal import Decimal

# ── Helpers ──────────────────────────────────────


def _create_budget(client, headers, title, month, year, prefill=None):
    """Create a budget via the API and return its response dict."""
    payload = {"title": title, "month": month, "year": year}
    if prefill is not None:
        payload["prefill"] = prefill
    response = client.post("/api/budgets/", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def _add_income(client, headers, budget_id, label, projected, actual):
    response = client.post(
        f"/api/budgets/{budget_id}/income",
        json={
            "label": label,
            "projected_amount": str(projected),
            "actual_amount": str(actual),
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _add_category(client, headers, budget_id, name, sort_order=0):
    response = client.post(
        f"/api/budgets/{budget_id}/categories",
        json={"name": name, "sort_order": sort_order},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _add_item(client, headers, category_id, label, projected, actual):
    response = client.post(
        f"/api/categories/{category_id}/items",
        json={
            "label": label,
            "projected_cost": str(projected),
            "actual_cost": str(actual),
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def _detail(client, headers, budget_id):
    return client.get(f"/api/budgets/{budget_id}", headers=headers).json()


# ── Tests ────────────────────────────────────────


class TestPrefillNone:
    """The default (prefill omitted or "none") stays blank."""

    def test_default_creates_blank_budget(self, client, auth_headers):
        budget = _create_budget(
            client, auth_headers, "November 2026", 11, 2026
        )
        detail = _detail(client, auth_headers, budget["id"])
        assert detail["incomes"] == []
        assert detail["categories"] == []

    def test_prefill_none_creates_blank_budget(self, client, auth_headers):
        budget = _create_budget(
            client, auth_headers, "November 2026", 11, 2026, prefill="none"
        )
        detail = _detail(client, auth_headers, budget["id"])
        assert detail["incomes"] == []
        assert detail["categories"] == []


class TestPrefillLast:
    """"last" copies the previous budget's plan + the real carryover."""

    def test_copies_plan_and_carryover(self, client, auth_headers):
        # September: Einkommen 2500 planned/2500 actual, Extra 100
        # planned/150 actual, Wohnen/Miete 900 planned/850 actual.
        # Actual balance = 2500 + 150 - 850 = 1800 → the carryover.
        source = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, source["id"], "Einkommen", 2500, 2500)
        _add_income(client, auth_headers, source["id"], "Extra", 100, 150)
        cat = _add_category(client, auth_headers, source["id"], "Wohnen", 0)
        _add_item(client, auth_headers, cat["id"], "Miete", 900, 850)

        target = _create_budget(
            client, auth_headers, "October", 10, 2026, prefill="last"
        )
        detail = _detail(client, auth_headers, target["id"])

        labels = {i["label"]: i for i in detail["incomes"]}
        assert set(labels) == {"Einkommen", "Extra"}
        # Plan copied, actual zeroed
        assert Decimal(labels["Einkommen"]["projected_amount"]) == Decimal("2500.00")
        assert Decimal(labels["Einkommen"]["actual_amount"]) == Decimal("0")
        # Extra SOLL = the source's ACTUAL balance, not its planned Extra
        assert Decimal(labels["Extra"]["projected_amount"]) == Decimal("1800.00")
        assert Decimal(labels["Extra"]["actual_amount"]) == Decimal("0")

        assert len(detail["categories"]) == 1
        assert detail["categories"][0]["name"] == "Wohnen"
        item = detail["categories"][0]["items"][0]
        assert item["label"] == "Miete"
        assert Decimal(item["projected_cost"]) == Decimal("900.00")
        assert Decimal(item["actual_cost"]) == Decimal("0")

    def test_uses_budget_immediately_before_target(
        self, client, auth_headers
    ):
        # Two earlier budgets; the newest one before the target wins.
        for month, salary in ((7, 2000), (9, 2500)):
            b = _create_budget(client, auth_headers, f"Month {month}", month, 2026)
            _add_income(client, auth_headers, b["id"], "Einkommen", salary, salary)

        target = _create_budget(
            client, auth_headers, "November", 11, 2026, prefill="last"
        )
        detail = _detail(client, auth_headers, target["id"])
        assert Decimal(detail["incomes"][0]["projected_amount"]) == Decimal("2500.00")

    def test_target_month_excluded_from_window(self, client, auth_headers):
        # A budget FOR the target month must not be used as the source
        # (e.g. re-creating or filling a gap).
        target_month_budget = _create_budget(
            client, auth_headers, "October existing", 10, 2026
        )
        _add_income(
            client, auth_headers, target_month_budget["id"], "Einkommen", 9999, 9999
        )
        earlier = _create_budget(client, auth_headers, "August", 8, 2026)
        _add_income(client, auth_headers, earlier["id"], "Einkommen", 2500, 2500)

        target = _create_budget(
            client, auth_headers, "October new", 10, 2026, prefill="last"
        )
        detail = _detail(client, auth_headers, target["id"])
        assert Decimal(detail["incomes"][0]["projected_amount"]) == Decimal("2500.00")


class TestPrefillAverage:
    """average plans from actual spending over the last ≤3 budgets."""

    def test_averages_actual_spending(self, client, auth_headers):
        # Jul/Aug/Sep with Miete actual 850/900/950 → SOLL 900.00
        for month, miete in ((7, 850), (8, 900), (9, 950)):
            b = _create_budget(client, auth_headers, f"Month {month}", month, 2026)
            _add_income(client, auth_headers, b["id"], "Einkommen", 2500, 2500)
            _add_income(client, auth_headers, b["id"], "Extra", 0, 100)
            cat = _add_category(client, auth_headers, b["id"], "Wohnen", 0)
            _add_item(client, auth_headers, cat["id"], "Miete", 900, miete)

        target = _create_budget(
            client, auth_headers, "November", 11, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, target["id"])

        labels = {i["label"]: i for i in detail["incomes"]}
        assert Decimal(labels["Einkommen"]["projected_amount"]) == Decimal("2500.00")
        # Extra is never averaged — it is September's actual balance:
        # 2500 + 100 - 950 = 1650
        assert Decimal(labels["Extra"]["projected_amount"]) == Decimal("1650.00")

        item = detail["categories"][0]["items"][0]
        assert Decimal(item["projected_cost"]) == Decimal("900.00")

    def test_rows_not_in_every_month_are_dropped(self, client, auth_headers):
        # Recurring only: a one-off (1 of 3 months) and a row seen in
        # 2 of 3 months are both dropped, not diluted into the plan.
        for month in (7, 8, 9):
            b = _create_budget(client, auth_headers, f"Month {month}", month, 2026)
            _add_income(client, auth_headers, b["id"], "Einkommen", 2500, 2500)
            cat = _add_category(client, auth_headers, b["id"], "Sonstiges", 0)
            _add_item(client, auth_headers, cat["id"], "Alltag", 200, 200)
            if month in (7, 8):
                _add_item(client, auth_headers, cat["id"], "Sport", 30, 30)
            if month == 9:
                _add_item(client, auth_headers, cat["id"], "Reparatur", 0, 300)
                _add_income(client, auth_headers, b["id"], "Cashback", 0, 25)

        target = _create_budget(
            client, auth_headers, "November", 11, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, target["id"])
        items = {
            i["label"]: i for i in detail["categories"][0]["items"]
        }
        assert set(items) == {"Alltag"}  # one-off and 2-of-3 rows gone
        assert Decimal(items["Alltag"]["projected_cost"]) == Decimal("200.00")
        # One-off income dropped too
        assert [i["label"] for i in detail["incomes"]] == ["Extra", "Einkommen"]

    def test_zero_spending_rows_are_dropped(self, client, auth_headers):
        # A row never actually spent in the window is not re-planned.
        for month in (7, 8, 9):
            b = _create_budget(client, auth_headers, f"Month {month}", month, 2026)
            _add_income(client, auth_headers, b["id"], "Einkommen", 2500, 2500)
            cat = _add_category(client, auth_headers, b["id"], "Wohnen", 0)
            _add_item(client, auth_headers, cat["id"], "Miete", 900, 900)
            _add_item(client, auth_headers, cat["id"], "Altes Abo", 50, 0)

        target = _create_budget(
            client, auth_headers, "November", 11, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, target["id"])
        labels = [i["label"] for i in detail["categories"][0]["items"]]
        assert labels == ["Miete"]

    def test_case_insensitive_label_merge_keeps_recent_spelling(
        self, client, auth_headers
    ):
        # "Lidl" (Aug) and "lidl" (Sep) are one row; the most recent
        # spelling wins. Same for a category renamed by case only.
        b1 = _create_budget(client, auth_headers, "August", 8, 2026)
        _add_income(client, auth_headers, b1["id"], "Einkommen", 2500, 2500)
        cat1 = _add_category(client, auth_headers, b1["id"], "Lebensmittel", 0)
        _add_item(client, auth_headers, cat1["id"], "Lidl", 200, 200)

        b2 = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, b2["id"], "Einkommen", 2500, 2500)
        cat2 = _add_category(client, auth_headers, b2["id"], "Lebensmittel", 0)
        _add_item(client, auth_headers, cat2["id"], "lidl", 200, 250)

        target = _create_budget(
            client, auth_headers, "November", 11, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, target["id"])
        assert len(detail["categories"]) == 1
        assert detail["categories"][0]["name"] == "Lebensmittel"
        item = detail["categories"][0]["items"][0]
        assert item["label"] == "lidl"  # most recent spelling
        assert Decimal(item["projected_cost"]) == Decimal("225.00")

    def test_fewer_than_three_budgets_average_over_existing(
        self, client, auth_headers
    ):
        # One source budget only: its actual spending is the plan.
        b = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, b["id"], "Einkommen", 2500, 2500)
        cat = _add_category(client, auth_headers, b["id"], "Wohnen", 0)
        _add_item(client, auth_headers, cat["id"], "Miete", 900, 880)

        target = _create_budget(
            client, auth_headers, "November", 11, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, target["id"])
        item = detail["categories"][0]["items"][0]
        assert Decimal(item["projected_cost"]) == Decimal("880.00")

    def test_window_is_strictly_before_target(self, client, auth_headers):
        # Budgets for months 1 and 10; creating month 5 only sees month 1.
        for month in (1, 10):
            b = _create_budget(client, auth_headers, f"Month {month}", month, 2026)
            _add_income(client, auth_headers, b["id"], "Einkommen", 2500, 2500)
            cat = _add_category(client, auth_headers, b["id"], "Wohnen", 0)
            _add_item(
                client, auth_headers, cat["id"], "Miete", 900, 900 if month == 1 else 700
            )

        target = _create_budget(
            client, auth_headers, "May", 5, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, target["id"])
        item = detail["categories"][0]["items"][0]
        assert Decimal(item["projected_cost"]) == Decimal("900.00")


class TestPrefillEdgeCases:
    """No history, other users' data, and invalid input."""

    def test_no_history_creates_blank_budget(self, client, auth_headers):
        budget = _create_budget(
            client, auth_headers, "November 2026", 11, 2026, prefill="average"
        )
        detail = _detail(client, auth_headers, budget["id"])
        assert detail["incomes"] == []
        assert detail["categories"] == []

    def test_other_users_history_not_used(
        self, client, auth_headers, second_auth_headers
    ):
        # User A has history; user B's prefill must stay blank.
        a = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, a["id"], "Einkommen", 2500, 2500)

        budget = _create_budget(
            client, second_auth_headers, "November", 11, 2026, prefill="last"
        )
        detail = _detail(client, second_auth_headers, budget["id"])
        assert detail["incomes"] == []
        assert detail["categories"] == []

    def test_invalid_strategy_rejected(self, client, auth_headers):
        response = client.post(
            "/api/budgets/",
            json={
                "title": "November 2026",
                "month": 11,
                "year": 2026,
                "prefill": "bogus",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422
