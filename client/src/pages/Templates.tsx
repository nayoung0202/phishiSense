import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Mail } from "lucide-react";
import { Link } from "wouter";
import { type Template } from "@shared/schema";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Templates() {
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-4xl font-bold mb-2">템플릿 관리</h1>
          <p className="text-muted-foreground">메일 템플릿을 관리하고 훈련에 활용하세요</p>
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
                      <h3 className="font-semibold mb-1 truncate">{template.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                      최근 수정: {formatDate(template.updatedAt!)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Link href={`/templates/${template.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-${template.id}`}>
                          <Edit className="w-4 h-4 mr-2" />
                          수정
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
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
  );
}
