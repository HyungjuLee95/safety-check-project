# Safety Check Project

현장 안전 점검(체크리스트 + 서명 + 승인/반려) 웹 앱입니다.  
프론트엔드(React/Vite)와 백엔드(FastAPI)가 분리되어 있으며, 데이터 저장소는 Firestore를 사용합니다.

## 1) 전체 동작 방식

1. 작업자(Worker)가 로그인 후 점검 정보를 입력하고 체크리스트를 작성합니다.
2. 전자 서명을 포함해 점검을 제출하면 상태가 `PENDING`이 됩니다.
3. 서브어드민(Sub Admin)은 자신에게 할당된 카테고리의 점검을 조회하고 승인/반려합니다.
   - 승인 시 상태 `SUBMITTED`
   - 반려 시 상태 `REJECTED` + 사유 저장
4. 작업자는 내 점검 내역에서 상태와 상세(반려 사유 포함)를 확인하고 재제출할 수 있습니다.
5. 마스터 어드민(Master Admin)은 전체 기록 조회, 체크리스트/장소/서브어드민 관리를 수행합니다.

## 2) DB(Firestore) 간단 소개

백엔드는 Firestore 컬렉션을 사용합니다.

- `users`
  - 사용자 정보(이름, 전화번호 뒤 4자리, role, categories, 권한 플래그)
  - 로그인 시 `nameKey + phoneLast4` 조합으로 조회
- `settings` / `hospitals` 문서
  - 장소(병원) 목록
- `checklists`
  - 작업 종류(workType)별 체크리스트 항목과 version
- `inspections`
  - 점검 본문, 상태, revisions, 작업자/서브어드민 서명, 반려 사유

## 3) 실행 방식 (Local)

### Backend

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API 문서: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

- 접속: `http://localhost:5173` (또는 내부망 IP)

### 프론트 API Base URL

`frontend/src/services/api.js`는 아래 우선순위로 API 주소를 결정합니다.

1. `VITE_API_BASE_URL` 환경변수
2. 없으면 현재 접속 호스트 기준 `http(s)://<hostname>:8000/api/v1`

운영/개발 분리 권장:

- `frontend/.env.local` (개발)
- `frontend/.env.production` (배포)

## 4) 로그인 방식

- 입력값: `name`, `phoneLast4`
- 백엔드 로그인 로직
  - 이름 정규화 + phoneLast4 검증(정확히 4자리)
  - `nameKey + phoneLast4`로 사용자 조회
  - 없으면 `WORKER`로 자동 생성
- 응답에는 `role`과 함께 `isMasterAdmin`, `isSubAdmin`, `isWorker` 플래그가 포함됩니다.

## 5) 권한/기능 정리

| 역할 | 주요 기능 |
|---|---|
| MASTER_ADMIN | 전체 점검 조회/상세, 체크리스트 관리, 장소 관리, 서브어드민 CRUD |
| SUB_ADMIN | 카테고리 기반 점검 조회, 점검 승인(서명 필수), 점검 반려(사유 입력) |
| WORKER | 점검 작성/제출, 내 점검 조회/상세, 반려 건 수정 후 재제출, 취소 |

권한 포인트:

- 서브어드민 승인/반려 API는 `subadminCategories`가 전달되면 해당 카테고리 점검만 처리 가능하도록 검증합니다.
- 승인 요청은 `subadminName`, `signatureBase64` 필수입니다.

## 6) 상태(Status) 흐름

- `PENDING`: 작업자 제출 후 승인 대기
- `SUBMITTED`: 서브어드민 승인 완료
- `REJECTED`: 서브어드민 반려
- `CANCELLED`: 작업자 취소

## 7) 주요 파일/기능 맵 (유지보수용)

### Root

- `README.md`: 프로젝트 운영/구조 가이드(본 문서)

### Frontend

- `frontend/src/App.jsx`
  - 전체 뷰 라우팅(state 기반)
  - 로그인/로그아웃, 점검 제출, 내역 조회, 승인/반려 핸들러 오케스트레이션
- `frontend/src/services/api.js`
  - axios 인스턴스, API base URL 결정, 전체 API 호출 모듈
- `frontend/src/pages/LoginView.jsx`
  - 이름 + 전화번호 뒤4자리 로그인 UI
