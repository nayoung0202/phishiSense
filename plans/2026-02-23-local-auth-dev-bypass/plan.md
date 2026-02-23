# 작업 계획

## 목표
- 로컬 인증 우회 활성 조건을 `AUTH_DEV_BYPASS===\"true\"` 단독 제어로 구현한다.
- `NODE_ENV` 기반 우회 분기를 제거한다.
- 미들웨어/세션 API 테스트를 보강해 `undefined`/`false` 차단 동작을 검증한다.
- `.env.example`에 우회 변수 섹션과 `.env` 격리 안내를 추가한다.

## 작업 항목
1. `src/server/auth/config.ts`에 개발용 인증 우회 설정 리졸버 추가
2. `src/middleware.ts`에 우회 활성 시 인증 게이트 즉시 통과 분기 추가
3. `src/server/auth/requireAuth.ts`에 우회 활성 시 가짜 사용자 인증 컨텍스트 반환
4. `src/middleware.test.ts`에 `AUTH_DEV_BYPASS=true/false/undefined` 시나리오 추가
5. `src/app/api/auth/session/route.test.ts` 신규 작성
6. `.env.example` 및 `docs/auth/evriz-oidc-integration.md` 문서 반영
7. `npm run check` 및 대상 테스트 실행
