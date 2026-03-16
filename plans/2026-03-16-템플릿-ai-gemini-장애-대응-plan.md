# 템플릿 AI Gemini 장애 대응 계획

## 작업 목적
- Gemini API의 일시적 과부하(`503 UNAVAILABLE`)가 발생했을 때 이를 내부 서버 오류처럼 보이지 않게 정리한다.
- 템플릿 AI 생성 요청이 재시도 가능한 외부 장애인지 사용자와 서버가 명확히 구분할 수 있게 만든다.

## 수정 범위
- `src/server/services/templateAi.ts`
- `src/app/api/templates/ai-generate/route.ts`
- `src/components/TemplateAiGenerateDialog.tsx`
- 관련 테스트 파일

## 해결 방향
- Gemini 응답의 상태 코드와 오류 본문을 파싱해 과부하/일시 장애를 별도 서비스 오류로 분류한다.
- 재시도 가능한 장애는 짧은 백오프 재시도 후에도 실패하면 503으로 응답한다.
- 프런트에서는 JSON 문자열째 노출하지 않고 사용자용 오류 문구만 표시한다.

## 검증 계획
- 라우트 테스트에서 Gemini 서비스 장애가 503과 한글 메시지로 반환되는지 확인한다.
- 서비스 테스트에서 Gemini 503 응답에 대해 재시도 후 서비스 오류로 변환되는지 확인한다.
- 다이얼로그 테스트에서 `503: {"error":"..."}` 형태가 아닌 정리된 오류 문구가 노출되는지 확인한다.
