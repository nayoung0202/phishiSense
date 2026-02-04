"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { extractBodyHtml } from "@/lib/html";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SafeText } from "@/components/security/SafeText";

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

  const previewBody = previewTemplate?.body ?? "";
  const previewMalicious = previewTemplate?.maliciousPageContent ?? "";
  const previewSurfaceClass =
    previewTheme === "dark"
      ? "rounded-md border border-slate-800 bg-slate-950 p-4 text-slate-50"
      : "rounded-md border border-slate-200 bg-white p-4 text-slate-900";
  const previewProseClass =
    previewTheme === "dark" ? "prose prose-invert max-w-none" : "prose max-w-none";
  const previewMutedClass =
    previewTheme === "dark" ? "text-slate-300" : "text-slate-600";
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
              <p className="text-sm text-muted-foreground">
                {previewTemplate?.subject ?? "템플릿 제목이 없습니다."}
              </p>
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
                <div className={previewSurfaceClass}>
                  {previewTemplate ? (
                    previewBody.trim().length > 0 ? (
                      <div
                        className={previewProseClass}
                        dangerouslySetInnerHTML={{ __html: extractBodyHtml(previewBody) }}
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
                <div className={previewSurfaceClass}>
                  {previewTemplate ? (
                    previewMalicious.trim().length > 0 ? (
                      <div
                        className={previewProseClass}
                        dangerouslySetInnerHTML={{ __html: extractBodyHtml(previewMalicious) }}
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
            {filteredTemplates.map((template) => (
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
            ))}
          </div>
        )}
      </Card>
    </div>
    </>
  );
}
