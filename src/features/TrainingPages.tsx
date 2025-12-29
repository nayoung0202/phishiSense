"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, FileText, Eye } from "lucide-react";
import Link from "next/link";
import { type TrainingPage } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SafeText } from "@/components/security/SafeText";

export default function TrainingPages() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: pages = [], isLoading } = useQuery<TrainingPage[]>({
    queryKey: ["/api/training-pages"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/training-pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-pages"] });
    },
  });

  const filteredPages = pages.filter((page) =>
    page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'PPp', { locale: ko });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">훈련 안내 페이지 관리</h1>
          <p className="text-muted-foreground">훈련 완료 후 표시될 안내 페이지를 관리하세요</p>
        </div>
        <Link href="/training-pages/new">
          <Button data-testid="button-new-page">
            <Plus className="w-4 h-4 mr-2" />
            새 안내 페이지 생성
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="페이지명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">로딩 중...</div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            안내 페이지가 없습니다
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPages.map((page) => (
              <Card key={page.id} className="p-6 hover-elevate" data-testid={`card-page-${page.id}`}>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          <SafeText value={page.name} fallback="-" />
                        </h3>
                        <Badge className={
                          page.status === "active" 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-gray-500/20 text-gray-400"
                        }>
                          {page.status === "active" ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <SafeText value={page.description} fallback="설명 없음" />
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                      최근 수정: {formatDate(page.updatedAt!)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-preview-${page.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            미리보기
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>
                              <SafeText value={page.name} fallback="-" />
                            </DialogTitle>
                          </DialogHeader>
                          <div 
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                          />
                        </DialogContent>
                      </Dialog>
                      <Link href={`/training-pages/${page.id}/edit`}>
                        <Button variant="outline" size="sm" data-testid={`button-edit-${page.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(page.id)}
                        data-testid={`button-delete-${page.id}`}
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
  );
}
