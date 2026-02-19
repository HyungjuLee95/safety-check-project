# Backend Firebase/Firestore 연동

요청사항에 맞춰 현재 백엔드는 **Firestore 전용**으로 동작합니다.
메모리 fallback은 제거되었습니다.

## 동작 방식

- 서비스 계정 정보는 `app/storage/firestore_client.py` 내부에 하드코딩되어 있습니다.
- 백엔드 API는 모두 Firestore 컬렉션을 사용합니다.

## Firestore 컬렉션

- `users`
- `settings` (문서: `hospitals`)
- `checklists` (문서 ID: `workType`)
- `inspections`

## 실행

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
