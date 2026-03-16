# 인증 정책

## 기본 설정

- Issuer: `https://auth.evriz.co.kr`
- Client ID: `phishsense-app`
- Redirect URI 기본값: `https://app.phishsense.cloud/oidc/callback`
- Scope 기본값: `openid profile email offline_access`

실제 운영값은 환경 변수로 주입하며, 프로덕션에서는 비밀값 누락을 허용하지 않습니다.

## 인증 흐름

1. 보호된 페이지 접근 시 `middleware.ts`가 세션 쿠키를 검사합니다.
2. 세션이 없으면 페이지는 `/login`으로 이동하고 API는 `401`을 반환합니다.
3. 로그인 시작은 `GET /api/auth/oidc/login`에서 수행합니다.
4. 인증 완료 후 `/oidc/callback`에서 code 교환, 세션 저장, 쿠키 발급을 처리합니다.
5. 이후 `/api/auth/platform-context`가 제품 접근 가능 여부를 최종 판정합니다.

## 라우트 접근 수준

### `public`

- 로그인 없이 접근 가능
- 예: `/login`, `GET /api/auth/oidc/login`, 공개 훈련 링크

### `session`

- 로그인 세션만 필요
- 예: `/onboarding`, `GET /api/auth/session`, `POST /api/platform/tenants`

### `ready`

- 로그인 세션과 tenant/entitlement 준비가 모두 필요
- 예: `/`, `/projects/**`, 대부분의 일반 `/api/**`

## 세션 정책

- 세션 쿠키 기본 이름: `ps_session`
- OIDC 트랜잭션 쿠키 기본 이름: `ps_oidc_txn`
- 세션 정보는 `auth_sessions` 테이블에 저장합니다.
- access token 만료 임박 시 refresh token으로 자동 갱신을 시도합니다.
- 갱신 실패나 만료 시 세션을 폐기하고 재로그인을 요구합니다.
- 로그아웃은 `POST /api/auth/logout`으로 처리하며 로컬 세션과 쿠키를 제거합니다.

## tenant/onboarding 정책

- 세션만 있어도 entitlement가 준비되지 않으면 일반 화면 접근은 허용하지 않습니다.
- tenant가 없거나 entitlement가 비활성/대기 상태면 `/onboarding`으로 유도합니다.
- tenant 생성 성공 후 세션의 `tenantId`를 즉시 갱신합니다.

## 로컬 개발 우회

- `AUTH_DEV_BYPASS=true`면 OIDC 인증을 우회합니다.
- 우회 세션은 개발 전용이며, 프로덕션에서는 사용하지 않습니다.
- 우회 시 기본 tenant는 `DEV_TENANT_ID` 또는 `tenant-local-001`입니다.

## 운영 필수 환경 변수

- `OIDC_CLIENT_SECRET`
- `AUTH_SESSION_SECRET`
- `AUTH_TOKEN_ENC_KEY`
- `APP_BASE_URL`

프로덕션은 HTTPS와 Secure 쿠키를 전제로 합니다.
