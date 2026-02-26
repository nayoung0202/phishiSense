# EVRIZ OIDC 연동 가이드

## 1. 고정값

- Issuer: `https://auth.evriz.co.kr`
- Client ID: `phishsense-app`
- Redirect URI: `https://app.phishsense.cloud/oidc/callback`
- Scope: `openid profile email offline_access`
- 로그인 UX: 보호 페이지 무세션 진입 시 즉시 인증 리다이렉트

## 2. 보호/예외 경로

- 보호 페이지: `/`, `/projects/**`, `/targets/**`, `/templates/**`, `/training-pages/**`, `/admin/**`
- 보호 API: `/api/**` (단, `/api/auth/**` 제외)
- 공개 예외: `/p/**`, `/t/**`, `/oidc/callback`

## 3. 인증 흐름

1. 보호 페이지 접근 시 `middleware.ts`가 세션 쿠키 확인
2. 무세션/무효세션이면 `/api/auth/oidc/login?returnTo=...`로 302
3. 로그인 라우트에서 `state`, `nonce`, `code_verifier` 생성 후 트랜잭션 쿠키 저장
4. Discovery의 `authorization_endpoint`로 `code_challenge(S256)` 포함하여 이동
5. Auth 서버 로그인 완료 후 `/oidc/callback` 호출
6. callback에서 `state`/트랜잭션 검증 후 token 교환
7. `id_token` 서명/JWKS/claim 검증 + userinfo 조회
8. `auth_sessions` 저장 후 `HttpOnly` 세션 쿠키 발급
9. 원래 경로(`returnTo`)로 복귀

## 4. API 정책

- API는 무세션 시 리다이렉트하지 않고 `401 Unauthorized` JSON 반환
- 페이지 요청만 인증 시작 URL로 리다이렉트

## 5. 세션 저장소

`auth_sessions` 컬럼:

- `session_id` (PK)
- `sub`, `email`, `name`
- `access_token_exp`
- `refresh_token_enc`
- `idle_expires_at`, `absolute_expires_at`
- `revoked_at`, `created_at`, `updated_at`

## 6. 로그아웃

- `POST /api/auth/logout`
- 앱 세션 revoke + 세션/트랜잭션 쿠키 삭제
- IdP logout 호출은 수행하지 않음

## 7. 로컬 인증 우회 토글(개발 편의)

- `AUTH_DEV_BYPASS=true`이면 OIDC 인증을 우회하고 개발용 사용자로 인증된 상태를 반환
- `AUTH_DEV_BYPASS`가 비어있거나 `false`이면 기존 인증 정책(리다이렉트/401) 유지
- 개발용 우회 값은 `.env`에만 보관하고, `.env`는 `.gitignore`로 커밋 제외

## 8. 운영 체크 포인트

- 운영 환경에서 `AUTH_SESSION_SECRET`, `AUTH_TOKEN_ENC_KEY`, `OIDC_CLIENT_SECRET` 필수
- 운영은 HTTPS + Secure 쿠키 전제
- Redirect URI는 Auth 서버 등록값과 완전 일치해야 함
- 운영 환경에서는 `APP_BASE_URL`을 반드시 지정해야 하며, 리다이렉트는 해당 origin만 사용한다.
