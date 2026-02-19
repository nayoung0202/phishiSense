# 이메일 발송 라이트 렌더 강제 적용 계획

## 목표
- 에디터 UI 다크 테마는 유지하되, 발송되는 이메일 HTML은 항상 라이트 기반(`배경 #ffffff`, `텍스트 #111111`)으로 강제한다.
- 사이트 다크 CSS가 이메일 본문에 침투해 `white text`로 발송되는 문제를 차단한다.
- 미리보기와 실제 발송 HTML 렌더 결과를 일치시켜 발송 오류를 사전에 확인 가능하게 한다.

## 작업 단계
1. 이메일 렌더 유틸 추가
   - `renderEmailForSend(fragmentHtml, opts?)` 구현
   - `stripDarkThemeStyles()`로 다크 클래스/속성/인라인 스타일 제거
   - `wrapWithEmailShell()`로 테이블 기반 full HTML 래핑
   - 링크/버튼 대비 보정 로직 포함
2. 발송 경로 통합
   - 워커/러너/API 테스트 발송 경로에서 발송 직전 `renderEmailForSend` 강제 적용
   - DB 저장 형식은 fragment 유지
3. 미리보기 경로 통합
   - 템플릿 미리보기를 발송 렌더 결과(full HTML) 기반으로 표시
   - iframe 격리 유지로 사이트 CSS 영향 차단
4. 테스트 추가 및 검증
   - `stripDarkThemeStyles` 단위 테스트 추가
   - `npm run check` 및 관련 테스트 실행
5. 변경사항 커밋

## 확인 항목
- 발송 HTML에 `color:#fff`, `color:white`가 남지 않는지
- 미리보기가 발송 HTML과 동일한 렌더 결과인지
- 다크 모드 메일 클라이언트에서도 대비가 유지되는지(기본 색상 강제)
