# Backend Firebase/Firestore 연동

이 백엔드는 Firestore 전용으로 동작합니다. 메모리 fallback은 사용하지 않습니다.

## 실행

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Firestore 컬렉션

- `users`
- `settings` (문서: `hospitals`)
- `checklists` (문서 ID: `workType`)
- `inspections`

서비스 계정 정보는 코드(`app/storage/firestore_client.py`)에 고정되어 있습니다.
