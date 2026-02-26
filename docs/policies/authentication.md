# 인증 (Authentication) 정책 및 플로우 가이드

본 문서는 PhishSense 시스템의 통합 인증 (EVRIZ OIDC) 정책과 데이터 흐름을 정의합니다.

## 1. 인증 정책 및 접근 제어 파라미터

- **Issuer**: `https://auth.evriz.co.kr`
- **Client ID**: `phishsense-app`
- **Redirect URI**: `https://app.phishsense.cloud/oidc/callback`
- **스코프(Scope)**: `openid profile email offline_access`
- **Prompt 정책**: `prompt_values_supported = ["none", "create"]`
- **회원가입 진입 정책**: 앱에서 IdP `/signup`를 직접 호출하지 않고, 항상 `/oauth2/authorize` 시작점으로 진입합니다 (`prompt=create` 사용).
- **기본 인증 UX 정책**: 보호된 페이지에 세션 없이 접근 시, 별도의 안내 화면 없이 즉시 IdP(Identity Provider)의 로그인 화면으로 리다이렉트 처리합니다.

## 2. 보안 접근(Routing) 정책

시스템 내의 모든 라우트는 인증 여부에 따라 엄격하게 분리됩니다.

- **보호 페이지 (세션 필수)**: `/`, `/projects/**`, `/targets/**`, `/templates/**`, `/training-pages/**`, `/admin/**`
- **보호 API (세션 필수)**: `/api/**` (단, `/api/auth/**` 경로 제외)
- **공개 페이지 (세션 불필요)**: `/p/**`, `/t/**` (공개 훈련 링크 등), `/oidc/callback`

> **※ API 응답 정책**: API(`fetch` 등) 호출 시 세션이 만료되거나 없는 경우, 라우트 리다이렉트를 시도하지 않고 HTTP `401 Unauthorized` JSON 상태 코드를 즉시 반환하여 클라이언트 단에서 처리하도록 합니다.

## 3. OIDC 인증 데이터 플로우

1. **접근 및 세션 확인**: 보호 페이지 접근 시 Next.js의 `middleware.ts`가 세션 쿠키 여부를 검사합니다.
2. **리다이렉트**: 세션이 없거나 유효하지 않으면 `/api/auth/oidc/login?returnTo=[원래경로]`로 302 리다이렉트를 수행합니다.
3. **토큰 및 검증자 생성**: 로그인 라우트에서 `state`, `nonce`, PKCE `code_verifier`를 생성하여 트랜잭션 쿠키에 임시 저장합니다.
4. **IdP 연동**: 생성된 `code_challenge(S256)`를 포함하여 OIDC Discovery의 `authorization_endpoint`로 접속합니다.
   - 회원가입 유도 시 `prompt=create`를 함께 전달합니다.
   - `prompt=none`과 `prompt=create`를 동시에 전달하면 `invalid_request`로 간주합니다.
5. **콜백 및 토큰 교환**:
   - 사용자가 EVRIZ Auth 서버에서 로그인을 완료하면 `/oidc/callback`으로 리턴됩니다.
   - 전달받은 `state`를 트랜잭션 쿠키와 비교 검증한 후, 발급받은 Authorization Code를 Access/ID Token으로 교환합니다.
6. **토큰 검증 및 사용자 인가**:
   - 수신한 `id_token`의 서명(JWKS) 및 클레임(Claim)을 검증하고 `userinfo`를 조회합니다.
   - 검증이 완료되면 내부 DB의 `auth_sessions` 테이블에 세션 데이터를 기록하고, 클라이언트에 `HttpOnly` 속성의 세션 쿠키를 발급합니다.
7. **복귀**: 최초 접근했던 `returnTo` 경로로 사용자를 최종 랜딩시킵니다.

### 회원가입 후 복귀 흐름 (현재 구현)

1. 앱이 `/api/auth/oidc/login?prompt=create&returnTo=[원래경로]`로 요청해 authorize를 시작합니다.
2. Auth 서버가 회원가입 화면으로 유도하고, 회원가입 완료 후 로그인 화면으로 이동합니다.
3. 사용자가 로그인하면 SavedRequest 기반으로 기존 authorize 요청을 재개합니다.
4. Auth 서버가 등록된 `redirect_uri`(Exact Match)로 authorization code를 전달합니다.
5. 앱은 `/oidc/callback`에서 code 교환 및 세션 생성을 완료한 뒤 `returnTo`로 복귀시킵니다.

## 4. 세션 관리 및 로그아웃 정책

- **토큰 갱신**: Access Token 만료가 임박한 경우 Refresh Token을 이용해 세션을 연장합니다. 연장에 실패할 경우 즉시 세션을 폐기(revoke)하고 클라이언트에게 401을 반환합니다.
- **로그아웃**:
  - `POST /api/auth/logout` 엔드포인트를 통해 호출됩니다.
  - 내부 앱 세션을 폐기(revoke)하고 세션/트랜잭션 쿠키를 모두 즉시 삭제합니다.
  - _단, 현재 EVRIZ IdP 레벨의 Global Logout 로직은 호출하지 않고 로컬 앱 세션만 제거합니다._

## 5. 로컬 개발 환경 인증 우회 (Bypass) 정책

빠른 로컬 개발을 돕기 위해 강제 인증을 우회할 수 있는 장치를 제공합니다.

- `.env` 파일에 `AUTH_DEV_BYPASS=true`를 설정하면 OIDC 인증을 완전히 우회하고 기설정된 '개발용 임시 사용자'로 인증된 상태를 반환합니다.
- 해당 값이 없거나 `false`일 경우 프로덕션과 동일하게 리다이렉트 및 401 정책이 켜집니다.
- **주의**: 이 우회 값은 오직 `.env` 로컬 환경에서만 사용하며, 프로덕션이나 레포지토리에는 절대 하드코딩되지 않아야 합니다.

## 6. 프로덕션 운영 필수 체크포인트

- 프로덕션 배포 시 `AUTH_SESSION_SECRET`, `AUTH_TOKEN_ENC_KEY`, `OIDC_CLIENT_SECRET` 환경변수는 필수로 등록되어야 합니다.
- 프로덕션은 **HTTPS + Secure 쿠키** 방식만 허용됩니다.
- OIDC Redirect URI 설정값은 Auth 서버에 사전 등록된 값과 오차(Trailing Slash 등) 없이 **완전 일치**해야 합니다.
- `APP_BASE_URL` 환경 변수를 프로덕션의 실제 도메인으로 필수 지정해야 하며, 모든 인증 리다이렉트는 해당 도메인 내에서만 동작하도록 제한해야 합니다 (오픈 리다이렉트 어택 방어).
