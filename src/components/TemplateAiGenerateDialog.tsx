"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Eye, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  type TemplateAiCandidate,
  TEMPLATE_AI_DRAFT_SESSION_KEY,
  estimateTemplateAiCredits,
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

const previewSurfaceClass =
  "site-scrollbar max-h-[420px] overflow-y-auto rounded-md border border-slate-200 bg-white p-4 text-slate-900";

export function TemplateAiGenerateDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [topic, setTopic] = useState<(typeof templateAiTopicOptions)[number]>("shipping");
  const [tone, setTone] = useState<(typeof templateAiToneOptions)[number]>("informational");
  const [difficulty, setDifficulty] =
    useState<(typeof templateAiDifficultyOptions)[number]>("medium");
  const [prompt, setPrompt] = useState("");
  const [candidates, setCandidates] = useState<TemplateAiCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [pairPage, setPairPage] = useState(0);
  const [focusedCandidate, setFocusedCandidate] = useState<TemplateAiCandidate | null>(null);

  const estimatedCredits = useMemo(
    () =>
      estimateTemplateAiCredits({
        topic,
        tone,
        difficulty,
        prompt,
        candidateCount: Math.max(1, 4 - (selectedCandidateId ? 1 : 0)),
      }),
    [difficulty, prompt, selectedCandidateId, tone, topic],
  );

  const visibleCandidates = candidates.slice(pairPage * 2, pairPage * 2 + 2);
  const maxPairPage = Math.max(0, Math.ceil(candidates.length / 2) - 1);
  const selectedCandidate =
    candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;

  const generateMutation = useMutation({
    mutationFn: async (preservedCandidates: TemplateAiCandidate[]) => {
      const response = await apiRequest("POST", "/api/templates/ai-generate", {
        topic,
        tone,
        difficulty,
        prompt,
        generateCount: 4 - preservedCandidates.length,
        preservedCandidates: preservedCandidates.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
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
    },
  });

  const handleGenerate = () => {
    setSelectedCandidateId(null);
    generateMutation.mutate([]);
  };

  const handleRegenerate = () => {
    if (!selectedCandidate) return;
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

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setFocusedCandidate(null);
      setPairPage(0);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>AI Template Generator</DialogTitle>
            <DialogDescription>
              Each candidate is generated as a paired mail body and malicious page. Only one selected candidate is applied to the new template editor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select value={topic} onValueChange={(value) => setTopic(value as typeof topic)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
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

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(value) => setTone(value as typeof tone)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
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
                <Label>Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as typeof difficulty)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
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
                <Label>Additional Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Describe the mood, target audience, and extra details."
                  className="min-h-[160px]"
                  maxLength={800}
                />
                <p className="text-xs text-muted-foreground">{prompt.length}/800 chars</p>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Estimated AI Credits</p>
                <p className="mt-1 text-2xl font-semibold">{estimatedCredits} credits</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Actual usage may vary depending on the generated result length.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate 4 candidates
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={generateMutation.isPending || !selectedCandidate}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate unselected candidates
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleApply}
                  disabled={!selectedCandidate || generateMutation.isPending}
                >
                  Apply selected candidate
                </Button>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                AI output is a draft. Review the preview and content before saving it as a real template.
              </div>

              {generateMutation.error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : "Failed to generate AI templates."}
                </div>
              ) : null}
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Candidate Comparison</h3>
                  <p className="text-sm text-muted-foreground">
                    Each candidate set contains a mail body and a malicious page.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPairPage((current) => Math.max(0, current - 1))}
                    disabled={pairPage === 0}
                  >
                    Prev 2
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {candidates.length === 0 ? "0/0" : `${pairPage + 1}/${maxPairPage + 1}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPairPage((current) => Math.min(maxPairPage, current + 1))}
                    disabled={pairPage >= maxPairPage}
                  >
                    Next 2
                  </Button>
                </div>
              </div>

              {visibleCandidates.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Fill in the conditions and generate candidates.
                </Card>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {visibleCandidates.map((candidate) => {
                    const isSelected = candidate.id === selectedCandidateId;
                    const mailPreviewHtml = extractBodyHtml(
                      neutralizePreviewModalHtml(candidate.body),
                    );
                    const maliciousPreviewHtml = extractBodyHtml(
                      neutralizePreviewModalHtml(candidate.maliciousPageContent),
                    );

                    return (
                      <Card
                        key={candidate.id}
                        className={cn("space-y-4 p-4", isSelected && "ring-2 ring-primary")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold">{candidate.name}</p>
                            <p className="text-sm text-muted-foreground">{candidate.summary}</p>
                          </div>
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCandidateId(candidate.id)}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        </div>

                        <div className="rounded-md border bg-muted/20 p-3">
                          <p className="text-xs text-muted-foreground">Mail Subject</p>
                          <p className="mt-1 text-sm font-medium">{candidate.subject}</p>
                        </div>

                        <Tabs defaultValue="body" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="body">Mail Body</TabsTrigger>
                            <TabsTrigger value="malicious">Malicious Page</TabsTrigger>
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
                            Expand
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(focusedCandidate)}
        onOpenChange={(nextOpen) => !nextOpen && setFocusedCandidate(null)}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{focusedCandidate?.name ?? "Candidate Preview"}</DialogTitle>
            <DialogDescription>{focusedCandidate?.summary ?? ""}</DialogDescription>
          </DialogHeader>
          {focusedCandidate ? (
            <Tabs defaultValue="body" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="body">Mail Body</TabsTrigger>
                <TabsTrigger value="malicious">Malicious Page</TabsTrigger>
              </TabsList>
              <TabsContent value="body">
                <div className={cn(previewSurfaceClass, "max-h-[70vh]")}>
                  <div
                    className={TEMPLATE_PREVIEW_SANDBOX_CLASS}
                    dangerouslySetInnerHTML={{
                      __html: extractBodyHtml(neutralizePreviewModalHtml(focusedCandidate.body)),
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="malicious">
                <div className={cn(previewSurfaceClass, "max-h-[70vh]")}>
                  <div
                    className={TEMPLATE_PREVIEW_SANDBOX_CLASS}
                    dangerouslySetInnerHTML={{
                      __html: extractBodyHtml(
                        neutralizePreviewModalHtml(focusedCandidate.maliciousPageContent),
                      ),
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
