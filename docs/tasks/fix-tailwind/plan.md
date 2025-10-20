## 작업 목표
- Tailwind CSS 구성 경고와 `border-border` 클래스로 인한 빌드 오류 해결

## 접근 계획
1. 현재 Tailwind 구성(`tailwind.config.ts`)과 `client/src/index.css` 내용을 검토해 오류 원인 파악
2. Tailwind `content` 설정을 실제 파일 경로에 맞춰 보완
3. `border-border` 사용처를 확인하고 올바른 색상 토큰으로 교체 혹은 정의
4. 필요한 경우 스타일 토큰 정의를 추가하고, 변경 사항을 `npm run check`로 검증
5. 수정한 내용을 정리하고 후속 작업 제안
