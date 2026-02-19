import datetime
from typing import Dict, List

from app.storage.firestore_client import get_firestore_client


def _clean_hospitals(hospitals: List[str]) -> List[str]:
    cleaned = []
    for h in hospitals or []:
        s = str(h).strip()
        if s and s not in cleaned:
            cleaned.append(s)
    return cleaned


def get_hospitals() -> Dict[str, object]:
    client = get_firestore_client()
    doc = client.collection("settings").document("hospitals").get()

    if not doc.exists:
        initial = {"hospitals": [], "updatedAt": datetime.datetime.now().isoformat()}
        client.collection("settings").document("hospitals").set(initial, merge=True)
        return initial

    data = doc.to_dict() or {}
    hospitals = _clean_hospitals(data.get("hospitals") or [])
    return {
        "hospitals": hospitals,
        "updatedAt": data.get("updatedAt") or datetime.datetime.now().isoformat(),
    }


def update_hospitals(admin_name: str, hospitals: List[str]) -> Dict[str, object]:
    cleaned = _clean_hospitals(hospitals)
    payload = {
        "hospitals": cleaned,
        "updatedBy": admin_name,
        "updatedAt": datetime.datetime.now().isoformat(),
    }
    client = get_firestore_client()
    client.collection("settings").document("hospitals").set(payload, merge=True)
    return {
        "status": "ok",
        "adminName": admin_name,
        "hospitals": cleaned,
        "updatedAt": payload["updatedAt"],
    }
