# PostgreSQL + Drizzle 전환 계획

1. SQLite 전용 DB 초기화 코드를 PostgreSQL 기반 Drizzle 초기화로 교체하고, 관련 스키마를 pg-core로 정리한다.
2. 템플릿/SMTP DAO를 PostgreSQL 드라이버에 맞게 수정하고 결과 매핑 로직을 정리한다.
3. Drizzle 설정, 회전 스크립트, 문서(.env.example/README)를 PostgreSQL 기준으로 업데이트한다.
4. 의존성 정리(불필요한 SQLite 패키지 제거, pg 추가)와 로컬 확인 절차를 정리한다.