- `frontend/src/pages/HomeView.jsx`, `SetupView.jsx`, `InspectionView.jsx`, `SignatureView.jsx`, `CompleteView.jsx`
  - 작업자 점검 작성 플로우
- `frontend/src/pages/my/*`
  - 작업자 내 점검 목록/상세/수정 진입
- `frontend/src/pages/admin/*`
  - 마스터 어드민 기능(기록, 상세, 체크리스트, 장소, 서브어드민 관리)
- `frontend/src/pages/subadmin/*`
  - 서브어드민 홈/목록
- `frontend/src/components/*`
  - 공통 UI 컴포넌트(PhoneFrame, LoadingOverlay 등)

### Backend

- `backend/app/main.py`
  - FastAPI 앱 생성, CORS 미들웨어, 라우터 등록
- `backend/app/core/config.py`
  - CORS 허용 Origin 목록
- `backend/app/routers/users.py`
  - 로그인, 유저 조회, 서브어드민 CRUD API
- `backend/app/routers/inspections.py`
  - 점검 제출/조회/내역/재제출/취소/승인/반려/엑셀 내보내기 API
- `backend/app/routers/checklists.py`
  - 작업별 체크리스트 조회/수정 API
- `backend/app/routers/settings.py`
  - 장소 목록 조회/수정 API
- `backend/app/services/users_service.py`
  - 사용자 정규화/로그인/역할 판별/서브어드민 관리
- `backend/app/services/inspections_service.py`
  - 점검 레코드 생성, 상태 전이, revision 관리, 카테고리 권한 체크
- `backend/app/services/checklists_service.py`
  - 체크리스트 버전/항목 관리
- `backend/app/services/settings_service.py`
  - 장소 목록 정규화/저장
- `backend/app/services/excel_export_service.py`
  - 점검 내역 엑셀 생성
- `backend/app/storage/firestore_client.py`
  - Firestore 클라이언트 생성
- `backend/scripts/verify_python_sources.py`
  - 소스에 충돌 마커/문법 문제 사전 점검 스크립트

## 8) 운영 시 참고

- 브라우저에서 API 호출은 "사용자 브라우저 기준"으로 실행됩니다.
  - 외부 사용자 대상 배포 시 `VITE_API_BASE_URL`은 내부 IP(예: `172.30.x.x`)가 아니라
    외부에서 접근 가능한 URL(공인 IP/도메인)이어야 합니다.
- CORS 이슈 발생 시
  1. 프론트 Origin
  2. 백엔드 CORS allow list
  3. 실제 Request URL
  을 함께 확인하세요.

---

## 9) Cloud Run 배포 가이드 (처음 하는 분용, backend/frontend 분리)

> 아래 순서는 **처음 Cloud Run을 쓰는 경우**를 기준으로, 실제로 따라 하기 쉽게 작성했습니다.

### 9-1. 배포 전 핵심 개념 3가지

1. Cloud Run 서비스는 **컨테이너 1개 = 서비스 1개**입니다.
2. 이 프로젝트는 `backend`(FastAPI)와 `frontend`(정적 파일 서빙)를 **각각 따로** 배포합니다.
3. 프론트의 `VITE_API_BASE_URL`은 빌드 시점에 결정되므로, 프론트 배포 전에 백엔드 URL을 먼저 확보해야 합니다.

### 9-2. 사전 준비

- GCP 프로젝트 생성
- 결제 계정 연결
- 로컬에 gcloud CLI 설치
- 로그인 및 프로젝트 선택

```bash
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>
```

- 필수 API 활성화

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

- 리전 예시(서울): `asia-northeast3`

### 9-3. Backend 먼저 배포 (FastAPI)

#### (1) `backend/Dockerfile` 생성

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
```

> Cloud Run은 컨테이너가 `PORT` 환경변수를 사용해 리슨해야 합니다.

#### (2) 빌드 + 배포

```bash
gcloud builds submit ./backend --tag gcr.io/<YOUR_PROJECT_ID>/safety-backend

gcloud run deploy safety-backend \
  --image gcr.io/<YOUR_PROJECT_ID>/safety-backend \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated
```

#### (3) 백엔드 URL 확인

```bash
gcloud run services describe safety-backend \
  --region asia-northeast3 \
  --format='value(status.url)'
```

출력 예: `https://safety-backend-xxxxx-an.a.run.app`

#### (4) 헬스체크

```bash
curl -i https://<BACKEND_RUN_URL>/docs
```

