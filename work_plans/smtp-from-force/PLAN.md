# 작업 계획

## 목표
- SMTP 테스트 발송 시 발신자(from)를 SMTP 계정(username)으로 강제해 551 오류를 방지한다.

## 작업 항목
1. SMTP 테스트 발송 로직에서 from 주소를 username 우선으로 설정한다.
2. username이 비어 있으면 기존 fromEmail을 유지한다.

## 검증 방법
- username: user@company.com, fromEmail: alerts@company.com, 수신자: other@company.com
- 테스트 발송 시 from이 user@company.com으로 설정되는지 확인한다.
