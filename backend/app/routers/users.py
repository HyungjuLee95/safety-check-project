from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.services.users_service import (
    list_users,
    login_user,
    list_subadmins,
    create_subadmin,
    update_subadmin,
    delete_subadmin,
)

router = APIRouter(tags=["users"])


class LoginRequest(BaseModel):
    name: str
    phoneLast4: str


class SubadminUpsertRequest(BaseModel):
    name: str
    phoneLast4: str
    categories: Optional[List[str]] = []


@router.get("/users")
def get_users():
    return {"users": list_users()}


@router.post("/users/login")
def login(body: LoginRequest):
    try:
        user = login_user(body.name, body.phoneLast4)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return user


@router.get("/subadmins")
def get_subadmins():
    return {"subadmins": list_subadmins()}


@router.post("/subadmins")
def post_subadmin(body: SubadminUpsertRequest):
    try:
        return create_subadmin(body.name, body.phoneLast4, body.categories)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/subadmins/{subadmin_id}")
def put_subadmin(subadmin_id: str, body: SubadminUpsertRequest):
    try:
        return update_subadmin(subadmin_id, body.name, body.phoneLast4, body.categories)
    except ValueError as exc:
        message = str(exc)
        status = 404 if message == "subadmin not found" else 400
        raise HTTPException(status_code=status, detail=message)


@router.delete("/subadmins/{subadmin_id}")
def remove_subadmin(subadmin_id: str):
    ok = delete_subadmin(subadmin_id)
    if not ok:
        raise HTTPException(status_code=404, detail="subadmin not found")
    return {"status": "ok"}
