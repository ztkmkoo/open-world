# Codex 프롬프트 02: WebSocket 채팅(전체/문파/귓) 최소 구현

당신은 1인 개발자를 돕는 시니어 풀스택 엔지니어입니다.
현재 Express + SQLite 프로젝트에 **WebSocket 채팅**을 최소 기능으로 추가하세요.

## 목표
- /terminal 페이지에 채팅 UI 탭 3개: 전체 / 문파 / 귓
- 서버: WebSocket 엔드포인트 제공
- 채널:
  - global: 전체 채팅
  - sect: 같은 문파(sect_id)끼리만
  - whisper: 1:1 (to 닉네임)

## 전제
- 세션 쿠키로 user_id를 식별 가능해야 함.
- users 테이블에 nickname, sect_id 존재.

## WS 메시지 포맷(JSON)
클라->서버:
{
  "type": "chat",
  "channel": "global|sect|whisper",
  "to": "상대닉네임(whisper일 때만)",
  "text": "내용"
}

서버->클라:
{
  "type": "chat",
  "channel": "...",
  "from": "보낸사람닉네임(or system)",
  "to": "상대닉(whisper일 때만)",
  "text": "내용",
  "ts": "ISO8601"
}

## 라우팅 규칙
- global: 모든 연결에 브로드캐스트
- sect: sender.sect_id와 같은 연결에만 브로드캐스트
- whisper: 수신자 nickname이 현재 연결중이면 그 소켓에만 전달 + 송신자에게 echo

## UI 요구사항(최소)
- 탭 버튼 3개
- 메시지 리스트 영역
- 입력창 + 전송 버튼
- 단축 입력:
  - '/문파 내용' -> channel=sect
  - '@닉 내용' -> channel=whisper + to=닉
  - 기본: 현재 탭 기준(전체 탭이면 global)

## 보안/검증(최소)
- 비로그인(세션 없음)은 WS 연결 거부
- text 길이 제한(예: 1~200자)
- whisper 대상이 없으면 시스템 메시지로 오류

## 완료 기준
- 같은 문파 유저끼리 문파 채팅이 보임
- 다른 문파 유저에게는 문파 채팅이 보이지 않음
- 귓말은 지정 대상에게만 보임
- 전체 탭에는 모든 채널이 합쳐져 보임(클라이언트에서 합치기)
