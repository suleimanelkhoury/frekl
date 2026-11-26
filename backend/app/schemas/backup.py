"""Pydantic schemas for the backup export/restore endpoints.

The backup format is a portable, database-agnostic JSON document
containing all of one user's budgets with nested incomes, categories,
and items. It is intentionally independent of the storage backend
(SQLite in dev, PostgreSQL in production) so it can move between
instances.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class BackupIncome(BaseModel):
    """One income row inside a backed-up budget."""

    label: str = Field(min_length=1, max_length=100)
    projected_amount: Decimal
    actual_amount: Decimal


class BackupItem(BaseModel):
    """One expense row inside a backed-up category."""

    label: str = Field(min_length=1, max_length=100)
    projected_cost: Decimal
    actual_cost: Decimal


class BackupCategory(BaseModel):
    """One category with its expense rows."""

    name: str = Field(min_length=1, max_length=100)
    sort_order: int
    items: list[BackupItem] = []


class BackupBudget(BaseModel):
    """One monthly budget with all nested data."""

    title: str = Field(min_length=1, max_length=100)
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=1900, le=2100)
    incomes: list[BackupIncome] = []
    categories: list[BackupCategory] = []


class BackupData(BaseModel):
    """The complete backup document for one user."""

    format: Literal["frekl-backup"] = "frekl-backup"
    version: int = 1
    exported_at: datetime
    email: str  # informational — whose data this is
    budgets: list[BackupBudget] = []


class RestoreRequest(BaseModel):
    """Request body for restoring a backup.

    mode "merge" (default) creates only budgets whose (year, month) is
    not already present; mode "replace" deletes ALL of the user's
    budgets first and then imports everything from the backup.
    """

    data: BackupData
    mode: Literal["merge", "replace"] = "merge"


class RestoreResponse(BaseModel):
    """Result summary of a restore."""

    created: int
    skipped: int
