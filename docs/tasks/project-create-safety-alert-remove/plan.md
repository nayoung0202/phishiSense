# 프로젝트 생성 안전·알림 블록 및 notificationEmails 제거 계획

## 목표
- 프로젝트 생성 화면의 `안전 · 알림` 블록 제거
- `notificationEmails` 필드를 DB/스키마/서버/테스트 코드에서 완전 제거
- 테스트 메일 기능은 기존대로 유지

## 작업 범위
1. 클라이언트
- `src/features/ProjectCreate.tsx`에서 폼 스키마/기본값/요청 타입/payload의 `notificationEmails` 제거
- `안전 · 알림` 카드 UI 제거

2. API
- `src/app/api/projects/route.ts` POST 정규화에서 `notificationEmails` 제거
- `src/app/api/projects/[id]/route.ts` PATCH 정규화에서 `notificationEmails` 제거

3. 스키마/스토리지
- `shared/schema.ts`의 `projects.notificationEmails` 컬럼 제거
- `src/server/storage.ts`의 create/update/serialize 경로에서 `notificationEmails` 매핑 제거

4. 테스트/목 데이터
- `notificationEmails` fixture 필드 제거

5. 검증
- 타입체크/테스트 실행으로 회귀 확인

## 완료 기준
- 코드베이스에서 `notificationEmails`/`notification_emails` 참조가 제거됨
- 프로젝트 생성 화면에서 안전·알림 블록이 사라짐
- 테스트 메일 버튼 동작 경로 코드에 영향 없음
