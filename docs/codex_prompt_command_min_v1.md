# Codex 프롬프트: /command 최소 구현 + seed SQL 적용 포함

당신은 1인 개발자를 돕는 시니어 풀스택 엔지니어입니다.
Node.js(Express) + SQLite로 빠르게 MVP를 구현하세요. (TypeScript 권장, JS도 OK)

## 목표
1) `seed_v1.sql`을 프로젝트에 포함하고, 서버 시작 시(또는 수동 명령으로) SQLite에 적용할 수 있게 해주세요.
2) 웹 터미널 UI(`/terminal`)에서 명령어 입력 → HTTP `/command`로 전송 → 서버가 결과를 반환 → 콘솔 로그에 출력.
3) `/command`는 아래 3개 명령만 우선 지원:
   - 도움
   - 상태
   - 문파
4) 출력은 반드시 표준 템플릿 v1을 따르세요:
   - Header: `【카테고리】 제목`
   - Body: N줄
   - Actions: `추천: cmd1 | cmd2 | ...` (3~6개)

## 전제(로그인/문파선택)
- 이미 로그인+캐릭터 생성+세력/문파 선택 흐름이 구현되어 있다고 가정합니다.
- `/terminal` 접근 시 세션에 `user_id`가 있고, users.sect_id가 존재해야 합니다.

## DB 최소 스키마(권장)
- factions(faction_id, name)
- sects(sect_id, faction_id, name, capacity_total, roster_count, prestige)
- users(user_id, nickname, gender, surname, given_name, sect_id)
- sessions(session_id, user_id, auth_state, expires_at)

추가 테이블(있으면 사용):
- sect_role_titles, sect_departments, sect_halls, sect_squads (seed_v1.sql에 포함)

## 명령어 매핑 (한국어 우선, 영어도 허용)
- 도움 / help
- 상태 / status
- 문파 / sect

## 명령 응답 예시(형태만 지키면 내용은 프로젝트 데이터로 채우기)
### 상태
- 직위/경지 등은 아직 없으니 MVP에선:
  - 캐릭터 이름(성+이름), 성별
  - 소속 문파명/세력명
  - 현재 시간(KST)
- 추천: `문파 | 도움`

### 문파
- 문파명, 세력명, 위상(prestige), 정원(roster_count/capacity_total)
- (선택) 조직명 일부 표시: 장로 기관명 3개 정도 (sect_departments 있으면)
- 추천: `상태 | 도움`

### 도움
- 지원 명령 목록 + 예시
- 추천: `상태 | 문파`

## /command API
- POST /command
  - request: { "input": "상태" }  (raw string)
  - response: { "ok": true, "header": "...", "lines": [...], "actions": ["문파","도움"] }

## Terminal UI (최소)
- 왼쪽: 로그 영역 + 입력창
- Enter로 POST /command
- 응답을 로그에 append
- 오른쪽(또는 아래): 채팅 탭 3개 UI만 (기능 stub 가능)

## 구현 힌트
- command parser:
  - trim, split
  - 첫 토큰 기준으로 라우팅
  - alias map 사용: {"상태":"status","문파":"sect","도움":"help", ...}
- response builder:
  - header/lines/actions 구조로 만들고
  - client에서는 이 구조를 그대로 렌더링

## 완료 기준
- seed 적용 후 factions/sects가 존재
- 문파 선택이 끝난 유저로 /terminal 접속
- `상태`, `문파`, `도움` 명령이 동작하고 표준 출력 형식을 지킨다
