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



def _clean_work_types(work_types: List[str]) -> List[str]:
    cleaned = []
    for w in work_types or []:
        s = str(w).strip()
        if s and s not in cleaned:
            cleaned.append(s)
    return cleaned


def get_work_types() -> Dict[str, object]:
    client = get_firestore_client()
    ref = client.collection("settings").document("work_types")
    doc = ref.get()
    if not doc.exists:
        initial = {
            "workTypes": ["X-ray 설치작업", "MR 설치작업", "CT 작업", "정기 유지보수"],
            "updatedAt": datetime.datetime.now().isoformat(),
        }
        ref.set(initial, merge=True)
        return initial

    data = doc.to_dict() or {}
    work_types = _clean_work_types(data.get("workTypes") or [])
    return {
        "workTypes": work_types,
        "updatedAt": data.get("updatedAt") or datetime.datetime.now().isoformat(),
    }


def update_work_types(admin_name: str, work_types: List[str]) -> Dict[str, object]:
    cleaned = _clean_work_types(work_types)
    payload = {
        "workTypes": cleaned,
        "updatedBy": admin_name,
        "updatedAt": datetime.datetime.now().isoformat(),
    }
    client = get_firestore_client()
    client.collection("settings").document("work_types").set(payload, merge=True)
    return {
        "status": "ok",
        "adminName": admin_name,
        "workTypes": cleaned,
        "updatedAt": payload["updatedAt"],
    }
