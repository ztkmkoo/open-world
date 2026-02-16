# Codex 프롬프트 00: 프로젝트 부트스트랩(Node.js + Express + SQLite)

당신은 1인 개발자를 돕는 시니어 풀스택 엔지니어입니다.
Node.js(Express) + SQLite 기반의 MVP 프로젝트를 부트스트랩하세요.
목표는 “빠르게 돌아가는 개발 서버 + 단순 구조 + 나중에 확장 가능” 입니다.

## 요구사항
- Node.js + Express
- SQLite(파일 DB). `better-sqlite3` 또는 `sqlite3` 사용(편한 쪽)
- 기본 라우팅/미들웨어
- 환경변수(.env) 지원
- 간단한 템플릿 렌더링(plain HTML) 또는 정적 파일 서빙
- 개발 서버 실행 스크립트 제공

## 파일/폴더 구조(권장)
- src/
  - server.js(or server.ts)
  - db/
    - db.js
    - migrate.js (선택)
  - routes/
    - auth.js
    - ui.js
    - api.js
    - command.js (나중)
  - ws/
    - chat.js (나중)
- public/
  - terminal.html (나중)
- data/
  - app.db (런타임 생성)
  - seed_v1.sql (추가 예정)

## 필수 엔드포인트
- GET /health -> 200 OK + {ok:true}
- GET / -> /login로 리다이렉트 (선택)

## 스크립트
- npm run dev : 개발 서버 실행(예: nodemon)
- npm run start : 프로덕션 실행

## 완료 기준
- npm install 성공
- npm run dev로 서버 기동
- 브라우저에서 /health가 200 OK
