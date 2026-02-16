# Codex 프롬프트 04: 터미널 클라이언트 자동 tick + 로그인 직후 catchup 연결

당신은 1인 개발자를 돕는 시니어 프론트엔드 엔지니어입니다.
현재 /terminal 페이지에 **자동 tick 호출**과 **로그인 직후 catchup 1회**를 붙이세요.

## 목표
- /terminal 진입 시:
  1) POST /tick/catchup 1회 호출
  2) 이후 setInterval로 10분마다 POST /tick 자동 호출
- tick 결과는 콘솔 로그에 “시스템 메시지”로 간단히 표시(선택)
- /command 입력과는 독립적으로 동작

## 구현 디테일
- fetch에 credentials 포함(cookie session)
- 네트워크 실패 시:
  - 즉시 재시도하지 말고 다음 인터벌까지 대기(중복 tick 페널티 방지)
- request_id 사용:
  - /tick 요청마다 UUID 생성해 body에 포함
  - 서버가 중복이면 안전하게 처리

## 완료 기준
- /terminal 로딩 직후 catchup이 1회 호출됨(네트워크 탭으로 확인)
- 이후 10분 간격 tick 호출이 발생
- 실패 시 무한 재시도/스팸이 발생하지 않음
