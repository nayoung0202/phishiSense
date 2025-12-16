# SMTP 구성 런타임 판단 개편 계획

1. `server/routes.ts`에서 SMTP 환경 변수 확인 로직이 어디서 선언되는지 파악하고, 현재 `smtp_not_configured` 처리 흐름을 정리한다.
2. 매 요청마다 `process.env`를 직접 읽어 판단하도록 헬퍼 함수 혹은 인라인 체크로 교체하고, 기존 상수/배열 기반 정의를 제거한다.
3. `server/mailer.ts`의 구성 생성부를 `getMailerConfig` 함수로 단순화하고, 필요한 최소 변수를 노출하도록 바꾼다.
4. 예외 처리 구간에서도 동일한 방법으로 동작하는지 확인하고, 타입 검사(`npm run check`)로 회귀를 점검한다.
