"""Search router — global search across budgets, categories, and items."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.search import SearchResponse
from app.services.search import search_user_data

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get(
    "/",
    response_model=SearchResponse,
    summary="Search budgets, categories, and expense items by name",
)
def search(
    q: str = Query(min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SearchResponse:
    """Case-insensitive substring search over the user's data.

    Returns three groups — matching budget titles, category names, and
    item labels — aggregated globally: ONE hit per distinct name with
    its occurrence count and the most recent occurrence as context.
    Groups are newest-first and capped (10 budgets, 10 categories, 20
    items); every hit carries its most recent budget id so the frontend
    can navigate to it.
    """
    return search_user_data(current_user, q)
