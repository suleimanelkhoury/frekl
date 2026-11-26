"""Tests for the backup endpoints (GET /api/backup, POST /api/backup/restore).

Per-user export of all budgets as a portable JSON document, and restore
in "merge" (fill missing months) or "replace" (wipe + import) mode.
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


def _add_income(client, headers, budget_id, label, projected, actual):
    r = client.post(
        f"/api/budgets/{budget_id}/income",
        json={
            "label": label,
            "projected_amount": str(projected),
            "actual_amount": str(actual),
        },
        headers=headers,
    )
    assert r.status_code == 201
    return r.json()


def _add_category_item(client, headers, budget_id, category, label, projected, actual):
    r = client.post(
        f"/api/budgets/{budget_id}/categories",
        json={"name": category, "sort_order": 0},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    cat_id = r.json()["id"]
    r = client.post(
        f"/api/categories/{cat_id}/items",
        json={
            "label": label,
            "projected_cost": str(projected),
            "actual_cost": str(actual),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _download_backup(client, headers):
    response = client.get("/api/backup/", headers=headers)
    assert response.status_code == 200
    return response


def _restore(client, headers, backup_json, mode="merge"):
    return client.post(
        "/api/backup/restore",
        json={"data": backup_json, "mode": mode},
        headers=headers,
    )


class TestBackupExport:
    """GET /api/backup — the portable JSON document."""

    def test_export_contains_all_nested_data(self, client, auth_headers):
        b1 = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, b1["id"], "Einkommen", 2500, 2500)
        _add_income(client, auth_headers, b1["id"], "Extra", 100, 150)
        _add_category_item(
            client, auth_headers, b1["id"], "Wohnen", "Miete", 900, 850
        )
        _add_category_item(
            client, auth_headers, b1["id"], "Wohnen", "Strom", 80, 75
        )
        b2 = _create_budget(client, auth_headers, "October", 10, 2026)

        response = _download_backup(client, auth_headers)
        assert "attachment" in response.headers["content-disposition"]
        assert ".json" in response.headers["content-disposition"]

        data = response.json()
        assert data["format"] == "frekl-backup"
        assert data["version"] == 1
        assert data["email"] == "testuser@test.com"
        assert len(data["budgets"]) == 2

        sept = next(b for b in data["budgets"] if b["month"] == 9)
        assert sept["title"] == "September"
        assert len(sept["incomes"]) == 2
        # Each _add_category_item call creates its own "Wohnen" category
        assert len(sept["categories"]) == 2
        assert sept["categories"][0]["items"][0]["label"] == "Miete"
        assert sept["categories"][1]["items"][0]["label"] == "Strom"
        assert (
            Decimal(str(sept["incomes"][0]["projected_amount"])) == Decimal("2500")
        )

    def test_export_empty_account(self, client, auth_headers):
        data = _download_backup(client, auth_headers).json()
        assert data["budgets"] == []


class TestBackupRestoreMerge:
    """mode "merge" — fill missing months, keep existing ones."""

    def test_merge_creates_missing_and_skips_existing(
        self, client, auth_headers
    ):
        # Local: September already exists (different content than backup)
        local = _create_budget(client, auth_headers, "Local September", 9, 2026)
        _add_income(client, auth_headers, local["id"], "Einkommen", 1, 1)

        # Backup: September (should be skipped) + October (created)
        backup = _download_backup(client, auth_headers).json()
        backup["budgets"] = [
            {
                "title": "Backup September",
                "month": 9,
                "year": 2026,
                "incomes": [],
                "categories": [],
            },
            {
                "title": "Backup October",
                "month": 10,
                "year": 2026,
                "incomes": [
                    {
                        "label": "Einkommen",
                        "projected_amount": "2500",
                        "actual_amount": "2500",
                    }
                ],
                "categories": [
                    {
                        "name": "Wohnen",
                        "sort_order": 0,
                        "items": [
                            {
                                "label": "Miete",
                                "projected_cost": "900",
                                "actual_cost": "850",
                            }
                        ],
                    }
                ],
            },
        ]

        response = _restore(client, auth_headers, backup)
        assert response.status_code == 200
        result = response.json()
        assert result == {"created": 1, "skipped": 1}

        # The local September is untouched
        detail = client.get(f"/api/budgets/{local['id']}", headers=auth_headers).json()
        assert detail["title"] == "Local September"
        # October came over with full content
        budgets = client.get("/api/budgets/", headers=auth_headers).json()
        october = next(b for b in budgets if b["month"] == 10)
        detail = client.get(f"/api/budgets/{october['id']}", headers=auth_headers).json()
        assert detail["incomes"][0]["label"] == "Einkommen"
        assert Decimal(detail["incomes"][0]["projected_amount"]) == Decimal("2500.00")
        assert detail["categories"][0]["items"][0]["label"] == "Miete"

    def test_duplicate_months_inside_backup_counted_once(
        self, client, auth_headers
    ):
        backup = _download_backup(client, auth_headers).json()
        backup["budgets"] = [
            {"title": "A", "month": 5, "year": 2026, "incomes": [], "categories": []},
            {"title": "B", "month": 5, "year": 2026, "incomes": [], "categories": []},
        ]
        result = _restore(client, auth_headers, backup).json()
        assert result == {"created": 1, "skipped": 1}


class TestBackupRestoreReplace:
    """mode "replace" — wipe everything, then import the backup."""

    def test_replace_wipes_and_imports(self, client, auth_headers):
        # Local data that must disappear
        old = _create_budget(client, auth_headers, "Old Local", 3, 2025)
        _add_category_item(
            client, auth_headers, old["id"], "Alt", "Alt-Posten", 50, 50
        )

        # Build a backup with one different budget
        backup = _download_backup(client, auth_headers).json()
        backup["budgets"] = [
            {
                "title": "From Backup",
                "month": 9,
                "year": 2026,
                "incomes": [],
                "categories": [
                    {
                        "name": "Neu",
                        "sort_order": 0,
                        "items": [
                            {
                                "label": "Neu-Posten",
                                "projected_cost": "10",
                                "actual_cost": "20",
                            }
                        ],
                    }
                ],
            }
        ]

        response = _restore(client, auth_headers, backup, mode="replace")
        assert response.status_code == 200
        assert response.json() == {"created": 1, "skipped": 0}

        budgets = client.get("/api/budgets/", headers=auth_headers).json()
        assert len(budgets) == 1
        assert budgets[0]["title"] == "From Backup"
        detail = client.get(f"/api/budgets/{budgets[0]['id']}", headers=auth_headers).json()
        assert detail["categories"][0]["items"][0]["label"] == "Neu-Posten"
        assert (
            Decimal(detail["categories"][0]["items"][0]["actual_cost"])
            == Decimal("20")
        )

    def test_invalid_mode_rejected(self, client, auth_headers):
        backup = _download_backup(client, auth_headers).json()
        response = _restore(client, auth_headers, backup, mode="bogus")
        assert response.status_code == 422


class TestBackupValidation:
    """Format and version checks."""

    def test_unsupported_version_rejected(self, client, auth_headers):
        backup = _download_backup(client, auth_headers).json()
        backup["version"] = 99
        response = _restore(client, auth_headers, backup)
        assert response.status_code == 400

    def test_invalid_format_rejected(self, client, auth_headers):
        backup = _download_backup(client, auth_headers).json()
        backup["format"] = "something-else"
        response = _restore(client, auth_headers, backup)
        assert response.status_code == 422

    def test_invalid_month_rejected(self, client, auth_headers):
        backup = _download_backup(client, auth_headers).json()
        backup["budgets"] = [
            {"title": "X", "month": 13, "year": 2026, "incomes": [], "categories": []}
        ]
        response = _restore(client, auth_headers, backup)
        assert response.status_code == 422


class TestBackupRoundTrip:
    """Export → replace-restore → export yields the same data."""

    def test_round_trip_preserves_everything(self, client, auth_headers):
        b = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, b["id"], "Einkommen", 2500.5, 2480.25)
        _add_income(client, auth_headers, b["id"], "Extra", 100, 150)
        _add_category_item(
            client, auth_headers, b["id"], "Wohnen", "Miete", 900, 850
        )
        _add_category_item(
            client, auth_headers, b["id"], "Investitionen", "MSCI World", 500, 553.64
        )

        original = _download_backup(client, auth_headers).json()
        # Replace-restore the same backup into the same account
        result = _restore(client, auth_headers, original, mode="replace").json()
        assert result == {"created": 1, "skipped": 0}

        reexported = _download_backup(client, auth_headers).json()
        # Compare the payload (exported_at differs by design)
        assert reexported["budgets"] == original["budgets"]

    def test_other_user_cannot_see_backup_data(
        self, client, auth_headers, second_auth_headers
    ):
        b = _create_budget(client, auth_headers, "September", 9, 2026)
        _add_income(client, auth_headers, b["id"], "Einkommen", 2500, 2500)

        data = _download_backup(client, second_auth_headers).json()
        assert data["budgets"] == []
