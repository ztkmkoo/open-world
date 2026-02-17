# 개발 실행 순서/관리 문서 (Runbook) v1
작성일: 2026-02-16 (KST)
최종 업데이트: 2026-02-17 (KST)

이 문서는 **Codex로 순서대로 실행**할 프롬프트와, 각 단계의 “완료 기준/검증 방법”을 관리한다.  
스택 기준: Node.js(Express) + SQLite, 웹 UI(터미널) + WebSocket(채팅)

---

## 0) 파일 목록(이미 생성됨)
- `wuxia_mvp_spec_v1.md` : 전체 MVP 스펙(로그인→문파선택→터미널)
- `codex_prompt_login_to_sect_select.md` : 로그인~문파선택 구현 프롬프트
- `seed_v1.sql` : SQLite schema + seed(factions/sects/조직 레이어)
- `codex_prompt_command_min_v1.md` : `/command` 최소(도움/상태/문파) + seed 적용
- `terminal_manual_checklist.md` : `/terminal` 수동 검증 체크리스트

추가로 이번에 생성되는 프롬프트:
- `codex_prompt_00_bootstrap.md` : 프로젝트 부트스트랩(폴더/설정/개발서버)
- `codex_prompt_02_ws_chat.md` : WebSocket 채팅(전체/문파/귓) 최소 구현
- `codex_prompt_03_tick_training.md` : tick/catchup(클라 주도) + 수련 상태(백그라운드) 최소 구현
- `codex_prompt_04_terminal_client_tick.md` : 터미널 클라이언트에서 자동 tick 호출 + 로그인 직후 catchup 호출

---

## 1) 실행 순서(권장)
현재 상태 요약:
- 완료: Step 1, Step 2, Step 3
- 미완료(다음 스코프): Step 4, Step 5

### Step 0 — 프로젝트 부트스트랩
1. Codex 실행: `codex_prompt_00_bootstrap.md`
2. 확인:
   - `npm install` 성공
   - `npm run dev`로 서버 기동
   - `/health` 200 OK
3. 상태: 보류(현재 코드에는 `/health` 엔드포인트 미구현)

### Step 1 — 로그인/캐릭터 생성/세력·문파 선택
1. Codex 실행: `codex_prompt_login_to_sect_select.md`
2. 확인:
   - `/login` → `/auth/mock` 리다이렉트
   - 로그인 버튼 → `/nickname`
   - 성별/성/이름 검증(한글 1~3글자)
   - `/choose-faction` → `/choose-sect` → sect 선택 → `/terminal`
3. 상태: 완료

### Step 2 — seed SQL 적용 + /command 최소 구현
1. Codex 실행: `codex_prompt_command_min_v1.md`
2. 확인:
   - seed가 DB에 반영(factions/sects)
   - `/terminal`에서 `도움`, `상태`, `문파`가 동작
   - 출력 템플릿: Header/Body/추천 명령 준수
3. 상태: 완료

### Step 3 — WebSocket 채팅(전체/문파/귓) 최소 구현
1. Codex 실행: `codex_prompt_02_ws_chat.md`
2. 확인:
   - `/terminal`에서 채팅 탭 3개 동작
   - 같은 브라우저 2개 창에서 전체 채팅 송수신
   - 문파 채팅은 같은 sect끼리만 보임
   - `@상대`로 귓말(whisper) 송수신
3. 상태: 완료 (2026-02-17 WS 스모크 검증 통과)

### Step 4 — Tick/Catchup + 수련 상태(서버)
1. Codex 실행: `codex_prompt_03_tick_training.md`
2. 확인:
   - 로그인 직후 `catchup` 1회 실행(서버 기록)
   - 이후 10분마다 tick 호출 시 누적(테스트용으로 tick interval을 10초로 바꿔 검증 가능)
   - `상태` 명령에 “현재 수련 대상”과 “last_tick_at” 정보가 표시(개발용)
3. 상태: 미완료

### Step 5 — 터미널 클라이언트 자동 tick + 로그인 직후 catchup 연결
1. Codex 실행: `codex_prompt_04_terminal_client_tick.md`
2. 확인:
   - `/terminal` 진입 시 자동 catchup 1회 호출
   - 이후 자동 tick 타이머 동작
   - tick이 10분 이내로 중복 호출되면 서버가 `last_tick_at=now`로 업데이트(페널티)되며, 클라 재시도는 request_id로 중복 방지(권장)
3. 상태: 미완료

---

## 2) 검증 체크리스트(최종)
- [x] 신규 유저: 로그인→캐릭터 생성→세력→문파→터미널 진입
- [x] sect 정원 144 강제(만석 시 서버 차단)
- [x] `/command` 최소 3개 명령 동작 + 템플릿 준수
- [x] 채팅(전체/문파/귓) 동작
- [ ] tick/catchup 동작 + 부정행위 처리(last_tick_at=now)
- [ ] 자동 tick이 서버 부하 없이 동작(개발 환경에서 interval 축소로 테스트)

---

## 3) 운영/프로덕션을 위한 최소 권장사항(메모)
- SQLite는 MVP에 좋지만 동시성/스케일 한계가 있으므로:
  - 1) WAL 모드, 2) connection pool 제한, 3) eventually Postgres 마이그레이션 고려
- 세션은 JWT 또는 서버 세션 테이블로(현재는 cookie session OK)
- WebSocket은 sticky session 또는 Redis pub/sub 필요(스케일 시)
