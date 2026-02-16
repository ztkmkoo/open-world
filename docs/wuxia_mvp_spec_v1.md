# 무협 멀티(웹 터미널) MVP 스펙 문서 v1.0
작성일: 2026-02-16 (KST)  
목표: **Codex로 바로 개발 가능한 수준**의 요구사항/흐름/데이터 계약을 정의한다.  
형태: 웹(HTTP + WebSocket) 기반 **텍스트 터미널 UI**.  

---

## 0. 핵심 방향(요약)
- **텍스트 기반 멀티 무림 정치/성장 게임**(MMO-lite)
- 클라이언트는 웹. **명령 콘솔(Commands)** + **채팅 패널(Chat)** 분리
- 서버 통신
  - **HTTP**: 로그인/명령 실행/조회/틱 처리/문파 선택
  - **WebSocket**: 채팅(전체/문파/귓), 시스템 공지(선택)
- **강함 수치 비공개**. 타인 정보는 등급/직위/성적 중심. (경지는 “하위만 가늠 가능” 설계는 후속 범위)

---

## 1. MVP 범위(이번 구현 목표)
### 1.1 이번 작업 범위 (로그인 → 문파 선택 → 터미널 진입)
1) `/login` 접근 시 **OAuth처럼 리다이렉트**  
2) `mock 로그인 페이지`에서 버튼 클릭 → 로그인 성공 처리  
3) 캐릭터 생성: **성별 + 성(리스트) + 한글 이름(정규식)**  
4) 세력 선택 페이지(정파/사파/마교)  
5) 문파 선택 페이지(해당 세력 내 문파 리스트 + n/144 표시, 만석은 선택 불가)  
6) 선택 완료 후 `/terminal` 진입

> 문파 생성/확장은 MVP에서는 **DB에 수동으로 seed**한다.

### 1.2 MVP에서 “나중에 할 것(비범위)”
- Google OAuth 실제 연동
- 이벤트(비무/용봉/문주전) 실행 스케줄러
- 전투 엔진/정치/원로원/정책 시스템 본 구현
- 파벌, 소문, 세력전

---

## 2. 용어
- **세력(Faction)**: 정파/사파/마교
- **문파(Sect)**: 세력 하위 조직, 정원 **144명 고정**
- **캐릭터**: 유저의 플레이 단위(성별, 성+이름, 소속 문파 등)
- **세션(Session)**: 로그인 상태 유지(토큰 또는 쿠키)

---

## 3. 사용자 플로우(상세)

### 3.1 로그인(가짜 OAuth 구조)
1. 유저: `GET /login`
2. 서버: `302 Redirect /auth/mock`
3. 유저: `GET /auth/mock` (빈 페이지 + “로그인” 버튼)
4. 유저: 버튼 클릭 → `POST /auth/mock/callback`
5. 서버: “인증 완료(registered 전)” 세션 생성 → `302 Redirect /nickname`

### 3.2 캐릭터 생성(성별/성/이름)
- 유저: `GET /nickname`
- 유저: 입력 후 `POST /nickname`
- 서버 검증:
  - 성별: `M`/`F` (또는 남/여)
  - 성: allowlist에 포함
  - 이름: 한글만, 정규식 `^[가-힣]{1,3}$`
- 성공 → `302 Redirect /choose-faction`

### 3.3 세력 선택
- 유저: `GET /choose-faction`
- 화면: 정파/사파/마교 카드
- 유저: 세력 선택 → `GET /choose-sect?faction=<id>`

### 3.4 문파 선택(정원 144 강제)
- 유저: `GET /choose-sect?faction=<id>`
- 서버: 해당 세력 문파 목록 제공 (`n/144`, 만석 여부)
- 유저: 문파 선택 → `POST /api/sect/select {sect_id}`
- 서버: 최종 검증(정원/중복 배정) 후 배정
- 성공 → `302 Redirect /terminal`

---

## 4. 캐릭터 이름 규칙

### 4.1 성(Allowlist)
MVP 추천(예시, 수정 가능):
- 단성: 강, 김, 유, 윤, 장, 백, 하, 서, 진, 마, 연, 채
- 복성: 남궁, 제갈, 사공, 황보, 동방, 독고, 모용, 서문, 공손, 상관

> 성 리스트는 서버 상수 또는 DB 테이블로 관리. (MVP는 서버 상수 권장)

### 4.2 이름(한글 Only)
- 정규식: `^[가-힣]{1,3}$`
- 공백/특수문자/영문/숫자 금지

### 4.3 전체 표시명
- `display_name = <성><이름>` (예: “남궁청풍”)

---

## 5. 문파 정원(144) 규칙

### 5.1 규칙
- 문파는 `roster_count`가 **144를 넘을 수 없음**
- 선택 화면에서 `roster_count == 144`인 문파는 **비활성화**
- 서버는 최종적으로 반드시 검증해야 함

### 5.2 MVP 구현 권장(동시성 안전)
문파 배정 시 서버에서 **원자적 업데이트**를 사용:
- `UPDATE sects SET roster_count = roster_count + 1 WHERE sect_id=? AND roster_count < 144;`
- affected row가 1이면 성공, 0이면 만석

> “예외처리 최소화”를 원해도, 이 검증은 핵심 규칙이므로 유지 권장.

---

## 6. UI 페이지/라우팅(이번 구현 범위)