### 9-4. Frontend 배포 (Vite 정적 파일)

#### (1) 프론트 배포용 환경변수 준비

`frontend/.env.production` 생성:

```env
VITE_API_BASE_URL=https://<BACKEND_RUN_URL>/api/v1
```

> 내부 IP(172.30.x.x), 공유기 공인 IP(210.x.x.x)를 Cloud Run 운영용으로 넣지 마세요.  
> Cloud Run 백엔드 URL 또는 커스텀 도메인을 사용해야 합니다.

#### (2) `frontend/Dockerfile` 생성

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run은 8080 포트를 사용하므로 nginx listen 포트 변경
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

#### (3) 빌드 + 배포

```bash
gcloud builds submit ./frontend --tag gcr.io/<YOUR_PROJECT_ID>/safety-frontend

gcloud run deploy safety-frontend \
  --image gcr.io/<YOUR_PROJECT_ID>/safety-frontend \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated
```

#### (4) 프론트 URL 확인

```bash
gcloud run services describe safety-frontend \
  --region asia-northeast3 \
  --format='value(status.url)'
```

### 9-5. CORS 설정 업데이트 (중요)

현재 백엔드 CORS 목록은 localhost/내부IP/외부IP 중심입니다. Cloud Run 프론트 URL도 허용해야 합니다.

예: `backend/app/core/config.py`의 `CORS_ORIGINS`에 아래 추가

- `https://<FRONTEND_RUN_URL_HOST>`

수정 후 백엔드를 다시 배포하세요.

> 가능하면 장기적으로 `CORS_ORIGINS`를 코드 하드코딩이 아니라 환경변수 기반으로 바꾸는 것을 권장합니다.

### 9-6. 배포 후 검증 체크리스트

1. 프론트 URL 접속 가능
2. 로그인 시 Network `Request URL`이 `https://<BACKEND_RUN_URL>/api/v1/users/login`으로 호출됨
3. 백엔드 Cloud Run 로그에 요청이 보임
4. 점검 제출/승인/반려/내역 조회/엑셀 다운로드까지 end-to-end 확인

Cloud Run 로그 확인:

```bash
gcloud run services logs read safety-backend --region asia-northeast3 --limit 100
gcloud run services logs read safety-frontend --region asia-northeast3 --limit 100
```

### 9-7. 자주 막히는 포인트

- `VITE_API_BASE_URL`를 내부망 주소로 설정함 → 외부 사용자 브라우저에서 API 호출 실패
- 프론트를 다시 빌드하지 않고 예전 이미지 재사용함
- 백엔드 CORS에 프론트 Cloud Run 도메인을 추가하지 않음
- 백엔드는 HTTPS인데 프론트에서 HTTP URL 호출(Mixed Content)

### 9-8. 보안 주의사항(반드시 확인)

현재 코드의 Firestore 서비스 계정 정보는 `backend/app/storage/firestore_client.py`에 하드코딩돼 있습니다.
운영 배포 전에는 다음을 강력 권장합니다.

1. 노출된 키 즉시 폐기/재발급
2. Cloud Run 서비스 계정(IAM) 기반 인증으로 전환
3. 비밀정보는 Secret Manager로 관리

이 항목을 먼저 정리한 뒤 운영 배포를 진행하세요.


## 10) 최근 UI/권한 변경 사항 (모바일/운영 편의)

- 서브관리자 권한 관리 화면
  - 기본은 목록 중심으로 표시하고, `서브관리자 등록` 버튼 클릭 시에만 등록 폼이 펼쳐집니다.
  - 등록 폼 하단 버튼은 `등록` / `취소` 2분할이며, `취소` 시 폼이 닫히고 입력값이 초기화됩니다.
- 대시보드 상단 통계 카드 통일
  - 마스터/서브/워커 모두 `Today Report | Today | Pending` 3칸 구조를 사용합니다.
- 마스터 관리자 홈 메뉴 순서 변경
  1. 기록 조회 및 엑셀
  2. 점검 업무 등록
  3. 작업 장소 관리
  4. 체크리스트 관리
  5. 서브관리자 권한 관리
- 점검 업무 등록(카테고리) 관리 기능 추가
  - 작업 카테고리 목록을 조회/추가/삭제할 수 있습니다.
  - 백엔드 `settings/work_types` 문서에 저장됩니다.
