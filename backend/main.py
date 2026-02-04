from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime
import random

app = FastAPI()

# CORS 설정 (프론트엔드 포트 5173 허용)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 데이터 모델 정의 ---
class InspectionAnswer(BaseModel):
    itemId: str
    question: str
    value: str

class InspectionSubmission(BaseModel):
    userName: str
    date: str
    hospital: str
    workType: str
    checklistVersion: int
    answers: List[InspectionAnswer]
    signatureBase64: str

# --- API 엔드포인트 ---

@app.get("/")
def read_root():
    return {"status": "Safety Inspection API Running"}

# 1. 작업 장소 목록 조회
@app.get("/api/v1/settings/hospitals")
def get_hospitals():
    return {
        "hospitals": ["서울대병원", "아산병원", "삼성서울병원", "세브란스병원", "경희대병원", "성모병원(추가됨)"],
        "updatedAt": datetime.datetime.now().isoformat()
    }

# 2. 체크리스트 조회
@app.get("/api/v1/checklists/{work_type}")
def get_checklist(work_type: str):
    # 더미 데이터 반환
    return {
        "workType": work_type,
        "version": 1,
        "items": [
            {"id": "1", "text": f"[{work_type}] 안전 보호구를 착용했는가?", "order": 1},
            {"id": "2", "text": "작업 전 장비 상태는 양호한가?", "order": 2},
            {"id": "3", "text": "주변 통제 및 위험 요소가 제거되었는가?", "order": 3},
            {"id": "4", "text": "비상 연락망을 숙지하고 있는가?", "order": 4},
            {"id": "5", "text": "작업 종료 후 정리정돈 계획이 있는가?", "order": 5}
        ]
    }

# 3. 점검 결과 제출
@app.post("/api/v1/inspections")
def submit_inspection(data: InspectionSubmission):
    print(f"[수신] 점검자: {data.userName}, 장소: {data.hospital}")
    # 실제로는 여기서 DB에 저장
    return {"status": "success", "id": "mock-doc-id-123"}

# 4. 점검 기록 조회 (Admin)
@app.get("/api/v1/inspections")
def get_inspections(
    admin_name: str,
    start_date: str,
    end_date: str
):
    # 더미 기록 데이터 생성
    mock_records = []
    for i in range(5):
        mock_records.append({
            "id": f"rec-{i}",
            "name": "홍길동" if i % 2 == 0 else "이현비",
            "date": start_date, # 조회 시작일로 고정
            "hospital": "서울대병원",
            "workType": "CT 작업",
            "resultCount": "5/5",
            "results": [
                {"question": "보호구 착용", "value": "YES"},
                {"question": "장비 점검", "value": "YES"}
            ]
        })
    return mock_records

# 5. 엑셀 다운로드 (Admin)
@app.get("/api/v1/inspections/export")
def export_inspections():
    # 파일 생성 로직이 없으므로 테스트용 텍스트 파일 반환
    from fastapi.responses import Response
    dummy_excel_content = b"Mock Excel Content" 
    return Response(
        content=dummy_excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=report.xlsx"}
    )

# 6. 설정 업데이트 (Admin) - Mock
@app.post("/api/v1/checklists")
def update_checklist(data: Dict[str, Any]):
    return {"status": "updated", "data": data}

@app.post("/api/v1/settings/hospitals")
def update_hospitals(data: Dict[str, Any]):
    return {"status": "updated", "data": data}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)