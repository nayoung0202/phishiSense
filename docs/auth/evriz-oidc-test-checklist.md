# EVRIZ OIDC 테스트 체크리스트

## 1) 정상 흐름
- [ ] 무세션으로 `/` 접근 시 `/api/auth/oidc/login`으로 302
- [ ] `/api/auth/oidc/login`이 authorize endpoint로 302 (state/nonce/pkce 포함)
- [ ] callback 성공 후 세션 쿠키 발급
- [ ] callback 성공 후 `returnTo` 경로로 복귀
- [ ] 인증 이후 보호 API 호출이 200 유지

## 2) 정책 검증
- [ ] 무세션 보호 API 요청이 302가 아니라 401 반환
- [ ] 공개 경로 `/p/*`, `/t/*`는 무세션에서도 동작

## 3) 실패 시나리오
- [ ] callback에서 state 불일치 시 400/401 처리
- [ ] code 재사용(`invalid_grant`) 시 세션 미생성 확인
- [ ] PKCE 불일치 시 token 교환 실패 처리

## 4) 토큰/세션 만료
- [ ] access token 만료 임박 시 refresh 성공하면 세션 유지
- [ ] refresh 실패 시 세션 revoke + 이후 요청 401/재인증 유도

## 5) 로그아웃
- [ ] `/api/auth/logout` 호출 시 세션 revoke
- [ ] 쿠키 삭제 후 보호 페이지 접근 시 재인증 리다이렉트
