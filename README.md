# phishiSense

## 데이터베이스 설정

이제 SMTP 계정과 템플릿 정보는 PostgreSQL + Drizzle 기반 DB에 영구 저장됩니다. 개발 환경에서도 `.env`에 `DATABASE_URL`로 Postgres 연결 문자열을 지정해 주세요.

1. `.env.example`을 참고해 `.env`를 생성하고 `DATABASE_URL`과 `SMTP_SECRET`을 채웁니다. `SMTP_SECRET`은 AES-256 암호화를 위한 키이므로 운영 환경에서 반드시 안전한 값을 사용하세요.
2. `npm run db:push`를 실행해 `smtp_accounts`, `templates` 테이블을 생성합니다. `DATABASE_URL`이 비어 있으면 `drizzle-kit push` 단계에서 실패하므로, push 전 반드시 설정해야 합니다.
3. 필요하다면 `npm run db:studio`로 로컬 테이블을 확인할 수 있습니다.

## SMTP 암호화

SMTP 비밀번호는 AES-256-GCM으로 암호화되어 `smtp_accounts.password_enc`에 저장됩니다. `SMTP_SECRET`을 지정하지 않으면 개발용 임시 키가 사용되며, 서버 로그에 경고가 출력됩니다.

## 영속성 확인

1. SMTP 관리에서 계정을 저장한 뒤 서버를 재시작합니다. 같은 리스트가 유지되는지 확인하세요.
2. 템플릿을 생성/수정/삭제한 뒤 서버를 재시작해 변경 내용이 유지되는지 확인하세요.
3. 나머지 리소스(프로젝트, 훈련 페이지 등)는 기존과 동일하게 메모리 스토리지 기반으로 동작합니다.

## 체크리스트

- [ ] `DATABASE_URL`을 비우고 `npm run db:push`를 실행하면 Drizzle이 연결 문자열이 없다고 실패하는 이유를 README에서 확인할 수 있습니다.
- [ ] `npm run db:push` 후 `smtp_accounts`, `templates` 테이블 생성 여부를 확인했습니다.
- [ ] SMTP 설정을 저장하고 서버를 재시작해도 목록이 유지되는지 확인했습니다.
- [ ] 템플릿을 저장/삭제하고 서버를 재시작해도 목록이 유지되는지 확인했습니다.
- [ ] 프로젝트/훈련 페이지/타깃 등은 기존과 동일하게 메모리 스토리지를 사용함을 확인했습니다.
