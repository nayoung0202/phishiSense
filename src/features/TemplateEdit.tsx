"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { type Template, insertTemplateSchema } from "@shared/schema";
import {
  extractTemplateTokens,
  findUnknownTokens,
  countTokenOccurrences,
  MAIL_ALLOWED_TOKENS,
  MAIL_LANDING_TOKENS,
  MALICIOUS_ALLOWED_TOKENS,
  MALICIOUS_TRAINING_TOKENS,
} from "@shared/templateTokens";
import {
  buildAutoInsertBlock,
  buildMailHtml,
  resolveAutoInsertConfig,
} from "@shared/templateMail";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils";
import { renderEmailForSend } from "@/lib/email/renderEmailForSend";

export default function TemplateEdit({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const normalizedTemplateId = templateId ?? "";
  const isNew = normalizedTemplateId.length === 0;
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [trainingLinkLabel, setTrainingLinkLabel] = useState("훈련 안내 페이지로 이동");
  const [trainingLinkKind, setTrainingLinkKind] = useState<"link" | "button">("link");
  const [trainingLinkNewTab, setTrainingLinkNewTab] = useState(true);

  const { data: template } = useQuery<Template>({
    queryKey: ["/api/templates", normalizedTemplateId],
    enabled: !isNew,
  });

  const form = useForm({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      subject: template?.subject || "",
      body: template?.body || "",
      maliciousPageContent: template?.maliciousPageContent || "",
      autoInsertLandingEnabled: template?.autoInsertLandingEnabled ?? true,
      autoInsertLandingLabel: template?.autoInsertLandingLabel ?? "문서 확인하기",
      autoInsertLandingKind: template?.autoInsertLandingKind ?? "link",
      autoInsertLandingNewTab: template?.autoInsertLandingNewTab ?? true,
    },
    values: template ? {
      name: template.name,
      subject: template.subject,
      body: template.body,
      maliciousPageContent: template.maliciousPageContent,
      autoInsertLandingEnabled: template.autoInsertLandingEnabled ?? true,
      autoInsertLandingLabel: template.autoInsertLandingLabel ?? "문서 확인하기",
      autoInsertLandingKind: template.autoInsertLandingKind ?? "link",
      autoInsertLandingNewTab: template.autoInsertLandingNewTab ?? true,
    } : undefined,
  });

  const bodyValue = form.watch("body") ?? "";
  const subjectValue = form.watch("subject") ?? "";
  const maliciousValue = form.watch("maliciousPageContent") ?? "";
  const autoInsertLabel = form.watch("autoInsertLandingLabel") ?? "문서 확인하기";
  const autoInsertKind = form.watch("autoInsertLandingKind") ?? "link";
  const autoInsertNewTab = form.watch("autoInsertLandingNewTab") ?? true;
  const mailTokens = extractTemplateTokens(bodyValue);
  const landingTokenCount = countTokenOccurrences(bodyValue, MAIL_LANDING_TOKENS);
  const hasLandingToken = landingTokenCount > 0;
  const isLandingTokenMissing = landingTokenCount === 0;
  const unknownMailTokens = findUnknownTokens(mailTokens, MAIL_ALLOWED_TOKENS);
  const maliciousTokens = extractTemplateTokens(maliciousValue);
  const trainingTokenCount = countTokenOccurrences(maliciousValue, MALICIOUS_TRAINING_TOKENS);
  const hasTrainingToken = trainingTokenCount > 0;
  const isTrainingTokenMissing = trainingTokenCount === 0;
  const unknownMaliciousTokens = findUnknownTokens(maliciousTokens, MALICIOUS_ALLOWED_TOKENS);
  const isMaliciousEmpty = maliciousValue.trim().length === 0;
  const showLandingValidation = saveAttempted && isLandingTokenMissing;
  const showTrainingValidation = saveAttempted && isTrainingTokenMissing;
  const isSaveBlocked = isLandingTokenMissing || isTrainingTokenMissing;
  const previewLandingUrl = "/example-domain?type=landing";
  const previewOpenPixelUrl = "https://example.com/o/preview.gif";
  const previewTrainingUrl = "/example-domain?type=training";
  const previewSubmitUrl = "/example-domain?type=submit";
  const previewTrainingTokenReplacer = /\{\{\s*TRAINING_URL\s*\}\}/gi;
  const previewSubmitTokenReplacer = /\{\{\s*SUBMIT_URL\s*\}\}/gi;
  const previewMailFragment = buildMailHtml(
    {
      body: bodyValue,
      autoInsertLandingEnabled: false,
      autoInsertLandingLabel: autoInsertLabel,
      autoInsertLandingKind: autoInsertKind,
      autoInsertLandingNewTab: autoInsertNewTab,
    },
    previewLandingUrl,
    previewOpenPixelUrl,
  ).html;
  const previewMaliciousFragment = maliciousValue
    .replace(previewTrainingTokenReplacer, previewTrainingUrl)
    .replace(previewSubmitTokenReplacer, previewSubmitUrl);
  const previewMailHtml = renderEmailForSend(previewMailFragment, {
    subject: subjectValue || "메일 본문 미리보기",
  });
  const previewMaliciousHtml = renderEmailForSend(previewMaliciousFragment, {
    subject: "악성 메일 본문 미리보기",
  });
  const handleInsertLandingLink = () => {
    const currentBody = form.getValues("body") ?? "";
    if (countTokenOccurrences(currentBody, MAIL_LANDING_TOKENS) > 0) {
      return;
    }
    const config = resolveAutoInsertConfig({
      autoInsertLandingEnabled: form.getValues("autoInsertLandingEnabled"),
      autoInsertLandingLabel: form.getValues("autoInsertLandingLabel"),
      autoInsertLandingKind: form.getValues("autoInsertLandingKind"),
      autoInsertLandingNewTab: form.getValues("autoInsertLandingNewTab"),
    });
    const block = buildAutoInsertBlock("{{LANDING_URL}}", config);
    const separator = currentBody.endsWith("\n") ? "\n" : "\n\n";
    const nextBody = currentBody ? `${currentBody}${separator}${block}` : block;
    form.setValue("body", nextBody, { shouldDirty: true, shouldTouch: true });
  };
  const handleInsertTrainingLink = () => {
    const currentBody = form.getValues("maliciousPageContent") ?? "";
    if (countTokenOccurrences(currentBody, MALICIOUS_TRAINING_TOKENS) > 0) {
      return;
    }
    const normalizedLabel = trainingLinkLabel.trim() || "훈련 안내 페이지로 이동";
    const config = {
      enabled: true,
      label: normalizedLabel,
      kind: trainingLinkKind,
      newTab: trainingLinkNewTab,
    };
    const block = buildAutoInsertBlock("{{TRAINING_URL}}", config);
    const separator = currentBody.endsWith("\n") ? "\n" : "\n\n";
    const nextBody = currentBody ? `${currentBody}${separator}${block}` : block;
    form.setValue("maliciousPageContent", nextBody, { shouldDirty: true, shouldTouch: true });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNew) {
        return await apiRequest("POST", "/api/templates", data);
      }
      return await apiRequest("PATCH", `/api/templates/${normalizedTemplateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "저장 완료",
        description: "템플릿이 성공적으로 저장되었습니다.",
      });
      router.push("/templates");
    },
  });

  const onSubmit = (data: any) => {
    setSaveAttempted(true);
    if (isSaveBlocked) {
      toast({
        title: "필수 링크를 확인해주세요.",
        description: "메일 본문과 악성 본문에 필수 링크 토큰이 있어야 합니다.",
      });
      return;
    }
    saveMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-bold">
            {isNew ? "템플릿 생성" : "템플릿 수정"}
          </h1>
        </div>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>템플릿 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 배송 알림 템플릿" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메일 제목</FormLabel>
                  <FormControl>
                    <Input placeholder="예: [긴급] 배송 주소 확인 필요" {...field} data-testid="input-subject" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div
              className={cn(
                "space-y-3 rounded-lg border p-4",
                showLandingValidation ? "border-red-500 bg-red-50/40" : "border-dashed bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                {hasLandingToken ? (
                  <Badge className="bg-emerald-100 text-emerald-700">필수 링크 포함됨</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">필수 링크 누락</Badge>
                )}
                {unknownMailTokens.length > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    허용되지 않은 토큰: {unknownMailTokens.join(", ")}
                  </Badge>
                )}
              </div>
              {isLandingTokenMissing && (
                <p className="text-xs text-muted-foreground">
                  메일 본문에 훈련 링크를 최소 1개 넣어주세요.
                </p>
              )}

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="autoInsertLandingLabel"
                    render={({ field }) => (
                      <FormItem>
                        <Label>링크 문구</Label>
                        <FormControl>
                          <Input placeholder="예: 문서 확인하기" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoInsertLandingKind"
                    render={({ field }) => (
                      <FormItem>
                        <Label>형태</Label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="형태 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="link">텍스트 링크</SelectItem>
                            <SelectItem value="button">버튼</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoInsertLandingNewTab"
                    render={({ field }) => (
                      <FormItem className="flex h-full flex-col justify-between">
                        <Label>링크를 새 창(새 탭)으로 열기</Label>
                        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <span className="text-sm text-muted-foreground">
                            새 탭으로 열립니다
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleInsertLandingLink}
                    disabled={!isLandingTokenMissing}
                  >
                    필수 링크 삽입
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {isLandingTokenMissing
                      ? "현재 설정으로 메일 본문 끝에 추가합니다."
                      : "이미 포함되어 있습니다."}
                  </span>
                </div>
              </div>

              {showLandingValidation && (
                <p className="text-xs text-red-600">
                  필수 링크 토큰이 없습니다. {"{{LANDING_URL}}"}을 추가하세요.
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메일 본문</FormLabel>
                  <FormControl>
                    <div data-testid="editor-body">
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="메일 본문을 자유롭게 작성하세요."
                        previewHtml={previewMailHtml}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maliciousPageContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>악성 메일 본문</FormLabel>
                  <div
                    className={cn(
                      "space-y-3 rounded-lg border p-4",
                      showTrainingValidation
                        ? "border-red-500 bg-red-50/40"
                        : "border-dashed bg-muted/30",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {hasTrainingToken ? (
                        <Badge className="bg-emerald-100 text-emerald-700">필수 링크 포함됨</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">필수 링크 누락</Badge>
                      )}
                      {isMaliciousEmpty && (
                        <Badge className="bg-red-100 text-red-700">
                          악성 본문 비어 있음 · 실제 발송 차단
                        </Badge>
                      )}
                      {unknownMaliciousTokens.length > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          허용되지 않은 토큰: {unknownMaliciousTokens.join(", ")}
                        </Badge>
                      )}
                    </div>
                    {isTrainingTokenMissing && (
                      <p className="text-xs text-muted-foreground">
                        악성 본문에 훈련 안내 링크를 최소 1개 넣어주세요.
                      </p>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>링크 문구</Label>
                        <Input
                          placeholder="예: 훈련 안내 페이지로 이동"
                          value={trainingLinkLabel}
                          onChange={(event) => setTrainingLinkLabel(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>형태</Label>
                        <Select
                          onValueChange={(value) =>
                            setTrainingLinkKind(value === "button" ? "button" : "link")
                          }
                          value={trainingLinkKind}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="형태 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">텍스트 링크</SelectItem>
                            <SelectItem value="button">버튼</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>링크를 새 창(새 탭)으로 열기</Label>
                        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                          <Switch
                            checked={trainingLinkNewTab}
                            onCheckedChange={setTrainingLinkNewTab}
                          />
                          <span className="text-sm text-muted-foreground">
                            새 탭으로 열립니다
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleInsertTrainingLink}
                        disabled={!isTrainingTokenMissing}
                      >
                        필수 링크 삽입
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {isTrainingTokenMissing
                          ? "현재 악성 본문 끝에 추가합니다."
                          : "이미 포함되어 있습니다."}
                      </span>
                    </div>
                    {showTrainingValidation && (
                      <p className="text-xs text-red-600">
                        필수 링크 토큰이 없습니다. {"{{TRAINING_URL}}"}을 추가하세요.
                      </p>
                    )}
                    <FormControl>
                      <div data-testid="editor-malicious">
                        <RichTextEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="실제 악성 메일 페이지 본문을 작성하세요."
                          previewHtml={previewMaliciousHtml}
                        />
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Link href="/templates">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
