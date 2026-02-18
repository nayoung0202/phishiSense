# 프로젝트 상세 파이차트 경계선 조정

## 목표
부서별 분포 파이차트의 흰색 경계선을 제거하고, 다중 부서일 때 조각 구분 가독성을 유지한다.

## 작업 범위
- ProjectDetail 파이차트 `Pie` 설정 변경
- 경계선 제거(`stroke="none"`)
- 다중 부서 시 `paddingAngle` 적용
- 타입 체크로 안정성 확인

## 수행 단계
1. `src/features/ProjectDetail.tsx`의 `Pie` 속성을 수정한다.
2. 다중 부서/단일 부서 조건에 맞게 `paddingAngle`을 적용한다.
3. `npm run check`로 타입 오류를 확인한다.
