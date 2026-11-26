"""Backup service — export and restore a user's budgets as JSON.

The backup is a portable JSON document (see app/schemas/backup.py):
every budget with its incomes, categories, and expense items. It is
deliberately independent of the storage backend, so it can be kept as
a personal archive or moved between frekl instances.

Restore has two modes:
- "merge" (default): only budgets whose (year, month) does not exist
  yet are created; existing months are left untouched and counted as
  skipped.
- "replace": ALL of the user's budgets are deleted first, then
  everything from the backup is imported. The mode must be requested
  explicitly; the endpoint's docstring carries the warning.
"""

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.expense_item import ExpenseItem
from app.models.income import Income
from app.models.user import User
from app.schemas.backup import (
    BackupBudget,
    BackupData,
    RestoreRequest,
    RestoreResponse,
)

BACKUP_FORMAT = "frekl-backup"
BACKUP_VERSION = 1


def export_user_backup(user: User) -> BackupData:
    """Collect all of the user's budgets into a backup document."""
    budgets = sorted(user.budgets, key=lambda b: (b.year, b.month, b.id))
    return BackupData(
        format=BACKUP_FORMAT,
        version=BACKUP_VERSION,
        exported_at=datetime.now(UTC),
        email=user.email,
        budgets=[
            BackupBudget(
                title=budget.title,
                month=budget.month,
                year=budget.year,
                incomes=[
                    {
                        "label": income.label,
                        "projected_amount": income.projected_amount,
                        "actual_amount": income.actual_amount,
                    }
                    for income in budget.incomes
                ],
                categories=[
                    {
                        "name": category.name,
                        "sort_order": category.sort_order,
                        "items": [
                            {
                                "label": item.label,
                                "projected_cost": item.projected_cost,
                                "actual_cost": item.actual_cost,
                            }
                            for item in category.items
                        ],
                    }
                    for category in sorted(
                        budget.categories or [],
                        key=lambda c: (c.sort_order, c.id),
                    )
                ],
            )
            for budget in budgets
        ],
    )


def _create_budget_from_backup(
    user: User, backup_budget: BackupBudget, db: Session
) -> Budget:
    """Insert one budget with all nested data from a backup entry."""
    budget = Budget(
        user_id=user.id,
        title=backup_budget.title,
        month=backup_budget.month,
        year=backup_budget.year,
    )
    db.add(budget)
    db.flush()  # populate budget.id

    for income in backup_budget.incomes:
        db.add(
            Income(
                budget_id=budget.id,
                label=income.label,
                projected_amount=income.projected_amount,
                actual_amount=income.actual_amount,
            )
        )

    for category in backup_budget.categories:
        new_category = Category(
            budget_id=budget.id,
            name=category.name,
            sort_order=category.sort_order,
        )
        db.add(new_category)
        db.flush()  # populate new_category.id

        for item in category.items:
            db.add(
                ExpenseItem(
                    category_id=new_category.id,
                    label=item.label,
                    projected_cost=item.projected_cost,
                    actual_cost=item.actual_cost,
                )
            )

    return budget


def restore_user_backup(
    user: User, request: RestoreRequest, db: Session
) -> RestoreResponse:
    """Restore budgets from a backup document into the user's account."""
    data = request.data
    if data.version != BACKUP_VERSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported backup version {data.version} "
                f"(this instance supports version {BACKUP_VERSION})."
            ),
        )

    if request.mode == "replace":
        # Delete everything first (ORM cascade removes the nested
        # incomes, categories, and items).
        for budget in list(user.budgets):
            db.delete(budget)
        db.flush()

    # Months already present (after a possible replace) are skipped in
    # merge mode — the local copy wins, the backup fills the gaps.
    existing = {
        (b.year, b.month)
        for b in db.scalars(select(Budget).where(Budget.user_id == user.id))
    }

    created = 0
    skipped = 0
    for backup_budget in data.budgets:
        if (backup_budget.year, backup_budget.month) in existing:
            skipped += 1
            continue
        _create_budget_from_backup(user, backup_budget, db)
        existing.add((backup_budget.year, backup_budget.month))
        created += 1

    db.commit()
    return RestoreResponse(created=created, skipped=skipped)