- 승인 권한 확장
  - 기존: 서브관리자(카테고리 제한)만 승인/반려
  - 변경: 마스터 관리자는 모든 `PENDING` 문서에 대해 승인/반려 가능

### 관련 파일

- `frontend/src/pages/admin/AdminSubadminManager.jsx`
- `frontend/src/pages/admin/AdminHomeView.jsx`
- `frontend/src/pages/subadmin/SubAdminHomeView.jsx`
- `frontend/src/pages/HomeView.jsx`
- `frontend/src/pages/admin/AdminWorkTypeManager.jsx`
- `frontend/src/pages/admin/AdminRecordDetailView.jsx`
- `frontend/src/App.jsx`
- `frontend/src/services/api.js`
- `backend/app/routers/settings.py`
- `backend/app/services/settings_service.py`

## 11) 엑셀/PDF 출력용 데이터 필드 맵

아래는 현재 코드에서 실제로 사용 중인 점검 데이터 필드 정리입니다.
형식은 `변수명 : 의미` 기준이며, 엑셀 출력/향후 PDF 출력 설계 시 그대로 매핑해서 사용하면 됩니다.

### 11-1. 점검 제출(입력) 필드

- `userName` : 점검자 이름
- `date` : 작성일/점검일 (`YYYY-MM-DD`)
- `hospital` : 병원명(작업 장소)
- `equipmentName` : 장비명(없을 수 있음)
- `workType` : 작업 종류(카테고리)
- `checklistVersion` : 체크리스트 버전
- `answers` : 체크리스트 응답 배열
- `signatureBase64` : 점검자 서명 이미지(base64)

`answers[]` 내부 항목

- `itemId` : 체크리스트 항목 ID
- `question` : 질문 문구
- `value` : 점검 결과(예: `양호`, `보통`, `점검필요`)
- `comment` : 개선점/점검필요 사유

### 11-2. 저장 시 생성/유지되는 필드

- `id` : 점검 문서 ID
- `status` : 상태(`PENDING`/`SUBMITTED`/`REJECTED`/`CANCELLED`)
- `createdAt`, `updatedAt` : 생성/수정 시각
- `revisions`, `latestRevision` : 제출/수정 이력
- `results` : 최신 체크리스트 응답 배열(엑셀 출력 시 사용)
- `resultCount` : 양호 개수/전체 개수(예: `18/22`)
- `improveCount` : 점검필요 개수
- `approvedBy`, `approvedAt` : 승인자/승인시각
- `subadminSignatureBase64` : 검수자(승인자) 서명 이미지
- `rejectedBy`, `rejectedAt`, `rejectReason` : 반려 처리 정보

### 11-3. 엑셀 생성 시 참조되는 필드

- 상단 메타
  - `date` : 작성일
  - `userName` 또는 `name` : 점검자
  - `hospital` : 병원명
  - `workType` : 작업종류
  - `equipmentName` : 장비
  - `subadminName` : 검수자 이름
- 서명
  - `subadminSignatureBase64` : 검수자 서명
  - `signatureBase64` : 점검자 서명
- 본문 체크리스트
  - `results[].question` : 질문
  - `results[].value` : 결과
  - `results[].comment` : 개선점/사유

### 11-4. 요청하신 PDF 서식 기준 권장 매핑

- `작성일` : `date`
- `점검자` : `userName` (fallback: `name`)
- `병원명` : `hospital`
- `작업종류 및 기기` : `workType` + `equipmentName`
- `x/y/z 체크 항목` : `results[]`에서 질문/결과를 해당 서식 항목으로 매핑
- `개선점` : `results[].comment`(특히 `value = 점검필요`인 항목 중심)
- `검수자 서명` : `subadminSignatureBase64`
- `점검자 서명` : `signatureBase64`

### 11-5. 출력용(PDF) 다음 단계 제안

1. **출력 전용 DTO 확정**
   - 상단 정보(작성일/점검자/병원/작업종류/장비/검수자)
   - 체크 항목(질문/결과/개선점)
   - 서명(검수자/점검자)
2. **레이아웃 결정**
   - 고정 문구(x/y/z) + 동적 리스트 혼합 여부 결정
3. **출력 경로 결정**
   - A안: 현재 엑셀 템플릿 기반 유지 후 PDF 변환
   - B안: HTML 템플릿 렌더 후 PDF 생성
