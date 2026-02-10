# 프로젝트 메일 발송 워커 구현 계획

## 목표
- 프로젝트 실행 시 send_jobs 기반 비동기 발송 파이프라인 구축
- trackingToken/발송 상태/잡 상태를 DB에 기록

## 작업 범위
- DB 스키마 추가 및 공유 타입 갱신
- API 라우트(발송 enqueue, job 상태 조회)
- 워커(큐 처리, 발송 로직, 재시도/락)
- 템플릿 치환 유틸
- 스크립트/환경 변수/테스트

## 진행 순서
1. 스키마: send_jobs, project_targets 컬럼 추가
2. DAO/스토리지: send job 및 발송 상태 처리
3. 링크 치환 유틸 및 템플릿 placeholder 반영
4. API: /projects/[id]/send, /send-jobs/[id]
5. 워커: 큐 처리 + SMTP 발송 + 재시도/락
6. .env.example/스크립트/테스트 정리
