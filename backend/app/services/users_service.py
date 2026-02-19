from typing import Any, Dict, List, Optional

from app.storage.memory_store import (
    USERS,
    USER_ROLE_MASTER_ADMIN,
    USER_ROLE_SUB_ADMIN,
    USER_ROLE_WORKER,
)

try:
    from google.cloud import firestore
except Exception:
    firestore = None


VALID_ROLES = {USER_ROLE_MASTER_ADMIN, USER_ROLE_SUB_ADMIN, USER_ROLE_WORKER}


def _build_flags(role: str) -> Dict[str, bool]:
    return {
        "isMasterAdmin": role == USER_ROLE_MASTER_ADMIN,
        "isSubAdmin": role == USER_ROLE_SUB_ADMIN,
        "isWorker": role == USER_ROLE_WORKER,
    }


def _normalize_phone_last4(phone_last4: str) -> str:
    digits = "".join(ch for ch in str(phone_last4 or "") if ch.isdigit())
    if len(digits) != 4:
        raise ValueError("phoneLast4 must be exactly 4 digits")
    return digits


def _normalize_categories(categories: Optional[List[str]]) -> List[str]:
    out: List[str] = []
    for c in categories or []:
        value = str(c or "").strip()
        if value and value not in out:
            out.append(value)
    return out


def _get_client() -> Optional[Any]:
    if firestore is None:
        return None
    try:
        return firestore.Client()
    except Exception:
        return None


def _normalize_user_payload(data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    role = str(data.get("role") or "").strip().upper()
    if role not in VALID_ROLES:
        role = USER_ROLE_WORKER

    phone_last4 = _normalize_phone_last4(data.get("phoneLast4") or "")
    categories = _normalize_categories(data.get("categories") if role == USER_ROLE_SUB_ADMIN else [])

    return {
        "id": user_id,
        "name": str(data.get("name") or "").strip(),
        "phoneLast4": phone_last4,
        "role": role,
        "categories": categories,
        **_build_flags(role),
    }


def _list_users_memory() -> List[Dict[str, Any]]:
    users = []
    for u in USERS:
        users.append(_normalize_user_payload(u, str(u.get("id") or "")))
    return users


def list_users() -> List[Dict[str, Any]]:
    client = _get_client()
    if client is None:
        return _list_users_memory()

    docs = client.collection("users").stream()
    users = []
    for doc in docs:
        data = doc.to_dict() or {}
        users.append(_normalize_user_payload(data, doc.id))
    return users


def _build_firestore_payload(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": user["name"],
        "phoneLast4": user["phoneLast4"],
        "role": user["role"],
        "categories": user.get("categories") or [],
        "isMasterAdmin": user["isMasterAdmin"],
        "isSubAdmin": user["isSubAdmin"],
        "isWorker": user["isWorker"],
    }


def _login_user_memory(name: str, phone_last4: str) -> Dict[str, Any]:
    for user in USERS:
        if user.get("name") == name and user.get("phoneLast4") == phone_last4:
            return _normalize_user_payload(user, str(user.get("id") or ""))
    raise ValueError("user not found")


def login_user(name: str, phone_last4: str) -> Dict[str, Any]:
    cleaned_name = str(name or "").strip()
    cleaned_phone_last4 = _normalize_phone_last4(phone_last4)

    if not cleaned_name:
        raise ValueError("name is required")

    client = _get_client()
    if client is None:
        return _login_user_memory(cleaned_name, cleaned_phone_last4)

    users_col = client.collection("users")

    user_docs = (
        users_col.where("name", "==", cleaned_name)
        .where("phoneLast4", "==", cleaned_phone_last4)
        .limit(1)
        .stream()
    )
    user_doc = next(user_docs, None)

    if not user_doc:
        raise ValueError("user not found")

    data = user_doc.to_dict() or {}
    normalized = _normalize_user_payload(data, user_doc.id)
    users_col.document(user_doc.id).set(_build_firestore_payload(normalized), merge=True)
    return normalized


def list_subadmins() -> List[Dict[str, Any]]:
    return [u for u in list_users() if u.get("role") == USER_ROLE_SUB_ADMIN]


def create_subadmin(name: str, phone_last4: str, categories: Optional[List[str]]) -> Dict[str, Any]:
    cleaned_name = str(name or "").strip()
    cleaned_phone_last4 = _normalize_phone_last4(phone_last4)
    cleaned_categories = _normalize_categories(categories)

    if not cleaned_name:
        raise ValueError("name is required")

    new_user = _normalize_user_payload(
        {
            "name": cleaned_name,
            "phoneLast4": cleaned_phone_last4,
            "role": USER_ROLE_SUB_ADMIN,
            "categories": cleaned_categories,
        },
        "",
    )

    client = _get_client()
    if client is None:
        for user in USERS:
            if user.get("name") == cleaned_name and user.get("phoneLast4") == cleaned_phone_last4:
                raise ValueError("subadmin already exists")
        new_user["id"] = f"subadmin-{len(USERS) + 1}"
        USERS.append(new_user)
        return new_user

    users_col = client.collection("users")
    existing = (
        users_col.where("name", "==", cleaned_name)
        .where("phoneLast4", "==", cleaned_phone_last4)
        .limit(1)
        .stream()
    )
    if next(existing, None):
        raise ValueError("subadmin already exists")

    ref = users_col.document()
    new_user["id"] = ref.id
    ref.set(_build_firestore_payload(new_user))
    return new_user


def update_subadmin(subadmin_id: str, name: str, phone_last4: str, categories: Optional[List[str]]) -> Dict[str, Any]:
    cleaned_name = str(name or "").strip()
    cleaned_phone_last4 = _normalize_phone_last4(phone_last4)
    cleaned_categories = _normalize_categories(categories)
    if not cleaned_name:
        raise ValueError("name is required")

    client = _get_client()
    if client is None:
        for i, user in enumerate(USERS):
            if str(user.get("id")) != str(subadmin_id):
                continue
            updated = _normalize_user_payload(
                {
                    "name": cleaned_name,
                    "phoneLast4": cleaned_phone_last4,
                    "role": USER_ROLE_SUB_ADMIN,
                    "categories": cleaned_categories,
                },
                str(subadmin_id),
            )
            USERS[i] = updated
            return updated
        raise ValueError("subadmin not found")

    ref = client.collection("users").document(subadmin_id)
    snap = ref.get()
    if not snap.exists:
        raise ValueError("subadmin not found")

    updated = _normalize_user_payload(
        {
            "name": cleaned_name,
            "phoneLast4": cleaned_phone_last4,
            "role": USER_ROLE_SUB_ADMIN,
            "categories": cleaned_categories,
        },
        subadmin_id,
    )
    ref.set(_build_firestore_payload(updated), merge=True)
    return updated


def delete_subadmin(subadmin_id: str) -> bool:
    client = _get_client()
    if client is None:
        for i, user in enumerate(USERS):
            if str(user.get("id")) == str(subadmin_id):
                USERS.pop(i)
                return True
        return False

    ref = client.collection("users").document(subadmin_id)
    snap = ref.get()
    if not snap.exists:
        return False
    ref.delete()
    return True
