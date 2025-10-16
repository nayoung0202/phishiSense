import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { type TrainingPage, insertTrainingPageSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TrainingPageEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

  const { data: page } = useQuery<TrainingPage>({
    queryKey: ["/api/training-pages", id],
    enabled: !isNew,
  });

  const form = useForm({
    resolver: zodResolver(insertTrainingPageSchema),
    defaultValues: {
      name: page?.name || "",
      description: page?.description || "",
      content: page?.content || "",
      status: page?.status || "active",
    },
    values: page ? {
      name: page.name,
      description: page.description || "",
      content: page.content,
      status: page.status || "active",
    } : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isNew) {
        return await apiRequest("POST", "/api/training-pages", data);
      } else {
        return await apiRequest("PATCH", `/api/training-pages/${id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-pages"] });
      toast({
        title: "저장 완료",
        description: "훈련 안내 페이지가 성공적으로 저장되었습니다.",
      });
      setLocation("/training-pages");
    },
  });

  const onSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/training-pages">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-bold">
            {isNew ? "새 안내 페이지 생성" : "안내 페이지 수정"}
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
                  <FormLabel>페이지 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 보안 훈련 결과 안내" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Input placeholder="페이지에 대한 간단한 설명" {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="상태를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">활성</SelectItem>
                      <SelectItem value="inactive">비활성</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>페이지 내용 (HTML)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="<div><h2>보안 훈련 결과 안내</h2><p>이 메일은 실제 공격이 아닌 보안 모의훈련입니다...</p></div>"
                      className="min-h-[400px] font-mono text-sm"
                      {...field}
                      data-testid="textarea-content"
                    />
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
              <Link href="/training-pages">
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
