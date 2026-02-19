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
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```


## users 로그인 매칭

- `users` 문서에는 `nameKey`(이름 정규화 키) 필드를 함께 저장합니다.
- 로그인 시 `nameKey + phoneLast4`로 우선 조회하고, 기존 데이터 호환을 위해 `phoneLast4` 기반 보정 조회도 수행합니다.


## 트러블슈팅 (SyntaxError: `---`)

복붙/충돌 해결 중 파일에 `---`, `<<<<<<<`, `=======`, `>>>>>>>` 같은 줄이 들어가면 Python 문법 에러가 납니다.
서버 실행 전에 아래 명령으로 먼저 검증하세요.

```bash
cd backend
python scripts/verify_python_sources.py
python -m compileall app
```

정상이면 아래로 실행합니다.

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 원격 최신 브랜치 내려받기 (로컬 기준)

```bash
git fetch --all --prune
git checkout fix/local-runtime-error
git pull --rebase origin fix/local-runtime-error
```
