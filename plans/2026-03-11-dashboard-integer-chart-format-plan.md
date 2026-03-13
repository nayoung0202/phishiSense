# 대시보드 모의훈련 현황 비교 차트 정수 표기 통일 계획

## 작업 목적
- 비교 차트 툴팁과 축에서 퍼센트 값이 소수점으로 보이는 문제를 수정한다.
- 건수와 퍼센트 표기를 모두 정수 기준으로 일관되게 맞춘다.

## 수정 범위
- `src/features/Dashboard.tsx`
- `src/features/Dashboard.test.ts`

## 검증 항목
- 퍼센트 값이 `Math.round` 기준의 정수 퍼센트로 표시되는지 확인
- 건수 값이 천 단위 구분 정수로 표시되는지 확인
- `openRate`, `clickRate`, `submitRate`만 퍼센트 시리즈로 분기되는지 확인
