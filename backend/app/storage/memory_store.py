"""In-memory 저장소 (테스트/데모용).

DB를 붙이기 전까지 프론트/백엔드 API contract를 고정하기 위한 단순 저장소다.
"""

from typing import Any, Dict, List

# settings
HOSPITALS: List[str] = [
    "서울대병원",
    "아산병원",
    "삼성서울병원",
    "세브란스병원",
    "경희대병원",
]

# checklists: workType -> {version:int, items:[{id,text,order}]}
CHECKLISTS: Dict[str, Dict[str, Any]] = {}

# inspections
INSPECTIONS: List[Dict[str, Any]] = []

def add_inspection(record: Dict[str, Any]) -> None:
    INSPECTIONS.append(record)

def list_inspections() -> List[Dict[str, Any]]:
    return INSPECTIONS
