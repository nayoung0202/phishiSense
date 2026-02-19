"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Mail, Eye, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { type Template } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SafeText } from "@/components/security/SafeText";
import { buildMailHtml } from "@shared/templateMail";
import {
  countTokenOccurrences,
  MAIL_LANDING_TOKENS,
  MALICIOUS_TRAINING_TOKENS,
} from "@shared/templateTokens";
import { TemplatePreviewFrame } from "@/components/template-preview-frame";
import { renderEmailForSend } from "@/lib/email/renderEmailForSend";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function Templates() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");

  const getSnippet = (html: string, size = 80) => {
    const plain = html
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plain.length <= size) {
      return plain;
    }
    return `${plain.slice(0, size)}...`;
  };

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
  });

  const filteredTemplates = templates.filter((template) => {
    const keyword = searchTerm.toLowerCase();
    if (!keyword) return true;
    return (
      template.name.toLowerCase().includes(keyword) ||
      template.subject.toLowerCase().includes(keyword) ||
      template.body.toLowerCase().includes(keyword) ||
      template.maliciousPageContent.toLowerCase().includes(keyword)
    );
  });

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenPreview = (template: Template) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewTemplate(null);
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'PPp', { locale: ko });
  };

  const previewLandingUrl = "/example-domain?type=landing";
  const previewOpenPixelUrl = "https://example.com/o/preview.gif";
  const previewTrainingUrl = "/example-domain?type=training";
  const previewSubmitUrl = "/example-domain?type=submit";
  const previewTrainingTokenMatcher = /\{\{\s*TRAINING_URL\s*\}\}/i;
  const previewTrainingTokenReplacer = /\{\{\s*TRAINING_URL\s*\}\}/gi;
  const previewSubmitTokenMatcher = /\{\{\s*SUBMIT_URL\s*\}\}/i;
  const previewSubmitTokenReplacer = /\{\{\s*SUBMIT_URL\s*\}\}/gi;
  const previewMailResult = previewTemplate
    ? buildMailHtml(previewTemplate, previewLandingUrl, previewOpenPixelUrl)
    : null;
  const previewBodyFragment = previewMailResult?.html ?? "";
  const previewMaliciousRaw = previewTemplate?.maliciousPageContent ?? "";
  const previewMaliciousHasTrainingToken = previewTrainingTokenMatcher.test(previewMaliciousRaw);
  const previewMaliciousHasSubmitToken = previewSubmitTokenMatcher.test(previewMaliciousRaw);
  const previewMaliciousFragment = previewMaliciousRaw
    .replace(previewTrainingTokenReplacer, previewTrainingUrl)
    .replace(previewSubmitTokenReplacer, previewSubmitUrl);
  const previewBodyHtml = renderEmailForSend(previewBodyFragment, {
    subject: previewTemplate?.subject ?? "템플릿 미리보기",
  });
  const previewMaliciousHtml = renderEmailForSend(previewMaliciousFragment, {
    subject: `${previewTemplate?.subject ?? "템플릿"} - 악성 메일 본문`,
  });
  const previewScrollableSurfaceClass =
    previewTheme === "dark"
      ? "site-scrollbar max-h-[60vh] overflow-y-auto rounded-md border border-slate-800 bg-slate-950 p-2"
      : "site-scrollbar max-h-[60vh] overflow-y-auto rounded-md border border-slate-200 bg-white p-2";
  const previewMutedClass = previewTheme === "dark" ? "text-slate-300" : "text-slate-600";
  const previewFrameClass = cn(
    "rounded-md",
    previewTheme === "dark" ? "shadow-[0_0_0_1px_rgba(148,163,184,0.2)]" : "shadow-sm",
  );
  return (
    <>
      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClosePreview();
          } else {
            setIsPreviewOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-3xl" data-testid="dialog-template-preview">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name ?? "템플릿 미리보기"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">
                  {previewTemplate?.subject ?? "템플릿 제목이 없습니다."}
                </p>
                <p className="text-xs text-muted-foreground">
                  실제 발송과 동일한 라이트 기반 이메일 렌더 미리보기입니다.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={previewTheme === "light" ? "text-foreground font-semibold" : ""}>라이트</span>
                <Switch
                  checked={previewTheme === "dark"}
                  onCheckedChange={(checked) => setPreviewTheme(checked ? "dark" : "light")}
                  aria-label="미리보기 테마 전환"
                  thumbIcon={
                    previewTheme === "dark" ? (
                      <Moon className="h-3 w-3" />
                    ) : (
                      <Sun className="h-3 w-3" />
                    )
                  }
                />
                <span className={previewTheme === "dark" ? "text-foreground font-semibold" : ""}>다크</span>
              </div>
            </div>
            <Tabs defaultValue="body" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="body">메일 본문</TabsTrigger>
                <TabsTrigger value="malicious">악성 메일 본문</TabsTrigger>
              </TabsList>
              <TabsContent value="body">
                <div className={previewScrollableSurfaceClass}>
                  {previewTemplate ? (
                    previewBodyFragment.trim().length > 0 ? (
                      <TemplatePreviewFrame
                        html={previewBodyHtml}
                        className={previewFrameClass}
                        minHeight={340}
                      />
                    ) : (
                      <p className={`text-sm ${previewMutedClass}`}>메일 본문이 없습니다.</p>
                    )
                  ) : (
                    <p className={`text-sm ${previewMutedClass}`}>미리볼 템플릿을 선택하세요.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="malicious">
                {previewTemplate && (previewMaliciousHasTrainingToken || previewMaliciousHasSubmitToken) && (
                  <p className={`mb-2 text-xs ${previewMutedClass}`}>
                    훈련/제출 링크가 치환된 미리보기입니다.
                  </p>
                )}
                <div className={previewScrollableSurfaceClass}>
                  {previewTemplate ? (
                    previewMaliciousFragment.trim().length > 0 ? (
                      <TemplatePreviewFrame
                        html={previewMaliciousHtml}
                        className={previewFrameClass}
                        minHeight={340}
                      />
                    ) : (
                      <p className={`text-sm ${previewMutedClass}`}>악성 메일 본문이 없습니다.</p>
                    )
                  ) : (
                    <p className={`text-sm ${previewMutedClass}`}>미리볼 템플릿을 선택하세요.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">템플릿 관리</h1>
        </div>
        <Link href="/templates/new">
          <Button data-testid="button-new-template">
            <Plus className="w-4 h-4 mr-2" />
            새 템플릿
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="템플릿명이나 제목으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            템플릿이 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const landingTokenCount = countTokenOccurrences(
                template.body ?? "",
                MAIL_LANDING_TOKENS,
              );
              const trainingTokenCount = countTokenOccurrences(
                template.maliciousPageContent ?? "",
                MALICIOUS_TRAINING_TOKENS,
              );
              const mailStatus = landingTokenCount >= 1 ? "ok" : "missing";
              const maliciousStatus = trainingTokenCount >= 1 ? "ok" : "missing";
              const isInvalid = mailStatus !== "ok" || maliciousStatus !== "ok";

              return (
                <Card key={template.id} className="p-6 hover-elevate" data-testid={`card-template-${template.id}`}>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 truncate">
                          <SafeText value={template.name} fallback="-" />
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          <SafeText value={template.subject} fallback="-" />
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      <div>
                        <p className="text-xs font-semibold text-foreground">메일 본문</p>
                        <p>
                          <SafeText value={getSnippet(template.body)} fallback="-" />
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">악성 메일 본문</p>
                        <p>
                          <SafeText value={getSnippet(template.maliciousPageContent)} fallback="-" />
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          mailStatus === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        메일: {mailStatus === "ok" ? "포함됨" : "누락"}
                      </Badge>
                      <Badge
                        className={
                          maliciousStatus === "ok"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        악성: {maliciousStatus === "ok" ? "포함됨" : "누락"}
                      </Badge>
                      {isInvalid && (
                        <span className="text-xs text-muted-foreground">저장/발송 불가</span>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3">
                        최근 수정: {formatDate(template.updatedAt!)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPreview(template)}
                          data-testid={`button-preview-${template.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          미리보기
                        </Button>
                        <Link href={`/templates/${template.id}/edit`}>
                          <Button variant="outline" size="sm" data-testid={`button-edit-${template.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
    </>
  );
}
