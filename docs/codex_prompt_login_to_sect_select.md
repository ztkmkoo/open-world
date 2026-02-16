# Codex용 개발 프롬프트 (로그인 → 문파 선택 → 터미널 MVP)

당신은 웹 개발자입니다. 아래 요구사항대로 **MVP**를 구현하세요.
스택은 빠른 구현을 위해 **Node.js(Express) + SQLite**를 권장합니다(다른 스택도 가능).
중요: 구조는 나중에 Google OAuth로 바꿀 수 있도록 “OAuth 리다이렉트 흐름”을 유지하세요.

## 목표
1) /login → /auth/mock 리다이렉트
2) /auth/mock: 빈 로그인 페이지(버튼 1개)
3) 버튼 클릭 시 로그인 성공 처리 → /nickname
4) /nickname: 캐릭터 생성(성별 + 성(allowlist) + 한글 이름)
5) 성공 시 /choose-faction
6) /choose-faction: 정파/사파/마교 선택
7) /choose-sect?faction_id=...: 문파 리스트(n/144 표시, 만석 비활성화)
8) 문파 선택 POST 성공 시 /terminal
9) /terminal: 웹 터미널 기본 레이아웃(명령 콘솔 + 채팅 탭 3개). 채팅 서버는 stub 가능.

## 데이터(최소 테이블)
- factions(faction_id, name)
- sects(sect_id, faction_id, name, capacity_total=144, roster_count, prestige)
- users(user_id, surname, given_name, nickname_unique, gender, sect_id nullable)
- sessions(session_id, auth_state, user_id nullable, expires_at)

## 캐릭터 생성 규칙
- 성별: M/F
- 성(allowlist): ["남궁","제갈","사공","황보","동방","독고","모용","서문","공손","상관","강","김","유","윤","장","백","하","서","진","마","연","채"]
- 이름: 정규식 ^[가-힣]{1,3}$ (한글만, 1~3글자)
- 표시명 nickname = 성+이름 (unique)

## 문파 정원 규칙(서버 강제)
- sects.roster_count < 144 일 때만 가입 가능
- 가입 처리 시 원자적으로 증가:
  UPDATE sects SET roster_count = roster_count + 1 WHERE sect_id=? AND roster_count < 144
- 실패하면 "만석" 메시지(간단 alert)만 띄우면 됨

## 라우팅/엔드포인트
- GET /login -> 302 /auth/mock
- GET /auth/mock -> HTML: 로그인 버튼
- POST /auth/mock/callback -> 세션 생성(auth_state=AUTHENTICATED) 후 302 /nickname
- GET /nickname -> HTML 폼(성별/성 select/이름 input)
- POST /nickname -> 유효성 검사/유저 생성 또는 세션에 user_id 연결(auth_state=REGISTERED), 302 /choose-faction
- GET /choose-faction -> HTML: 세력 3개 버튼
- GET /choose-sect?faction_id=... -> HTML: sect 목록 (n/144), 만석은 disabled
- POST /api/sect/select -> 선택 처리(정원 체크 포함). 성공 시 302 /terminal
- GET /terminal -> HTML: 좌우(또는 상하) 분할. 왼쪽 명령 콘솔(입력+로그), 오른쪽 채팅 탭(전체/문파/귓) UI만.

## Seed 데이터
- factions: 정파/사파/마교
- sects: 청운문(정파), 흑린회(사파), 명교(마교) 각각 capacity_total=144, roster_count=0, prestige=1000

## 구현 디테일
- 세션은 쿠키(session_id)로 관리(간단)
- /terminal 접근 시: REGISTERED + sect_id가 있어야 접근 가능 (없으면 적절한 페이지로 redirect)
- UI는 최소 HTML/CSS로 충분. 프레임워크 불필요.

## 완료 기준
- 브라우저에서 /login 접속 → 흐름대로 문파 선택 후 /terminal 진입 성공
- 만석 문파는 선택 불가 (UI disable + 서버 최종 검증)
- 닉네임 규칙/중복 체크 동작
