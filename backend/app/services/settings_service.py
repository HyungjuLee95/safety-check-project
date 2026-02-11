import datetime
from typing import Dict, List

from app.storage.memory_store import HOSPITALS


def get_hospitals() -> Dict[str, object]:
    return {
        "hospitals": HOSPITALS,
        "updatedAt": datetime.datetime.now().isoformat(),
    }


def update_hospitals(admin_name: str, hospitals: List[str]) -> Dict[str, object]:
    # 간단 검증/정규화
    cleaned = []
    for h in hospitals or []:
        s = str(h).strip()
        if s and s not in cleaned:
            cleaned.append(s)

    HOSPITALS.clear()
    HOSPITALS.extend(cleaned)

    return {
        "status": "ok",
        "adminName": admin_name,
        "hospitals": HOSPITALS,
        "updatedAt": datetime.datetime.now().isoformat(),
    }
