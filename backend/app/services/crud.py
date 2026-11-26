"""Shared mutation helpers for the API routers."""

from typing import Any

from pydantic import BaseModel


def apply_update(obj: Any, model_in: BaseModel) -> None:
    """Copy the explicitly-set fields of `model_in` onto `obj` in place.

    No commit — the caller stays in charge of touching the budget,
    committing, and refreshing (those steps differ per endpoint).
    """
    update_data = model_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(obj, field, value)