### 6.1 Pages
- `GET /login` → `/auth/mock`로 리다이렉트
- `GET /auth/mock` : 빈 로그인 페이지(버튼 1개)
- `POST /auth/mock/callback` : 로그인 성공 세션 생성 후 `/nickname` 이동
- `GET /nickname` : 캐릭터 생성 폼
- `POST /nickname` : 캐릭터 생성 처리 후 `/choose-faction` 이동
- `GET /choose-faction` : 세력 선택
- `GET /choose-sect?faction=...` : 문파 선택
- `GET /terminal` : 웹 터미널(명령 콘솔 + 채팅 패널)

### 6.2 Terminal UI(최소)
- 좌/우 또는 상/하 분할
  - (1) 명령 콘솔: 입력 1줄 + 출력 로그
  - (2) 채팅 패널: 탭 3개(전체/문파/귓) + 입력창
- MVP에서 명령은 최소로 “상태/문파” 정도만 stub 가능

---

## 7. API 계약(이번 구현 포함)

### 7.1 세력/문파 조회
- `GET /api/factions`
  - 반환: `[ { id, name } ]`
- `GET /api/sects?faction_id=FACTION_JUNGPHA`
  - 반환: `[ { id, name, faction_id, roster_count, capacity_total, prestige } ]`
  - UI는 `roster_count/capacity_total` 표시

### 7.2 문파 선택(배정)
- `POST /api/sect/select`
  - 요청: `{ "sect_id": "SECT_CHEONGUN" }`
  - 성공: `{ ok: true, sect: { id, name, faction_id } }`
  - 실패(권장 코드):
    - `{ ok: false, code: "SECT_FULL" }`
    - `{ ok: false, code: "ALREADY_ASSIGNED" }`

> MVP에서 “예외처리 최소화”를 원하면 실패코드 최소만 두고, 프론트는 단순 alert 처리.

---

## 8. WebSocket(채팅) 스펙 v1

### 8.1 채널
- 전체(통합 피드): 전체/문파/귓/시스템 모두 표시
- 문파: 문파 채팅만
- 귓: 1:1 귓말

### 8.2 전송 포맷(권장 JSON)
```json
{
  "type": "chat",
  "channel": "global|sect|whisper|system",
  "to": "상대닉네임(whisper일 때만)",
  "text": "내용",
  "ts": "ISO8601"
}
```

### 8.3 입력 규칙(클라이언트)
- 현재 탭 기준 전송
- 단축:
  - `/문파 내용` → 문파 채팅
  - `@닉 내용` → 귓말

---

## 9. 데이터 모델(최소)

### 9.1 tables (권장)
#### `users`
- `user_id` (uuid or int)
- `nickname` (unique) — **캐릭터 이름(성+이름)**
- `gender` ("M"|"F")
- `surname` (string)
- `given_name` (string)
- `sect_id` (nullable until assigned)
- `created_at`
- `updated_at`

#### `sessions`
- `session_id` (uuid)
- `user_id` (nullable until nickname step complete)
- `auth_state` ("AUTHENTICATED" | "REGISTERED")  
  - AUTHENTICATED: mock 로그인만 완료
  - REGISTERED: 캐릭터 생성 완료
- `created_at`
- `expires_at`

#### `sects`
- `sect_id`
- `faction_id`
- `name`
- `capacity_total` (144)
- `roster_count` (0~144)
- `prestige` (int)

#### `factions`
- `faction_id` (FACTION_JUNGPHA/...)
- `name`

> MVP에서는 `users.sect_id`만으로도 충분. (후속에서 직위/좌석/조직 추가)

---

## 10. 문파 조직 “레이어” 규칙(향후 확장 기준)
이 레이어 구조는 **모든 문파가 반드시 동일하게 유지**한다 (이름만 다름):

- L9: 1명 (문파장/교주/회주)
- L8: 1명 (부)
- L7: 1명 (대장로/대호법/대감찰)
- L6: 3명 (장로/호법/감찰) — 각각 기관 담당
- L5: 6명 (당주/각주) — 각 장로가 2개 소속
- L4: 12명 (대주) — 각 당이 2개 대
- L3~L1: 120명 (대원) — 내부 티어

> 본 문서의 seed YAML은 이 “레이어 키”를 보존하도록 설계되어 있음.

---

## 11. Seed 데이터(문파/조직명)
- `seed_v1.yaml`(별도 파일)에 청운문/명교/흑린회 조직 구성을 포함.
- MVP의 “문파 선택 페이지”는 sect 단위만 필요하므로,
  - 최소한 `factions`, `sects`만 먼저 seed해도 됨.

---

## 12. 구현 체크리스트(수락 기준)
- [ ] `/login` 접근 시 `/auth/mock`로 리다이렉트
- [ ] `/auth/mock`에서 버튼 클릭 → `/nickname` 이동
- [ ] 캐릭터 생성(성별/성/이름 검증) 성공 시 `/choose-faction`
- [ ] 세력 선택 페이지에서 세력 선택 → 해당 세력 문파 리스트 페이지
- [ ] 문파 선택 페이지에서 만석 문파 비활성화 표시
- [ ] 문파 선택 POST 시 서버가 capacity를 강제(144 초과 불가)
- [ ] 선택 완료 후 `/terminal` 진입
- [ ] 터미널 화면에 명령 콘솔+채팅 패널 3탭 존재(채팅은 stub 가능)

---

## 13. (권장) 향후 Google OAuth 교체 포인트
- `/login`의 리다이렉트 대상만 `/auth/google`로 교체
- `/auth/google/callback`에서 `sessions.auth_state=AUTHENTICATED` 생성
- 이후 `/nickname` 흐름 동일
