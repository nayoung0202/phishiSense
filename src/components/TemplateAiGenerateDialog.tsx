"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  type TemplateAiCandidate,
  TEMPLATE_AI_DRAFT_SESSION_KEY,
  estimateTemplateAiCredits,
  resolveTemplateAiTopicText,
  templateAiDifficultyLabels,
  templateAiDifficultyOptions,
  templateAiToneLabels,
  templateAiToneOptions,
  templateAiTopicLabels,
  templateAiTopicOptions,
} from "@shared/templateAi";
import { extractBodyHtml } from "@/lib/html";
import { apiRequest } from "@/lib/queryClient";
import {
  neutralizePreviewModalHtml,
  TEMPLATE_PREVIEW_SANDBOX_CLASS,
} from "@/lib/templatePreview";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type GenerateResponse = {
  candidates: TemplateAiCandidate[];
  usage?: {
    estimatedCredits: number;
  };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DialogStep = "options" | "candidates";

const DEFAULT_TOPIC: (typeof templateAiTopicOptions)[number] = "shipping";
const DEFAULT_TONE: (typeof templateAiToneOptions)[number] = "informational";
const DEFAULT_DIFFICULTY: (typeof templateAiDifficultyOptions)[number] = "medium";

const previewSurfaceClass =
  "site-scrollbar max-h-[420px] overflow-y-auto rounded-md border border-slate-200 bg-white p-4 text-slate-900";

const getPreviewHtml = (html: string) => extractBodyHtml(neutralizePreviewModalHtml(html));

export function TemplateAiGenerateDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<DialogStep>("options");
  const [topic, setTopic] = useState<(typeof templateAiTopicOptions)[number]>(DEFAULT_TOPIC);
  const [customTopic, setCustomTopic] = useState("");
  const [tone, setTone] = useState<(typeof templateAiToneOptions)[number]>(DEFAULT_TONE);
  const [difficulty, setDifficulty] =
    useState<(typeof templateAiDifficultyOptions)[number]>(DEFAULT_DIFFICULTY);
  const [prompt, setPrompt] = useState("");
  const [candidates, setCandidates] = useState<TemplateAiCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [pairPage, setPairPage] = useState(0);
  const [focusedCandidate, setFocusedCandidate] = useState<TemplateAiCandidate | null>(null);

  const resolvedTopicText = useMemo(() => {
    const value = resolveTemplateAiTopicText({ topic, customTopic });
    return value || templateAiTopicLabels[topic];
  }, [customTopic, topic]);

  const requiresCustomTopic = topic === "other";
  const canGenerate = !requiresCustomTopic || customTopic.trim().length > 0;

  const estimatedCredits = useMemo(
    () =>
      estimateTemplateAiCredits({
        topic: resolvedTopicText,
        tone: templateAiToneLabels[tone],
        difficulty: templateAiDifficultyLabels[difficulty],
        prompt,
        candidateCount: 4,
      }),
    [difficulty, prompt, resolvedTopicText, tone],
  );

  const visibleCandidates = candidates.slice(pairPage * 2, pairPage * 2 + 2);
  const maxPairPage = Math.max(0, Math.ceil(candidates.length / 2) - 1);
  const selectedCandidate =
    candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;

  const resetDialogState = () => {
    setStep("options");
    setTopic(DEFAULT_TOPIC);
    setCustomTopic("");
    setTone(DEFAULT_TONE);
    setDifficulty(DEFAULT_DIFFICULTY);
    setPrompt("");
    setCandidates([]);
    setSelectedCandidateId(null);
    setPairPage(0);
    setFocusedCandidate(null);
  };

  useEffect(() => {
    if (!open) {
      resetDialogState();
    }
  }, [open]);

  const generateMutation = useMutation({
    mutationFn: async (preservedCandidates: TemplateAiCandidate[]) => {
      const response = await apiRequest("POST", "/api/templates/ai-generate", {
        topic,
        customTopic,
        tone,
        difficulty,
        prompt,
        generateCount: 4 - preservedCandidates.length,
        preservedCandidates: preservedCandidates.map((candidate) => ({
          id: candidate.id,
          subject: candidate.subject,
        })),
      });

      return (await response.json()) as GenerateResponse;
    },
    onSuccess: (response, preservedCandidates) => {
      const nextCandidates = [...preservedCandidates, ...response.candidates];
      setCandidates(nextCandidates);
      setSelectedCandidateId(preservedCandidates[0]?.id ?? null);
      setPairPage(0);
      setStep("candidates");
      setFocusedCandidate(null);
    },
  });

  const handleGenerate = () => {
    if (!canGenerate) return;
    setSelectedCandidateId(null);
    setFocusedCandidate(null);
    setPairPage(0);
    generateMutation.mutate([]);
  };

  const handleReturnToCandidates = () => {
    if (candidates.length === 0) return;
    setStep("candidates");
  };

  const handleBackToOptions = () => {
    setFocusedCandidate(null);
    setStep("options");
  };

  const handleRegenerateAll = () => {
    setSelectedCandidateId(null);
    setFocusedCandidate(null);
    generateMutation.mutate([]);
  };

  const handleRegenerate = () => {
    if (!selectedCandidate) return;
    setFocusedCandidate(null);
    generateMutation.mutate([selectedCandidate]);
  };

  const handleApply = () => {
    if (!selectedCandidate) return;

    sessionStorage.setItem(
      TEMPLATE_AI_DRAFT_SESSION_KEY,
      JSON.stringify({
        ...selectedCandidate,
        source: "ai",
        generatedAt: new Date().toISOString(),
      }),
    );

    onOpenChange(false);
    router.push("/templates/new?source=ai");
  };

  const renderError = () => {
    if (!generateMutation.error) return null;

    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        {generateMutation.error instanceof Error
          ? generateMutation.error.message
          : "AI 템플릿 생성 중 오류가 발생했습니다."}
      </div>
    );
  };

  const renderOptionsStep = () => (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <Card className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">1단계. 생성 조건 설정</h3>
          <p className="text-sm text-muted-foreground">
            생성 조건을 입력하고 템플릿을 생성합니다.
          </p>
        </div>

        <div className="space-y-2">
          <Label>주제</Label>
          <Select value={topic} onValueChange={(value) => setTopic(value as typeof topic)}>
            <SelectTrigger>
              <SelectValue placeholder="주제를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {templateAiTopicOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {templateAiTopicLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {requiresCustomTopic ? (
          <div className="space-y-2">
            <Label htmlFor="template-ai-custom-topic">주제 직접 입력</Label>
            <Input
              id="template-ai-custom-topic"
              aria-label="주제 직접 입력"
              value={customTopic}
              onChange={(event) => setCustomTopic(event.target.value)}
              placeholder="예: 사내 행사 안내, 정산 마감 안내"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              기존 목록에 없는 시나리오를 만들고 싶을 때 직접 입력해 주세요.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>문체</Label>
          <Select value={tone} onValueChange={(value) => setTone(value as typeof tone)}>
            <SelectTrigger>
              <SelectValue placeholder="문체를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {templateAiToneOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {templateAiToneLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>구분 난이도</Label>
          <Select
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as typeof difficulty)}
          >
            <SelectTrigger>
              <SelectValue placeholder="구분 난이도를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {templateAiDifficultyOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {templateAiDifficultyLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>추가 요청사항</Label>
          <Textarea
            aria-label="추가 요청사항"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="원하는 분위기, 대상자 특성, 추가 요구사항을 입력해 주세요."
            className="min-h-[180px]"
            maxLength={800}
          />
          <p className="text-xs text-muted-foreground">{prompt.length}/800자</p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <div>
            <p className="text-sm font-medium">예상 AI 크레딧 소모</p>
            <p className="mt-1 text-3xl font-semibold">{estimatedCredits} 크레딧</p>
          </div>
          <p className="text-xs text-muted-foreground">
            실제 소모량은 생성 결과 길이에 따라 달라질 수 있습니다.
          </p>
        </Card>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          AI가 생성한 내용은 초안입니다. 템플릿 작성 화면에서 미리보기와 내용을 반드시
          검토한 뒤 반영해 주세요.
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleGenerate} disabled={generateMutation.isPending || !canGenerate}>
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            템플릿 생성
          </Button>
          {requiresCustomTopic && !canGenerate ? (
            <p className="text-xs text-destructive">기타를 선택한 경우 주제를 직접 입력해 주세요.</p>
          ) : null}
          {candidates.length > 0 ? (
            <Button
              variant="outline"
              onClick={handleReturnToCandidates}
              disabled={generateMutation.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              후보 비교로 돌아가기
            </Button>
          ) : null}
        </div>

        {renderError()}
      </div>
    </div>
  );

  const renderCandidatesStep = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">2단계. 후보 비교 및 선택</h3>
          <p className="text-sm text-muted-foreground">
            후보 4개를 비교하고 하나를 선택해 현재 템플릿 작성 화면에 반영합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleBackToOptions} disabled={generateMutation.isPending}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            옵션 다시 설정
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerateAll}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            전체 재생성
          </Button>
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={generateMutation.isPending || !selectedCandidate}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            선택 제외 나머지 재생성
          </Button>
          <Button
            variant="secondary"
            onClick={handleApply}
            disabled={!selectedCandidate || generateMutation.isPending}
          >
            선택한 후보 반영
          </Button>
        </div>
      </div>

      {renderError()}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {candidates.length === 0 ? "후보가 없습니다." : `${pairPage + 1} / ${maxPairPage + 1}`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPairPage((current) => Math.max(0, current - 1))}
            disabled={pairPage === 0}
          >
            이전 2개
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPairPage((current) => Math.min(maxPairPage, current + 1))}
            disabled={pairPage >= maxPairPage}
          >
            다음 2개
          </Button>
        </div>
      </div>

      {visibleCandidates.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          생성된 후보가 없습니다. 옵션을 다시 설정하고 새 템플릿을 생성해 주세요.
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleCandidates.map((candidate) => {
            const isSelected = candidate.id === selectedCandidateId;
            const mailPreviewHtml = getPreviewHtml(candidate.body);
            const maliciousPreviewHtml = getPreviewHtml(candidate.maliciousPageContent);

            return (
              <Card
                key={candidate.id}
                className={cn("space-y-4 p-4", isSelected && "ring-2 ring-primary")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{candidate.subject}</p>
                    <p className="text-sm text-muted-foreground">{candidate.summary}</p>
                  </div>
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    {isSelected ? "선택됨" : "이 후보 선택"}
                  </Button>
                </div>

                <Tabs defaultValue="body" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="body">메일본문</TabsTrigger>
                    <TabsTrigger value="malicious">악성메일본문</TabsTrigger>
                  </TabsList>
                  <TabsContent value="body" className="space-y-3">
                    <div className={previewSurfaceClass}>
                      <div
                        className={TEMPLATE_PREVIEW_SANDBOX_CLASS}
                        dangerouslySetInnerHTML={{ __html: mailPreviewHtml }}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="malicious" className="space-y-3">
                    <div className={previewSurfaceClass}>
                      <div
                        className={TEMPLATE_PREVIEW_SANDBOX_CLASS}
                        dangerouslySetInnerHTML={{ __html: maliciousPreviewHtml }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setFocusedCandidate(candidate)}>
                    <Eye className="mr-2 h-4 w-4" />
                    크게 보기
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={step === "options" ? "max-w-3xl" : "max-w-6xl"}>
          <DialogHeader>
            <DialogTitle>AI 템플릿 생성</DialogTitle>
            <DialogDescription>
              {step === "options"
                ? "생성 조건을 입력하고 템플릿을 생성합니다."
                : "후보를 비교하고 하나를 선택해 템플릿 작성 화면에 반영합니다."}
            </DialogDescription>
          </DialogHeader>

          {step === "options" ? renderOptionsStep() : renderCandidatesStep()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(focusedCandidate)}
        onOpenChange={(nextOpen) => !nextOpen && setFocusedCandidate(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{focusedCandidate?.subject ?? "후보 미리보기"}</DialogTitle>
            <DialogDescription>{focusedCandidate?.summary ?? ""}</DialogDescription>
          </DialogHeader>
          {focusedCandidate ? (
            <Tabs defaultValue="body" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="body">메일본문</TabsTrigger>
                <TabsTrigger value="malicious">악성메일본문</TabsTrigger>
              </TabsList>
              <TabsContent value="body">
                <div className={cn(previewSurfaceClass, "max-h-[70vh]")}>
                  <div
                    className={TEMPLATE_PREVIEW_SANDBOX_CLASS}
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml(focusedCandidate.body) }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="malicious">
                <div className={cn(previewSurfaceClass, "max-h-[70vh]")}>
                  <div
                    className={TEMPLATE_PREVIEW_SANDBOX_CLASS}
                    dangerouslySetInnerHTML={{
                      __html: getPreviewHtml(focusedCandidate.maliciousPageContent),
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
