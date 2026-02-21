# EVRIZ OIDC 무세션 즉시 리다이렉트 구현 계획

## 목표
- 보호 페이지 무세션 진입 시 OIDC 인가 엔드포인트로 즉시 이동
- 내부 API 무세션 요청 시 302 대신 401 반환
- `/p/*`, `/t/*` 공개 라우트 유지

## 구현 범위
1. DB 스키마에 `auth_sessions` 추가
2. OIDC/세션 서버 모듈 추가
3. 인증 라우트 추가
   - `GET /api/auth/oidc/login`
   - `GET /oidc/callback`
   - `GET /api/auth/session`
   - `POST /api/auth/logout`
4. `src/middleware.ts` 추가
5. `.env.example` OIDC/Auth 변수 추가
6. 로그아웃 버튼 실제 API 연동
7. 연동/체크리스트 문서 작성

## 검증 계획
- `npm run check`
- `npm run test`(신규 인증 테스트 포함)

## 주의사항
- 운영 쿠키는 `HttpOnly`, `SameSite=Lax`, `Secure`(production)
- API는 리다이렉트 금지, 401 고정
- 공개 라우트(`/p/*`, `/t/*`)는 인증 예외 유지
