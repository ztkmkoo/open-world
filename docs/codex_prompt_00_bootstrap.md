# Codex 프롬프트 00: 프로젝트 부트스트랩/베이스라인 정합성 점검 (Node.js + Express + SQLite)

당신은 1인 개발자를 돕는 시니어 풀스택 엔지니어입니다.  
이 프로젝트는 이미 MVP 베이스가 존재합니다.  
이번 Step 0의 목적은 “새로 갈아엎기”가 아니라 **현재 베이스라인을 점검/보정**하는 것입니다.

## 현재 전제(이미 구현됨)
- Node.js + Express + SQLite(`better-sqlite3`)
- seed SQL 적용 경로 존재 (`docs/seed_v1.sql`)
- 로그인→문파선택→터미널 진입 플로우 구현
- `/command` 최소 명령(도움/상태/문파) 구현

## Step 0 목표
1) 개발 실행 베이스라인 점검
2) 누락된 최소 운영 보조 엔드포인트/문서 보완
3) 다음 단계(WS 채팅)로 안정적으로 넘어갈 수 있는 상태 확정

## 점검/보완 항목
- 의존성/스크립트:
  - `npm install`
  - `npm run db:init`
  - `npm run dev`
- 서버 기본 라우팅:
  - `GET /` -> `/login` 리다이렉트 유지 확인
  - `GET /health` 미구현이면 최소 추가:
    - 응답 예시: `{ "ok": true, "service": "open-world", "time": "<ISO>" }`
- DB 초기화:
  - `docs/seed_v1.sql` 적용 가능 상태 확인
  - `factions`, `sects` 기본 데이터 존재 확인
- 폴더/모듈 구조:
  - `src/server.js`
  - `src/routes/auth-routes.js`
  - `src/routes/character-routes.js`
  - `src/lib/db.js`
  - `src/lib/command-service.js`
  - `src/views/terminal-view.js`

## 변경 원칙
- 이미 동작 중인 로그인/문파선택/터미널 흐름을 깨지 않는다.
- 대규모 리팩터링 금지(다음 단계 구현에 필요한 최소 보완만 허용).
- 누락 사항이 없으면 코드 변경 없이 “검증 완료”로 종료 가능.

## 완료 기준
- `npm install`, `npm run db:init`, `npm run dev` 성공
- `/` 리다이렉트 정상
- `/health` 응답 정상(기존 있으면 확인, 없으면 추가 후 확인)
- 다음 단계 프롬프트(`codex_prompt_02_ws_chat.md`) 실행 가능한 상태
