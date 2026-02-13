---
name: worklog-continuity-skill
description: 코드/설계/버그수정 등 어떤 작업이든 중단 가능성이 있으면, 변경 전후에 레포 내 작업로그를 강제 기록해서 재개성을 높이는 스킬. 단순 질의응답/짧은 질문에는 사용하지 말 것.
---

# Worklog Continuity Skill

중단 가능성을 전제로, 작업 재개성을 최우선으로 유지한다.
This skill must comply with `engineering-standards-skill`.

## Absolute Rules

1. 모든 실제 작업(코드 변경/명령 실행/파일 편집/테스트/커밋) 시작 전에 반드시 레포의 `WORKLOG.md`를 생성 또는 갱신한다.
2. 작업 도중 중요한 단계(계획 확정, 변경 완료, 테스트 결과, 커밋 완료)마다 `WORKLOG.md`를 즉시 갱신한다.
3. 중단되더라도 이어갈 수 있도록 `Next Steps`를 항상 최신 상태로 유지한다.
4. 로그는 짧고 구조화된 형식으로 유지한다(장문 금지).
5. 기본 로그 파일은 레포 루트 `WORKLOG.md`를 사용한다.
   - 이미 존재하면 이어서 갱신
   - 없으면 생성
6. 각 로그 항목에는 아래 섹션을 모두 포함한다.
   - Date/Time
   - Goal (이번 작업 목표 1~2줄)
   - Scope (수정 허용 범위/파일)
   - Plan (체크리스트, 리뷰 가능한 작은 단계)
   - Done (완료 체크)
   - Commands Run (실행한 커맨드 + 결과 요약)
   - Notes/Decisions (중요 결정 3개 이하)
   - Next Steps (다음에 바로 이어할 단계 3~7개)
   - Open Questions (막히는 점/사용자 질문 최대 3개)
7. 사용자가 재개/이어하기를 요청하면, 먼저 `WORKLOG.md`를 읽어 현재 상태를 요약하고 `Next Steps`부터 진행한다.

## Operating Procedure

1. 작업 시작 직후 `WORKLOG.md`에 새 엔트리 추가 또는 기존 엔트리 갱신.
2. Plan은 작은 단계 체크리스트로 작성.
3. 명령 실행/파일 변경/검증/커밋 직후 Done과 Commands Run 업데이트.
4. 매 응답 전 Next Steps와 Open Questions 정리.
5. 종료 직전 최신 상태 스냅샷 반영.

## Worklog Template

```md
## Date/Time
- 2026-02-13 21:00 (local)

## Goal
- ...

## Scope
- Allowed paths: ...

## Plan
- [ ] Step 1 ...
- [ ] Step 2 ...

## Done
- [x] ...

## Commands Run
- `cmd`: result

## Notes/Decisions
- ...

## Next Steps
- 1) ...
- 2) ...
- 3) ...

## Open Questions
- 1) ...
```

## Resume Guidance

- Codex CLI 재개 힌트: `codex --resume`, `codex --continue` 또는 history 기반 재개를 사용할 수 있다.
- 세션 기능과 무관하게 `WORKLOG.md`를 단일 source of truth로 사용한다.

## Example Prompts

- "이 버그 수정 시작 전에 WORKLOG.md 먼저 갱신하고 진행해."
- "작업 중단 가능하니 각 단계마다 Commands Run과 Next Steps를 갱신해."
- "이전 세션 이어서 해. 먼저 WORKLOG.md 읽고 Next Steps부터 진행해."
