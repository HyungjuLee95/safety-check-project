from pydantic import BaseModel
from typing import List, Optional

class InspectionAnswer(BaseModel):
    itemId: str
    question: str
    value: str
    comment: Optional[str] = ""

class InspectionSubmission(BaseModel):
    userName: str
    date: str
    hospital: str
    # 프론트에서 필드가 비어있을 수 있어 Optional 처리
    equipmentName: Optional[str] = None
    workType: str
    checklistVersion: int = 1
    answers: List[InspectionAnswer]
    # 1차 저장(서명 전)까지도 허용하기 위해 Optional
    signatureBase64: Optional[str] = None
