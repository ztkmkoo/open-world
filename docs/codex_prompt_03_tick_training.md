# Codex 프롬프트 03: Tick/Catchup(클라 주도) + 수련 상태(서버) 최소 구현

당신은 1인 개발자를 돕는 시니어 서버 엔지니어입니다.
현재 Express + SQLite 프로젝트에 **tick/catchup + 수련 상태**를 최소로 추가하세요.

## 핵심 규칙(확정)
- tick은 서버 스케줄러가 아니라 **클라이언트가 호출**한다.
- 서버는 유저별 `last_tick_at`을 저장한다.
- POST /tick:
  - now-last_tick_at < 10분 이면 부정행위로 간주
    - last_tick_at = now 로 업데이트(즉 10분 더 기다리게 됨)
    - 성장 처리는 하지 않음
  - >= 10분이면 1틱 처리 후 last_tick_at += 10분 (권장)
- POST /tick/catchup:
  - 로그인 직후 자동 1회 호출
  - elapsed = min(now-last_tick_at, 24h)
  - tick_count = floor(elapsed / 10m)
  - tick_count만큼 일괄 처리
  - last_tick_at += tick_count*10m

## 데이터(최소 추가 컬럼)
users 테이블에:
- last_tick_at (timestamp)
- training_mode (TEXT) : NONE | INNER_ART | SKILL | MERIDIAN_ART
- training_target_id (TEXT nullable)

(선택) training_progress 테이블:
- user_id PK
- inner_art_star INT (0..10)
- skill_star_json TEXT (json)
- meridian_json TEXT (json)

MVP는 별(★)만 저장해도 됨.

## 수련 규칙(MVP)
- 한 번에 수련 대상 1개만 설정 가능.
- tick 처리 시 training_mode에 따라 해당 트랙 진행도를 증가.
- ★1~★4 누적형, ★5부터 확률 포함.
- MVP에서는 다음처럼 단순화 가능:
  - 포인트 누적 후 임계값 도달 시 ★+1
  - ★5 이상은 임계값 도달 시 p%로 ★+1 성공

## 엔드포인트
- POST /api/training/set  { mode, target_id }
- POST /tick
- POST /tick/catchup
- GET  /api/me (디버그용): last_tick_at, training_mode, training_target_id, stars

## 요청 중복/네트워크 안전(권장)
- /tick 요청에 client_request_id(UUID) 포함
- 서버가 최근 request_id 캐시하여 중복 재시도는 last_tick_at을 건드리지 않게

## 완료 기준
- training 설정 후 tick/catchup 호출 시 별 단계가 증가하는 것을 확인
- 10분 이내 tick 요청 시 성장 없이 last_tick_at만 now로 갱신되는 것을 확인
- catchup은 최대 24시간까지만 적용되는 것을 확인
