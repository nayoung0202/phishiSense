import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

export default function TemplateEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const templateId = id ?? "";
  const isNew = templateId.length === 0;

  const { data: template } = useQuery<Template>({
    queryKey: ["/api/templates", templateId],
    enabled: !isNew,
  });

  const form = useForm({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      subject: template?.subject || "",
      body: template?.body || "",
      maliciousPageContent: template?.maliciousPageContent || "",
    },
    values: template ? {
      name: template.name,
      subject: template.subject,
      body: template.body,
      maliciousPageContent: template.maliciousPageContent,
    } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNew) {
        return await apiRequest("POST", "/api/templates", data);
      }
      return await apiRequest("PATCH", `/api/templates/${templateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "저장 완료",
        description: "템플릿이 성공적으로 저장되었습니다.",
      });
      setLocation("/templates");
    },
  });

  const onSubmit = (data: any) => {
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
                  <FormControl>
                    <div data-testid="editor-malicious">
                      <RichTextEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="실제 악성 메일 페이지 본문을 작성하세요."
                      />
                    </div>
                  </FormControl>
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
