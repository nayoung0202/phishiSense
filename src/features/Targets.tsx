"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Upload, Download, Loader2 } from "lucide-react";
import { type Target } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { SafeText } from "@/components/security/SafeText";
import { importTrainingTargetsExcel, type ImportTrainingTargetsResponse } from "@/lib/api";

const parseDepartments = (department: Target["department"]): string[] => {
  if (!department) return [];
  if (Array.isArray(department)) {
    return department.map((dept) => dept.trim()).filter((dept) => dept.length > 0);
  }
  return department
    .split(",")
    .map((dept) => dept.trim())
    .filter((dept) => dept.length > 0);
};

export default function Targets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportTrainingTargetsResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const { data: targets = [], isLoading } = useQuery<Target[]>({
    queryKey: ["/api/targets"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({
        title: "삭제 완료",
        description: "훈련 대상자가 삭제되었습니다.",
      });
    },
  });

  const filteredTargets = targets.filter((target) => {
    const departments = parseDepartments(target.department);
    return (
      target.name.toLowerCase().includes(normalizedSearch) ||
      target.email.toLowerCase().includes(normalizedSearch) ||
      departments.some((dept) => dept.toLowerCase().includes(normalizedSearch))
    );
  });

  const isAllSelected =
    filteredTargets.length > 0 &&
    filteredTargets.every((target) => selectedTargets.includes(target.id));

  const selectAllState: boolean | "indeterminate" =
    selectedTargets.length === 0
      ? false
      : isAllSelected
      ? true
      : "indeterminate";

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTargets(filteredTargets.map(t => t.id));
    } else {
      setSelectedTargets([]);
    }
  };

  const handleSelectTarget = (targetId: string, checked: boolean) => {
    setSelectedTargets((prev) => {
      if (checked) {
        if (prev.includes(targetId)) {
          return prev;
        }
        return [...prev, targetId];
      }
      return prev.filter((id) => id !== targetId);
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/admin/training-targets/template.xlsx", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("샘플 템플릿을 다운로드할 수 없습니다.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "training_targets_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "다운로드 실패",
        description: error instanceof Error ? error.message : "샘플 템플릿을 가져오지 못했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleExcelButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast({
        title: "지원하지 않는 형식",
        description: "엑셀(.xlsx) 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    setIsImporting(true);
    try {
      const result = await importTrainingTargetsExcel(file);
      setImportResult(result);
      toast({
        title: "업로드 완료",
        description: `총 ${result.totalRows}건 중 ${result.successCount}건 성공`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "엑셀 업로드에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">훈련 대상 관리</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            data-testid="button-download-template"
          >
            <Download className="w-4 h-4 mr-2" />
            샘플 엑셀 다운로드
          </Button>
          <Button
            variant="outline"
            onClick={handleExcelButtonClick}
            disabled={isImporting}
            data-testid="button-upload-excel"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            엑셀 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleExcelUpload}
          />
          <Link href="/targets/new">
            <Button data-testid="button-add-target">
              <Plus className="w-4 h-4 mr-2" />
              대상자 추가
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름, 이메일, 소속으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {importResult && (
          <Card className="mb-4 border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>총 {importResult.totalRows}건 처리</span>
              <span className="text-emerald-700">성공 {importResult.successCount}건</span>
              <span className="text-destructive">실패 {importResult.failCount}건</span>
            </div>
            {importResult.failures.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-800">실패 항목</p>
                <div className="max-h-40 overflow-auto rounded-md border border-amber-200 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">행 번호</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>사유</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.failures.slice(0, 50).map((failure, index) => (
                        <TableRow key={`${failure.rowNumber}-${index}`}>
                          <TableCell>{failure.rowNumber}</TableCell>
                          <TableCell>{failure.email || "-"}</TableCell>
                          <TableCell>{failure.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {importResult.failCount > importResult.failures.length && (
                  <p className="text-xs text-muted-foreground">
                    최대 {importResult.failures.length}건까지만 표시됩니다.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {selectedTargets.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedTargets.length}명 선택됨
            </span>
            <Button variant="outline" size="sm" data-testid="button-add-to-group">
              그룹에 추가
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm(`${selectedTargets.length}명을 삭제하시겠습니까?`)) {
                  selectedTargets.forEach(id => deleteMutation.mutate(id));
                  setSelectedTargets([]);
                }
              }}
              data-testid="button-delete-selected"
            >
              선택 삭제
            </Button>
          </div>
        )}

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAllState}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>소속</TableHead>
                <TableHead>태그</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredTargets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    훈련 대상자가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredTargets.map((target) => {
                  const departments = parseDepartments(target.department);
                  return (
                    <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTargets.includes(target.id)}
                          onCheckedChange={(checked) => handleSelectTarget(target.id, Boolean(checked))}
                          data-testid={`checkbox-target-${target.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <SafeText value={target.name} fallback="-" />
                      </TableCell>
                      <TableCell>
                        <SafeText value={target.email} fallback="-" />
                      </TableCell>
                      <TableCell>
                        {departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {departments.map((dept) => (
                              <Badge key={`${target.id}-${dept}`} variant="outline" className="text-xs">
                                <SafeText value={dept} fallback="-" />
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {target.tags?.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <SafeText value={tag} fallback="-" />
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                <Badge
                  className={
                    target.status === "inactive"
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-green-500/20 text-green-400"
                  }
                >
                  {target.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                        <Link href={`/targets/${target.id}/edit`}>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${target.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(target.id)}
                            data-testid={`button-delete-${target.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
