# DB 포트 환경변수화 계획

## 목표
- 로컬/운영 환경에서 DB 포트 매핑을 환경변수로 제어한다.
- DATABASE_URL 내 포트도 동일한 변수로 치환한다.

## 작업 항목
1. compose.yml 및 override 파일의 포트 매핑 구조를 확인한다.
2. .env/.env.prod/.env.example에 DB_PORT 변수를 추가한다.
3. compose.yml의 포트 매핑과 DATABASE_URL에서 DB_PORT를 참조하도록 수정한다.

## 완료 기준
- 로컬은 5433, 운영은 5432로 포트 매핑이 환경변수로 제어된다.
- DATABASE_URL에서도 동일한 DB_PORT 변수가 사용된다.
