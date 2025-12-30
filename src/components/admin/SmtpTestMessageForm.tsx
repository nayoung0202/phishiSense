import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const DEFAULT_SMTP_TEST_SUBJECT = "테스트 이메일 수신 확인";
export const DEFAULT_SMTP_TEST_BODY = `안녕하세요,
이 메일은 메일 서버 및 템플릿 렌더링이 정상적으로 동작하는지 확인하기 위한
테스트 메일입니다.`;

type SmtpTestMessageFormProps = {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  disabled?: boolean;
};

export function SmtpTestMessageForm({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  disabled,
}: SmtpTestMessageFormProps) {
  const isSubjectValid = subject.trim().length > 0;
  const isBodyValid = body.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>테스트 메일 내용</CardTitle>
        <CardDescription>입력한 제목과 본문이 테스트 발송에 그대로 사용됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-test-subject">테스트 메일 제목 *</Label>
            <Input
              id="smtp-test-subject"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder="테스트 이메일 수신 확인"
              maxLength={120}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">테스트 메일 제목은 120자 이내로 입력하세요.</p>
            {!isSubjectValid && <p className="text-sm text-destructive">제목을 입력하세요.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-test-body">테스트 메일 본문 *</Label>
            <Textarea
              id="smtp-test-body"
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              placeholder={DEFAULT_SMTP_TEST_BODY}
              rows={5}
              maxLength={2000}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">테스트 메일 본문은 2000자 이내로 입력하세요.</p>
            {!isBodyValid && <p className="text-sm text-destructive">본문을 입력하세요.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
