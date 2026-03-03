"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { getProjectDepartmentDisplay } from "@shared/projectDepartment";
import {
  getMissingReportCaptures,
  hasAllReportCaptures,
  reportCaptureFields,
  type ReportCaptureKey,
} from "@/lib/reportCaptures";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReportSettingItem = {
  id: string;
  name: string;
  companyName: string;
  approverName: string;
  approverTitle?: string;
  isDefault: boolean;
};

type ReportSettingsResponse = {
  items: ReportSettingItem[];
};

type ReportGenerateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onProjectUpdated?: (project: Project) => void;
  onGenerated?: () => void;
};

const EMPTY_CAPTURE_FILES: Record<ReportCaptureKey, File | null> = {
  capture_inbox: null,
  capture_email_body: null,
  capture_malicious_page: null,
  capture_training_page: null,
};

export function ReportGenerateDialog({
  open,
  onOpenChange,
  project,
  onProjectUpdated,
  onGenerated,
}: ReportGenerateDialogProps) {
  const { toast } = useToast();
  const [currentProject, setCurrentProject] = useState<Project | null>(project);
  const [captureFiles, setCaptureFiles] = useState<Record<ReportCaptureKey, File | null>>(EMPTY_CAPTURE_FILES);
  const [isCaptureUploading, setIsCaptureUploading] = useState(false);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [selectedReportSettingId, setSelectedReportSettingId] = useState("");

  const reportSettingsQuery = useQuery({
    queryKey: ["report-settings", "for-generate"] as const,
    queryFn: async () => {
      const response = await fetch("/api/reports/settings?page=1&pageSize=100");
      if (!response.ok) {
        throw new Error("보고서 설정 목록을 불러오지 못했습니다.");
      }
      return (await response.json()) as ReportSettingsResponse;
    },
    enabled: open,
  });

  const reportSettings = reportSettingsQuery.data?.items ?? [];
  const hasReportSettings = reportSettings.length > 0;

  useEffect(() => {
    setCurrentProject(project);
  }, [project]);

  useEffect(() => {
    if (!open) {
      setCaptureFiles(EMPTY_CAPTURE_FILES);
      return;
    }
    setCaptureFiles(EMPTY_CAPTURE_FILES);
  }, [open, project?.id]);

  useEffect(() => {
    if (!open) return;
    if (!hasReportSettings) {
      setSelectedReportSettingId("");
      return;
    }
    if (selectedReportSettingId && reportSettings.some((item) => item.id === selectedReportSettingId)) {
      return;
    }
    const defaultSetting = reportSettings.find((item) => item.isDefault) ?? reportSettings[0];
    setSelectedReportSettingId(defaultSetting?.id ?? "");
  }, [open, hasReportSettings, reportSettings, selectedReportSettingId]);

  const selectedSetting = useMemo(
    () => reportSettings.find((item) => item.id === selectedReportSettingId) ?? null,
    [reportSettings, selectedReportSettingId],
  );

  const handleCaptureFileChange =
    (key: ReportCaptureKey) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setCaptureFiles((prev) => ({ ...prev, [key]: file }));
    };

  const uploadReportCaptures = async () => {
    if (!currentProject || isCaptureUploading) return;
    const selected = reportCaptureFields.filter((field) => captureFiles[field.key]);
    if (selected.length === 0) {
      alert("업로드할 캡처 이미지가 없습니다.");
      return;
    }

    setIsCaptureUploading(true);
    try {
      const formData = new FormData();
      selected.forEach((field) => {
        const file = captureFiles[field.key];
        if (file) {
          formData.append(field.key, file);
        }
      });

      const res = await fetch(`/api/projects/${currentProject.id}/report-captures`, {
        method: "POST",
        body: formData,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "캡처 업로드에 실패했습니다.");
      }

      const updated = payload.project as Project | undefined;
      if (updated) {
        setCurrentProject(updated);
        onProjectUpdated?.(updated);
      }

      toast({
        title: "캡처 업로드 완료",
        description: Array.isArray(payload.uploaded)
          ? `${payload.uploaded.join(", ")} 업로드됨`
          : "캡처 이미지를 저장했습니다.",
      });
      setCaptureFiles(EMPTY_CAPTURE_FILES);
    } catch (error) {
      const message = error instanceof Error ? error.message : "캡처 업로드에 실패했습니다.";
      toast({
        title: "캡처 업로드 실패",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCaptureUploading(false);
    }
  };

  const generateReport = async () => {
    if (!currentProject || isReportGenerating) return;
    if (!selectedReportSettingId) return;
    if (!hasAllReportCaptures(currentProject)) {
      const missing = getMissingReportCaptures(currentProject).map((field) => field.label);
      alert(`보고서 캡처 이미지가 누락되었습니다: ${missing.join(", ")}`);
      return;
    }

    setIsReportGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProject.id,
          reportSettingId: selectedReportSettingId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "보고서 생성에 실패했습니다.");
      }

      const payload = (await res.json()) as { downloadUrl?: string };
      if (!payload.downloadUrl) {
        throw new Error("보고서 다운로드 주소를 찾지 못했습니다.");
      }

      window.location.href = payload.downloadUrl;
      toast({
        title: "보고서 생성 완료",
        description: "보고서를 다운로드합니다.",
      });
      onGenerated?.();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "보고서 생성에 실패했습니다.";
      toast({
        title: "보고서 생성 실패",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsReportGenerating(false);
    }
  };

  const canGenerate = hasReportSettings && Boolean(selectedReportSettingId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-2xl overflow-hidden p-0 sm:max-h-[90vh]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>프로젝트 보고서 미리보기</DialogTitle>
          <DialogDescription>보고서 설정을 선택하고 캡처 업로드 후 보고서를 생성하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-2">
          <div className="text-sm text-muted-foreground">
          {currentProject ? (
            <div className="space-y-2">
              <p>
                <span className="font-semibold">이름:</span> {currentProject.name}
              </p>
              <p>
                <span className="font-semibold">부서:</span> {getProjectDepartmentDisplay(currentProject)}
              </p>
              <p>
                <span className="font-semibold">일정:</span>{" "}
                {new Date(currentProject.startDate).toLocaleDateString("ko-KR")} ~{" "}
                {new Date(currentProject.endDate).toLocaleDateString("ko-KR")}
              </p>
              <p>{currentProject.description ?? "설명 없음"}</p>
            </div>
          ) : (
            <p>선택된 프로젝트가 없습니다.</p>
          )}
          </div>

        <div className="space-y-2 rounded-lg border border-muted p-3">
          <Label className="text-sm font-semibold">보고서 설정 선택</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedReportSettingId}
            onChange={(event) => setSelectedReportSettingId(event.target.value)}
            disabled={!hasReportSettings || reportSettingsQuery.isLoading}
          >
            {!hasReportSettings ? (
              <option value="">보고서 설정이 없습니다.</option>
            ) : (
              reportSettings.map((setting) => (
                <option key={setting.id} value={setting.id}>
                  {setting.name} ({setting.companyName}){setting.isDefault ? " · 기본" : ""}
                </option>
              ))
            )}
          </select>
          {!hasReportSettings ? (
            <p className="text-xs text-destructive">
              보고서 생성 전 보고서 관리에서 설정을 1개 이상 등록해야 합니다.
            </p>
          ) : selectedSetting ? (
            <p className="text-xs text-muted-foreground">
              선택 설정 승인자: {selectedSetting.approverName}
              {selectedSetting.approverTitle ? ` (${selectedSetting.approverTitle})` : ""}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-muted p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">보고서 캡처 업로드</p>
              <p className="text-xs text-muted-foreground">PNG/JPG, 5MB 이하 · 가로 16.5cm 고정(세로 비율 유지)</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={uploadReportCaptures}
              disabled={!currentProject || isCaptureUploading}
            >
              {isCaptureUploading ? "업로드 중..." : "캡처 업로드"}
            </Button>
          </div>
          <div className="space-y-3">
            {reportCaptureFields.map((field) => {
              const file = captureFiles[field.key];
              const uploaded = currentProject?.[field.projectField];
              const status = file ? `선택됨: ${file.name}` : uploaded ? "업로드 완료" : "미업로드";
              return (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleCaptureFileChange(field.key)}
                      disabled={!currentProject || isCaptureUploading}
                    />
                    <span className="text-xs text-muted-foreground">{status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">4개 캡처가 모두 업로드되어야 보고서 생성이 가능합니다.</p>
        </div>

        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button onClick={generateReport} disabled={!canGenerate || isReportGenerating}>
            {isReportGenerating ? "생성 중..." : "보고서 생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
