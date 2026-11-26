"""Backup router — export and restore a user's budgets as JSON.

Per-user backup for self-hosting: every authenticated user can download
their complete data (all budgets with incomes, categories, and items)
as a portable JSON file and restore it here or on another instance.
"""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.backup import RestoreRequest, RestoreResponse
from app.services.backup import export_user_backup, restore_user_backup

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get(
    "/",
    summary="Download all of the user's data as a JSON backup file",
    responses={
        200: {
            "description": "The backup as a .json file (attachment)",
            "content": {"application/json": {}},
        }
    },
)
def download_backup(
    current_user: User = Depends(get_current_user),
) -> Response:
    """Return the user's complete data as a downloadable JSON backup.

    The file contains every budget with nested incomes, categories, and
    expense items — everything needed to restore the account elsewhere
    (or to keep as an archive). Password and account metadata are
    intentionally NOT included.
    """
    backup = export_user_backup(current_user)
    stamp = backup.exported_at.strftime("%Y%m%d")
    return Response(
        content=backup.model_dump_json(),
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f'attachment; filename="frekl-backup-{stamp}.json"'
            )
        },
    )


@router.post(
    "/restore",
    response_model=RestoreResponse,
    summary="Restore budgets from a backup document",
)
def restore_backup(
    request: RestoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RestoreResponse:
    """Restore budgets from a backup document into the user's account.

    mode "merge" (default) creates only budgets whose (year, month) does
    not exist yet — existing months are left untouched.

    mode "replace" DELETES ALL of the user's budgets first and then
    imports everything from the backup. There is no undo — keep the
    downloaded backup file before using this mode.
    """
    return restore_user_backup(current_user, request, db)
