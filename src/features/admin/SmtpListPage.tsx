"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSmtpConfig, listSmtpConfigs } from "@/lib/api";
import type { SmtpConfigSummary } from "@/types/smtp";
import { useToast } from "@/hooks/use-toast";

export default function SmtpListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const {
    data,
    isFetching,
    refetch,
  } = useQuery<SmtpConfigSummary[]>({
    queryKey: ["smtp-configs"],
    queryFn: listSmtpConfigs,
  });

  const items = data ?? [];

  const handleRefresh = () => {
    void refetch();
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    try {
      return format(new Date(value), "yyyy-MM-dd HH:mm");
    } catch {
      return value;
    }
  };

  const formatDomains = (domains?: string[] | null) => {
    const normalized = (domains ?? []).map((domain) => domain.trim()).filter(Boolean);
    if (normalized.length === 0) return "-";
    return normalized.join(", ");
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }, [items]);

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await deleteSmtpConfig(tenantId);
      return tenantId;
    },
    onMutate: (tenantId) => {
      setDeletingId(tenantId);
    },
    onSuccess: (tenantId) => {
      toast({
        title: "SMTP 설정을 삭제했습니다.",
      });
      void queryClient.invalidateQueries({ queryKey: ["smtp-configs"] });
      void queryClient.invalidateQueries({ queryKey: ["smtp-config", tenantId] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "삭제에 실패했습니다.";
      toast({ title: "삭제 실패", description: message, variant: "destructive" });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = (tenantId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate(tenantId);
  };

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SMTP 설정 목록</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/admin/smtp/new")}>SMTP 등록</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP 설정</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 SMTP 설정이 없습니다. 새로운 설정을 등록해 주세요.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>호스트</TableHead>
                    <TableHead>도메인</TableHead>
                    <TableHead>포트</TableHead>
                    <TableHead>보안 모드</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>비밀번호</TableHead>
                    <TableHead>최근 테스트</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.tenantId}>
                      <TableCell>{item.host || "-"}</TableCell>
                      <TableCell>{formatDomains(item.allowedRecipientDomains)}</TableCell>
                      <TableCell>{item.port}</TableCell>
                      <TableCell>{item.securityMode}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "secondary" : "destructive"}>
                          {item.isActive ? "활성" : "비활성"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.hasPassword ? "secondary" : "destructive"}>
                          {item.hasPassword ? "등록" : "미등록"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium">
                            {item.lastTestStatus === "success"
                              ? "성공"
                              : item.lastTestStatus === "failure"
                                ? "실패"
                                : "미실행"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.lastTestedAt)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/smtp/${item.tenantId}`)}
                          >
                            수정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleteMutation.isPending && deletingId === item.tenantId}
                            onClick={() => handleDelete(item.tenantId)}
                          >
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
