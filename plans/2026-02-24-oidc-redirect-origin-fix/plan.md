# 작업 계획

## 목표
- OIDC 콜백/미들웨어 리다이렉트에서 `request.url` 의존을 제거한다.
- `APP_BASE_URL` 기반으로 origin을 고정하고, returnTo 정규화/결합을 단일 유틸로 통합한다.
- 운영 환경에서 `APP_BASE_URL` 누락 시 즉시 오류를 발생시켜 문제를 조기에 감지한다.

## 작업 항목
1. `src/server/auth/redirect.ts` 유틸을 생성하고 `getAppOrigin`, `normalizeReturnTo`, `buildReturnUrl`를 구현한다.
2. `normalizeReturnTo` 구현을 `transaction.ts`에서 제거하고 `redirect.ts`에서만 유지한다.
3. `middleware.ts`, `oidc callback` 라우트의 리다이렉트 생성 로직을 `APP_BASE_URL` 기반 유틸로 교체한다.
4. `.env.example`, `docs/auth/evriz-oidc-integration.md`에 `APP_BASE_URL` 운영 필수 및 리다이렉트 정책을 반영한다.
5. `redirect.test.ts`를 추가하고 기존 테스트 기대값을 수정한다.
6. `npm run test`로 회귀를 확인한다.
