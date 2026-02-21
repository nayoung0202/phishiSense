# EVRIZ OIDC 구현 체크리스트

- [ ] `shared/schema.ts`에 `auth_sessions` 테이블 추가
- [ ] `src/server/db/schema.ts` export에 `authSessions` 반영
- [ ] OIDC 설정/암호화/토큰 검증 모듈 추가
- [ ] `GET /api/auth/oidc/login` 구현
- [ ] `GET /oidc/callback` 구현
- [ ] `GET /api/auth/session` 구현
- [ ] `POST /api/auth/logout` 구현
- [ ] `middleware.ts`에서 페이지 302 + API 401 정책 구현
- [ ] 로그아웃 UI(`DashboardHeader`)를 `/api/auth/logout`과 연동
- [ ] `.env.example`에 OIDC/Auth 환경변수 추가
- [ ] `docs/auth/evriz-oidc-integration.md` 최신 상태 반영
