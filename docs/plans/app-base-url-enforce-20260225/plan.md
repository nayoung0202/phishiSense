# APP_BASE_URL 강제 적용 계획

## 목표
- APP_BASE_URL 누락 시에도 PORT/HOST fallback을 제거하고 일관된 오류 처리로 정리한다.
- 관련 환경변수 정리를 반영해 .env 파일들을 일관화한다.

## 작업 항목
1. `src/server/auth/redirect.ts`의 PORT 기반 fallback 제거 및 오류 처리 정리.
2. `src/server/auth/redirect.test.ts`에서 fallback 관련 테스트 수정/삭제.
3. `.env`, `.env.prod`, `.env.example`에서 PORT/HOST 관련 항목 정리.

## 완료 기준
- APP_BASE_URL이 없으면 환경에 관계없이 오류가 발생한다.
- PORT/HOST 관련 주석과 변수 정의가 제거되었다.
- 테스트가 변경 사항에 맞게 정리되었다.
