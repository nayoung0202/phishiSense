# .env 포맷 정리 계획

## 목표
- `.env.example` 기준으로 `.env`, `.env.prod`의 변수 묶음/정렬을 일관화한다.

## 작업 항목
1. `.env.example`, `.env`, `.env.prod`의 변수 순서와 섹션을 비교한다.
2. `.env.example`의 섹션 순서를 기준으로 `.env`, `.env.prod`를 재정렬한다.
3. 누락/중복 변수는 메모로 정리하고 필요 시 사용자에게 확인한다.

## 완료 기준
- `.env`, `.env.prod`가 `.env.example`과 동일한 섹션/순서로 정렬되어 있다.
- 변경 내역을 요약해 공유한다.
