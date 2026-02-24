"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, getQuarter } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { type Target, type Template, type TrainingPage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { listSmtpConfigs } from "@/lib/api";
import type { SmtpConfigSummary } from "@/types/smtp";
import {
  AlertCircle,
  ArrowLeftCircle,
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Clock,
  Loader2,
  MailCheck,
  Play,
  Save,
  X,
} from "lucide-react";

type PreviewTrendPoint = {
  label: string;
  metric: "count" | "rate";
  value: number;
};

type PreviewResponse = {
  targetCount: number;
  departmentBreakdown: { department: string; count: number }[];
  forecast: { openRate: number; clickRate: number; submitRate: number };
  trend: PreviewTrendPoint[];
  sampleTargets: { id: string; name: string; email: string; department: string; status: "예정" }[];
  conflicts: { projectId: string; projectName: string; status: string }[];
  generatedAt: string;
  cacheKey: string;
};

type TargetTreeNode = {
  id: string;
  label: string;
  targetIds: string[];
  children?: TargetTreeNode[];
};

const buildNodeId = (prefix: string, value: string) =>
  `${prefix}-${value.replace(/[^a-zA-Z0-9ㄱ-힣]/g, "-")}`;

type TargetSegmentDefinition = {
  id: string;
  label: string;
  matcher: (target: Target) => boolean;
};

const TARGET_SEGMENTS: TargetSegmentDefinition[] = [
  {
    id: "segment-new-hires",
    label: "신입 구성원",
    matcher: (target) => target.tags?.includes("신입") ?? false,
  },
  {
    id: "segment-education-needed",
    label: "교육 필요",
    matcher: (target) => target.tags?.includes("교육필요") ?? false,
  },
  {
    id: "segment-sales",
    label: "영업본부 전체",
    matcher: (target) => (target.department ?? "").includes("영업"),
  },
  {
    id: "segment-dev",
    label: "개발본부 전체",
    matcher: (target) => (target.department ?? "").includes("개발"),
  },
];

const projectFormSchema = z
  .object({
    name: z.string().min(1, "프로젝트명을 입력하세요."),
    description: z.string().optional(),
    templateId: z.string().min(1, "템플릿을 선택하세요."),
    trainingPageId: z.string().min(1, "랜딩 페이지를 선택하세요."),
    sendingDomain: z.string().min(1, "발신 도메인 (SMTP)을 입력하세요."),
    fromName: z.string().min(1, "발신자 이름을 입력하세요."),
    fromEmail: z.string().email("올바른 이메일 주소를 입력하세요."),
    startDate: z.date({
      required_error: "시작일을 선택하세요.",
    }),
    endDate: z.date().optional(),
    targetIds: z.array(z.string()).min(1, "대상을 선택하세요."),
    allowDuplicateTargets: z.boolean().default(false),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: "종료일은 시작일 이후여야 합니다.",
      path: ["endDate"],
    },
  );

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const DEFAULT_VALUES: ProjectFormValues = {
  name: "",
  description: "",
  templateId: "",
  trainingPageId: "",
  sendingDomain: "",
  fromName: "",
  fromEmail: "",
  startDate: new Date(),
  endDate: undefined,
  targetIds: [],
  allowDuplicateTargets: false,
};

const extractDomainFromEmail = (value?: string | null) => {
  if (!value) return "";
  const parts = value.split("@");
  if (parts.length < 2) return "";
  return parts[1].trim().toLowerCase();
};

const flattenErrorMessages = (errors: Record<string, unknown>): string[] => {
  const messages: string[] = [];
  Object.values(errors).forEach((entry) => {
    if (!entry) return;
    if (Array.isArray(entry)) {
      entry.forEach((item) => {
        if (typeof item === "string") {
          messages.push(item);
        } else if (typeof item === "object" && item !== null) {
          messages.push(...flattenErrorMessages(item as Record<string, unknown>));
        }
      });
      return;
    }
    if (typeof entry === "object") {
      const typed = entry as { message?: string };
      if (typed.message) {
        messages.push(typed.message);
      } else {
        messages.push(...flattenErrorMessages(entry as Record<string, unknown>));
      }
    }
  });
  return messages;
};

const asIsoString = (value: Date | undefined) => (value ? value.toISOString() : undefined);

const splitDepartmentTags = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const collectDepartmentTagsFromSelectedTargets = (
  targetIds: string[],
  targetMap: Map<string, Target>,
): string[] => {
  const departmentSet = new Set<string>();
  targetIds.forEach((targetId) => {
    const target = targetMap.get(targetId);
    if (!target) return;
    splitDepartmentTags(target.department).forEach((department) => {
      departmentSet.add(department);
    });
  });
  return Array.from(departmentSet).sort((a, b) => a.localeCompare(b, "ko"));
};

type PreviewRequestBody = {
  targetIds: string[];
  startDate?: string;
  endDate?: string;
  templateId?: string;
  sendingDomain?: string;
};

type PreviewRequest = {
  projectId: string;
  body: PreviewRequestBody;
};

const buildPreviewRequest = (
  projectId: string,
  targetIds: string[],
  startDate?: Date,
  endDate?: Date,
  templateId?: string,
  sendingDomain?: string,
): PreviewRequest | null => {
  if (targetIds.length === 0) return null;
  const payload: PreviewRequestBody = {
    targetIds: [...targetIds],
  };
  if (startDate instanceof Date && !Number.isNaN(startDate.getTime())) {
    payload.startDate = startDate.toISOString();
  }
  if (endDate instanceof Date && !Number.isNaN(endDate.getTime())) {
    payload.endDate = endDate.toISOString();
  }
  if (templateId) {
    payload.templateId = templateId;
  }
  if (sendingDomain) {
    payload.sendingDomain = sendingDomain;
  }
  return {
    projectId,
    body: payload,
  };
};

type CreateProjectRequest = {
  name: string;
  description: string | null;
  department: string | null;
  departmentTags: string[];
  templateId: string;
  trainingPageId: string;
  sendingDomain: string;
  fromName: string;
  fromEmail: string;
  startDate: string;
  endDate: string;
  status: string;
  targetCount: number;
  targetIds: string[];
};

export default function ProjectCreate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const [isTestDialogOpen, setTestDialogOpen] = useState(false);
  const [isConflictDialogOpen, setConflictDialogOpen] = useState(false);
  const lastConflictSignatureRef = useRef("");
  const [testRecipient, setTestRecipient] = useState("");
  const [targetSearchTerm, setTargetSearchTerm] = useState("");
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  const [trainingPagePopoverOpen, setTrainingPagePopoverOpen] = useState(false);
  const [domainPopoverOpen, setDomainPopoverOpen] = useState(false);
  const [startDatePopoverOpen, setStartDatePopoverOpen] = useState(false);
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const [tempProjectId, setTempProjectId] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    mode: "onChange",
    defaultValues: DEFAULT_VALUES,
  });

  const { data: targets = [], isLoading: isTargetsLoading } = useQuery<Target[]>({
    queryKey: ["/api/targets"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: trainingPages = [] } = useQuery<TrainingPage[]>({
    queryKey: ["/api/training-pages"],
  });

  const { data: smtpConfigs = [] } = useQuery<SmtpConfigSummary[]>({
    queryKey: ["smtp-configs"],
    queryFn: listSmtpConfigs,
  });

  const selectedTargetIds = form.watch("targetIds") ?? [];
  const selectedTargetCount = selectedTargetIds.length;
  const templateId = form.watch("templateId");
  const trainingPageId = form.watch("trainingPageId");
  const sendingDomain = form.watch("sendingDomain");
  const fromNameValue = form.watch("fromName");
  const fromEmailValue = form.watch("fromEmail");
  const projectName = form.watch("name");
  const startDateValue = form.watch("startDate");
  const endDateValue = form.watch("endDate");

  const targetIdsSignature = useMemo(
    () => [...selectedTargetIds].sort().join("|"),
    [selectedTargetIds],
  );
  const stableTargetIds = useMemo(
    () => [...selectedTargetIds],
    [targetIdsSignature],
  );
  const startDateKey = startDateValue?.getTime() ?? null;
  const endDateKey = endDateValue?.getTime() ?? null;

  const allTargetIds = useMemo(() => targets.map((target) => target.id), [targets]);

  const smtpDomainOptions = useMemo(() => {
    type DomainOption = {
      value: string;
      label: string;
      securityMode: SmtpConfigSummary["securityMode"];
      isActive: boolean;
      updatedAt: string;
    };
    const domainMap = new Map<string, DomainOption>();

    smtpConfigs.forEach((config) => {
      const domainSet = new Set<string>();
      (config.allowedRecipientDomains ?? []).forEach((domain) => {
        const normalized = domain.trim().toLowerCase();
        if (normalized) domainSet.add(normalized);
      });
      if (domainSet.size === 0) {
        const fromDomain = extractDomainFromEmail(config.fromEmail);
        if (fromDomain) domainSet.add(fromDomain);
      }

      domainSet.forEach((domain) => {
        const existing = domainMap.get(domain);
        const candidate: DomainOption = {
          value: domain,
          label: domain,
          securityMode: config.securityMode,
          isActive: config.isActive,
          updatedAt: config.updatedAt ?? "",
        };
        if (!existing) {
          domainMap.set(domain, candidate);
          return;
        }
        const isBetter =
          (candidate.isActive && !existing.isActive) ||
          (candidate.isActive === existing.isActive &&
            candidate.updatedAt.localeCompare(existing.updatedAt) > 0);
        if (isBetter) {
          domainMap.set(domain, candidate);
        }
      });
    });

    return Array.from(domainMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [smtpConfigs]);
  const hasSmtpDomains = smtpDomainOptions.length > 0;
  const selectedDomainOption = useMemo(
    () => smtpDomainOptions.find((option) => option.value === sendingDomain) ?? null,
    [smtpDomainOptions, sendingDomain],
  );

  const targetLookup = useMemo(() => {
    const map = new Map<string, Target>();
    targets.forEach((target) => {
      map.set(target.id, target);
    });
    return map;
  }, [targets]);

  const segmentOptions = useMemo(
    () =>
      TARGET_SEGMENTS.map((segment) => {
        const targetIds = targets
          .filter((target) => segment.matcher(target))
          .map((target) => target.id);
        return {
          ...segment,
          targetIds,
        };
      }).filter((segment) => segment.targetIds.length > 0),
    [targets],
  );

  const targetTree = useMemo<TargetTreeNode[]>(() => {
    if (!targets.length) return [];

    const departmentMap = new Map<
      string,
      {
        targets: Set<string>;
        groups: Map<string, Set<string>>;
        individuals: Set<string>;
      }
    >();

    targets.forEach((target) => {
      const entries = target.department
        ? target.department
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : [];

      const normalizedEntries = entries.length > 0 ? entries : ["미지정"];

      normalizedEntries.forEach((entry) => {
        const match = entry.match(/^([^\s]+)(?:\s+(.*))?$/);
        const departmentName = match?.[1] ?? entry;
        const subgroup = match?.[2]?.trim() ?? "";

        let department = departmentMap.get(departmentName);
        if (!department) {
          department = {
            targets: new Set<string>(),
            groups: new Map<string, Set<string>>(),
            individuals: new Set<string>(),
          };
          departmentMap.set(departmentName, department);
        }

        department.targets.add(target.id);

        if (subgroup.length > 0) {
          const groupLabel = `${departmentName} ${subgroup}`;
          let groupSet = department.groups.get(groupLabel);
          if (!groupSet) {
            groupSet = new Set<string>();
            department.groups.set(groupLabel, groupSet);
          }
          groupSet.add(target.id);
        } else {
          department.individuals.add(target.id);
        }
      });
    });

    const sortedDepartments = Array.from(departmentMap.entries()).sort(([deptA], [deptB]) =>
      deptA.localeCompare(deptB, "ko"),
    );

    return sortedDepartments.map(([departmentName, data]) => {
      const children: TargetTreeNode[] = [];

      const sortedGroups = Array.from(data.groups.entries()).sort(([groupA], [groupB]) =>
        groupA.localeCompare(groupB, "ko"),
      );

      sortedGroups.forEach(([groupLabel, groupSet]) => {
        const groupChildren = Array.from(groupSet)
          .map((targetId) => targetLookup.get(targetId))
          .filter((target): target is Target => Boolean(target))
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
          .map((target) => ({
            id: buildNodeId("target", target.id),
            label: `${target.name} (${target.email})`,
            targetIds: [target.id],
          }));

        children.push({
          id: buildNodeId("group", `${departmentName}-${groupLabel}`),
          label: groupLabel,
          targetIds: Array.from(groupSet),
          children: groupChildren,
        });
      });

      const individualChildren = Array.from(data.individuals)
        .map((targetId) => targetLookup.get(targetId))
        .filter((target): target is Target => Boolean(target))
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map((target) => ({
          id: buildNodeId("target", `individual-${target.id}`),
          label: `${target.name} (${target.email})`,
          targetIds: [target.id],
        }));

      children.push(...individualChildren);

      return {
        id: buildNodeId("department", departmentName),
        label: departmentName,
        targetIds: Array.from(data.targets),
        children,
      };
    });
  }, [targets, targetLookup]);

  const targetSearchTermLower = targetSearchTerm.trim().toLowerCase();

  const filteredTree = useMemo(() => {
    if (!targetSearchTermLower) {
      return targetTree;
    }

    const filterNodes = (nodes: TargetTreeNode[]): TargetTreeNode[] => {
      const result: TargetTreeNode[] = [];
      nodes.forEach((node) => {
        const childFiltered = node.children ? filterNodes(node.children) : [];
        const nodeMatches = node.label.toLowerCase().includes(targetSearchTermLower);
        const memberMatches = node.targetIds.some((id) => {
          const target = targetLookup.get(id);
          if (!target) return false;
          const combined = `${target.name} ${target.email} ${target.department ?? ""}`.toLowerCase();
          return combined.includes(targetSearchTermLower);
        });

        if (nodeMatches || memberMatches || childFiltered.length > 0) {
          result.push({
            ...node,
            children: childFiltered.length > 0 ? childFiltered : undefined,
          });
        }
      });
      return result;
    };

    return filterNodes(targetTree);
  }, [targetLookup, targetTree, targetSearchTermLower]);

  const selectedTargetSet = useMemo(
    () => new Set<string>(selectedTargetIds),
    [selectedTargetIds],
  );

  const selectedTargetDetails = useMemo(
    () =>
      selectedTargetIds
        .map((id) => targetLookup.get(id))
        .filter((target): target is Target => Boolean(target)),
    [selectedTargetIds, targetLookup],
  );

  const applySelection = useCallback(
    (targetIds: string[], shouldSelect: boolean) => {
      const current = new Set(form.getValues("targetIds") ?? []);
      if (shouldSelect) {
        targetIds.forEach((id) => current.add(id));
      } else {
        targetIds.forEach((id) => current.delete(id));
      }
      form.setValue("targetIds", Array.from(current), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    },
    [form],
  );

  const handleToggleNode = useCallback(
    (node: TargetTreeNode) => {
      if (node.targetIds.length === 0) return;
      const current = new Set(form.getValues("targetIds") ?? []);
      const selectedCount = node.targetIds.reduce(
        (count, id) => count + (current.has(id) ? 1 : 0),
        0,
      );
      const shouldSelect = selectedCount !== node.targetIds.length;
      applySelection(node.targetIds, shouldSelect);
    },
    [applySelection, form],
  );

  const handleSelectAllTargets = useCallback(() => {
    if (!allTargetIds.length) return;
    form.setValue("targetIds", allTargetIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [allTargetIds, form]);

  const handleClearTargets = useCallback(() => {
    form.setValue("targetIds", [], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [form]);

  const handleApplySegment = useCallback(
    (segmentId: string) => {
      const segment = segmentOptions.find((option) => option.id === segmentId);
      if (!segment) return;
      const current = new Set(form.getValues("targetIds") ?? []);
      const allSelected = segment.targetIds.every((id) => current.has(id));
      applySelection(segment.targetIds, !allSelected);
    },
    [applySelection, form, segmentOptions],
  );

  const renderTreeNode = (node: TargetTreeNode, depth = 0): JSX.Element => {
    const total = node.targetIds.length;
    const selectedCount = node.targetIds.reduce(
      (count, id) => count + (selectedTargetSet.has(id) ? 1 : 0),
      0,
    );
    const isChecked = total > 0 && selectedCount === total;
    const isIndeterminate = selectedCount > 0 && selectedCount < total;

    const checkboxValue: boolean | "indeterminate" = isChecked
      ? true
      : isIndeterminate
        ? "indeterminate"
        : false;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className="flex items-start gap-2 rounded-md p-1 hover:bg-muted/40"
          style={{ paddingLeft: depth * 16 }}
        >
          <Checkbox
            id={node.id}
            checked={checkboxValue}
            onCheckedChange={() => handleToggleNode(node)}
          />
          <div className="flex flex-col">
            <label htmlFor={node.id} className="text-sm font-medium leading-none">
              {node.label}
            </label>
            <span className="text-xs text-muted-foreground">
              {node.targetIds.length.toLocaleString()}명
            </span>
          </div>
        </div>
        {node.children?.length ? (
          <div className="space-y-1">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const previewRequest = useMemo(
    () =>
      buildPreviewRequest(
        "new",
        stableTargetIds,
        startDateValue ?? undefined,
        endDateValue ?? undefined,
        templateId,
        sendingDomain,
      ),
    [stableTargetIds, startDateKey, endDateKey, templateId, sendingDomain],
  );

  const previewQuery = useQuery<PreviewResponse>({
    queryKey: ["projects-preview", previewRequest],
    enabled: Boolean(previewRequest),
    gcTime: 2 * 60 * 1000,
    staleTime: 0,
    queryFn: async () => {
      if (!previewRequest) {
        throw new Error("미리보기 요청 정보가 없습니다.");
      }
      const res = await fetch(`/api/projects/${previewRequest.projectId}/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(previewRequest.body),
      });
      if (!res.ok) {
        throw new Error("미리보기 데이터를 불러오지 못했습니다.");
      }
      return (await res.json()) as PreviewResponse;
    },
  });

  const previewData = previewQuery.data;
  const conflictItems = previewData?.conflicts ?? [];
  const hasConflicts = conflictItems.length > 0;
  const conflictSignature = useMemo(
    () =>
      conflictItems
        .map((conflict) => conflict.projectId)
        .sort()
        .join("|"),
    [conflictItems],
  );

  useEffect(() => {
    if (!conflictSignature) {
      lastConflictSignatureRef.current = "";
      setConflictDialogOpen(false);
      return;
    }
    if (conflictSignature !== lastConflictSignatureRef.current) {
      lastConflictSignatureRef.current = conflictSignature;
      setConflictDialogOpen(true);
    }
  }, [conflictSignature]);

  const isFormValid = form.formState.isValid;
  const formErrors = flattenErrorMessages(form.formState.errors as Record<string, unknown>);

  const projectQuarterBadge = useMemo(() => {
    if (!startDateValue) return null;
    const quarter = getQuarter(startDateValue);
    return `${format(startDateValue, "yyyy")} · Q${quarter}`;
  }, [startDateValue]);

  const isScheduleDisabled =
    !isFormValid ||
    !startDateValue ||
    startDateValue.getTime() <= Date.now();

  const testSendDisabled =
    !templateId ||
    !trainingPageId ||
    !sendingDomain ||
    !fromEmailValue ||
    !fromNameValue ||
    !projectName;

  const buildProjectPayload = useCallback(
    (values: ProjectFormValues, status: string): CreateProjectRequest => {
      const startDateIso = asIsoString(values.startDate) ?? new Date().toISOString();
      const fallbackEndDate = new Date(
        new Date(startDateIso).getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDateIso = asIsoString(values.endDate) ?? fallbackEndDate;
      const departmentTags = collectDepartmentTagsFromSelectedTargets(values.targetIds, targetLookup);

      return {
        name: values.name,
        description: values.description?.trim() || null,
        department: departmentTags[0] ?? null,
        departmentTags,
        templateId: values.templateId,
        trainingPageId: values.trainingPageId,
        sendingDomain: values.sendingDomain,
        fromName: values.fromName,
        fromEmail: values.fromEmail,
        startDate: startDateIso,
        endDate: endDateIso,
        status,
        targetCount: values.targetIds.length,
        targetIds: values.targetIds,
      };
    },
    [targetLookup],
  );

  const createMutation = useMutation({
    mutationFn: async ({
      payload,
    }: {
      payload: CreateProjectRequest;
    }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw {
          status: res.status,
          data,
        };
      }
      return data as { id: string };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "프로젝트 생성 완료",
        description: "프로젝트가 저장되었습니다.",
      });
      if (response?.id) {
        router.push(`/projects/${response.id}`);
      } else {
        router.push("/projects");
      }
    },
    onError: (error: unknown) => {
      let description = "프로젝트 생성 중 오류가 발생했습니다.";
      if (typeof error === "object" && error && "data" in error) {
        const payload = error as { status?: number; data?: any };
        if (payload.status === 422 && payload.data?.issues) {
          description = payload.data.issues.map((issue: { message: string }) => issue.message).join(", ");
        } else if (payload.data?.reason) {
          description = payload.data.reason;
        }
      }
      toast({
        title: "요청 실패",
        description,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateProjectRequest;
    }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw {
          status: res.status,
          data,
        };
      }
      return data as { id: string };
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "프로젝트 저장 완료",
        description: "프로젝트가 저장되었습니다.",
      });
      setTempProjectId(null);
      const projectId = response?.id ?? variables.id;
      if (projectId) {
        router.push(`/projects/${projectId}`);
      } else {
        router.push("/projects");
      }
    },
    onError: (error: unknown) => {
      let description = "프로젝트 저장 중 오류가 발생했습니다.";
      if (typeof error === "object" && error && "data" in error) {
        const payload = error as { status?: number; data?: any };
        if (payload.status === 422 && payload.data?.issues) {
          description = payload.data.issues.map((issue: { message: string }) => issue.message).join(", ");
        } else if (payload.data?.reason) {
          description = payload.data.reason;
        }
      }
      toast({
        title: "요청 실패",
        description,
        variant: "destructive",
      });
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async ({ recipient, projectId }: { recipient: string; projectId: string }) => {
      const values = form.getValues();
      const res = await fetch("/api/projects/test-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          templateId: values.templateId,
          sendingDomain: values.sendingDomain,
          fromEmail: values.fromEmail,
          fromName: values.fromName,
          recipient,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw {
          status: res.status,
          data,
        };
      }
      return data as {
        status: string;
        messageId: string;
        accepted: string[];
        rejected: string[];
        envelope: { from: string; to: string[] };
        response: string;
        previewUrl: string | null;
        processedAt: string;
      };
    },
    onSuccess: (result) => {
      const recipients = Array.isArray(result.envelope?.to)
        ? result.envelope.to.join(", ")
        : "";
      const accepted = result.accepted.length > 0 ? result.accepted.join(", ") : null;
      const rejected = result.rejected.length > 0 ? result.rejected.join(", ") : null;
      const details = [
        result.messageId ? `메시지 ID ${result.messageId}` : null,
        recipients ? `수신자 ${recipients}` : null,
        accepted ? `인증 성공 ${accepted}` : null,
        rejected ? `거부 ${rejected}` : null,
        result.previewUrl ? `미리보기 ${result.previewUrl}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      toast({
        title: "테스트 메일 발송 완료",
        description: details || result.response || "SMTP 서버가 발송 결과를 반환했습니다.",
      });
      setTestDialogOpen(false);
      setTestRecipient("");
    },
    onError: (error: unknown) => {
      let description = "테스트 메일 발송에 실패했습니다.";
      if (typeof error === "object" && error && "data" in error) {
        const payload = error as { status?: number; data?: any };
        if (payload.data?.reason) {
          description = payload.data.reason;
        }
      }
      toast({
        title: "요청 실패",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSubmitProject = useCallback(
    async (mode: "create" | "schedule" | "run") => {
      const values = form.getValues();
      const withValidation = await form.trigger();
      if (!withValidation) {
        toast({
          title: "입력값을 확인하세요",
          description: "필수 항목을 모두 채워야 합니다.",
          variant: "destructive",
        });
        return;
      }

      if (mode === "schedule") {
        const startDate = values.startDate;
        if (!startDate || Number.isNaN(startDate.getTime()) || startDate.getTime() <= Date.now()) {
          toast({
            title: "예약 시작일 확인",
            description: "예약 생성은 시작일을 현재 이후로 설정해야 합니다.",
            variant: "destructive",
          });
          return;
        }
      }

      const status = mode === "run" ? "진행중" : "예약";
      const payload = buildProjectPayload(values, status);

      if (tempProjectId) {
        updateMutation.mutate({ id: tempProjectId, payload });
        return;
      }

      createMutation.mutate({ payload });
    },
    [form, buildProjectPayload, createMutation, updateMutation, tempProjectId, toast],
  );

  const ensureTempProject = useCallback(async () => {
    const requiredFields: (keyof ProjectFormValues)[] = [
      "name",
      "templateId",
      "trainingPageId",
      "sendingDomain",
      "fromName",
      "fromEmail",
      "startDate",
      "endDate",
    ];
    const isValid = await form.trigger(requiredFields, { shouldFocus: true });
    if (!isValid) {
      toast({
        title: "입력값을 확인하세요",
        description: "임시 저장을 위해 필수 항목을 먼저 입력하세요.",
        variant: "destructive",
      });
      return null;
    }

    const values = form.getValues();
    const payload = buildProjectPayload(values, "임시");
    const baseHeaders = {
      "Content-Type": "application/json",
    };

    const resolveErrorMessage = (status: number, data: any) => {
      if (status === 422 && data?.issues) {
        return data.issues.map((issue: { message: string }) => issue.message).join(", ");
      }
      if (data?.reason) {
        return data.reason;
      }
      return "프로젝트 임시 저장에 실패했습니다.";
    };

    if (tempProjectId) {
      const res = await fetch(`/api/projects/${tempProjectId}`, {
        method: "PATCH",
        headers: baseHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        return tempProjectId;
      }
      if (res.status === 404) {
        setTempProjectId(null);
      }
      toast({
        title: "임시 저장 실패",
        description: resolveErrorMessage(res.status, data),
        variant: "destructive",
      });
      return null;
    }

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast({
        title: "임시 저장 실패",
        description: resolveErrorMessage(res.status, data),
        variant: "destructive",
      });
      return null;
    }

    const createdId = typeof data?.id === "string" ? data.id : null;
    if (createdId) {
      setTempProjectId(createdId);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    toast({
      title: "임시 저장 완료",
      description: "테스트 발송을 위한 프로젝트가 저장되었습니다.",
    });
    return createdId;
  }, [form, buildProjectPayload, tempProjectId, queryClient, toast]);

  const handleTestSend = useCallback(async () => {
    const recipient = testRecipient.trim();
    if (!recipient) {
      toast({
        title: "수신자 입력 필요",
        description: "테스트 메일 수신자를 입력하세요.",
        variant: "destructive",
      });
      return;
    }
    const projectId = await ensureTempProject();
    if (!projectId) {
      return;
    }
    testSendMutation.mutate({ recipient, projectId });
  }, [testRecipient, ensureTempProject, testSendMutation, toast]);

  const handleCancel = () => {
    router.push("/projects");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-2xl font-semibold">프로젝트 생성</h1>
            <p className="text-sm text-muted-foreground">
              좌측에서 정보를 입력하고 필요한 경우 충돌 경고를 확인하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={testSendDisabled}
              onClick={() => setTestDialogOpen(true)}
            >
              <MailCheck className="mr-2 h-4 w-4" />
              테스트 메일
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeftCircle className="mr-2 h-4 w-4" />
              취소
            </Button>
          </div>
        </div>
        {formErrors.length > 0 ? (
          <div className="border-t border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>확인 필요: {formErrors.join(", ")}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-6 p-6">
          <Form {...form}>
            <form className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          프로젝트명<span className="ml-1 text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="예: 2025년 Q2 전사 모의훈련" {...field} />
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
                          <Textarea
                            placeholder="훈련 목적과 간단한 설명을 입력하세요."
                            className="min-h-[96px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>대상 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="targetIds"
                    render={({ field: _field }) => {
                      const treeToRender = targetSearchTerm.trim().length > 0 ? filteredTree : targetTree;
                      return (
                        <FormItem>
                          <FormLabel>
                            훈련 대상자<span className="ml-1 text-destructive">*</span>
                          </FormLabel>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAllTargets}
                            >
                              전 직원 대상 훈련
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleClearTargets}
                              disabled={selectedTargetCount === 0}
                            >
                              선택 해제
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              현재 {selectedTargetCount.toLocaleString()}명 선택됨
                            </span>
                          </div>
                          {segmentOptions.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {segmentOptions.map((segment) => {
                                const allSelected = segment.targetIds.every((id) => selectedTargetSet.has(id));
                                return (
                                  <Button
                                    key={segment.id}
                                    type="button"
                                    size="sm"
                                    variant={allSelected ? "default" : "secondary"}
                                    onClick={() => handleApplySegment(segment.id)}
                                  >
                                    {segment.label}
                                  </Button>
                                );
                              })}
                            </div>
                          ) : null}
                          <div className="mt-3">
                            <Input
                              value={targetSearchTerm}
                              onChange={(event) => setTargetSearchTerm(event.target.value)}
                              placeholder="조직도, 팀, 이름 또는 이메일로 검색"
                              data-testid="input-target-search"
                            />
                          </div>
                          <ScrollArea className="mt-3 max-h-72 rounded-md border">
                            <div className="space-y-1 p-2">
                              {treeToRender.length ? (
                                treeToRender.map((node) => renderTreeNode(node))
                              ) : (
                                <p className="text-xs text-muted-foreground">검색 결과가 없습니다.</p>
                              )}
                            </div>
                          </ScrollArea>
                          {selectedTargetCount > 0 ? (
                            <div className="mt-3 rounded-md border bg-muted/40 p-3">
                              <p className="text-xs font-semibold text-muted-foreground">
                                선택한 구성원 ({selectedTargetCount.toLocaleString()}명)
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedTargetDetails.slice(0, 12).map((target) => (
                                  <Badge
                                    key={target.id}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    {target.name}
                                    <button
                                      type="button"
                                      aria-label={`${target.name} 제외`}
                                      className="rounded-full p-0.5 hover:bg-muted"
                                      onClick={() => applySelection([target.id], false)}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                                {selectedTargetCount > 12 ? (
                                  <Badge variant="outline">+{selectedTargetCount - 12}명</Badge>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="allowDuplicateTargets"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <FormLabel className="text-sm">동시 진행 프로젝트 중복 허용</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            충돌이 감지된 대상자를 자동으로 제외하지 않습니다.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>템플릿 · 도메인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          이메일 템플릿<span className="ml-1 text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Popover
                            open={templatePopoverOpen}
                            onOpenChange={setTemplatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value
                                  ? templates.find((template) => template.id === field.value)?.name
                                  : "템플릿을 선택하세요"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[360px] p-0">
                              <Command>
                                <CommandInput placeholder="템플릿 검색" />
                                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {templates.map((template) => (
                                      <CommandItem
                                        key={template.id}
                                        value={template.id}
                                        onSelect={() => {
                                          field.onChange(template.id);
                                          setTemplatePopoverOpen(false);
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{template.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {template.subject}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trainingPageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          랜딩 페이지<span className="ml-1 text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Popover
                            open={trainingPagePopoverOpen}
                            onOpenChange={setTrainingPagePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value
                                  ? trainingPages.find((page) => page.id === field.value)?.name
                                  : "훈련 페이지를 선택하세요"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[360px] p-0">
                              <Command>
                                <CommandInput placeholder="랜딩 페이지 검색" />
                                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {trainingPages.map((page) => (
                                      <CommandItem
                                        key={page.id}
                                        value={page.id}
                                        onSelect={() => {
                                          field.onChange(page.id);
                                          setTrainingPagePopoverOpen(false);
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{page.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {page.description}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sendingDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          발신 도메인 (SMTP)<span className="ml-1 text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Popover
                            open={domainPopoverOpen}
                            onOpenChange={setDomainPopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? (
                                  <span className="flex items-center gap-2">
                                    <span>{field.value}</span>
                                    {selectedDomainOption ? (
                                      <Badge variant="outline" className="text-xs">
                                        {selectedDomainOption.securityMode}
                                      </Badge>
                                    ) : null}
                                  </span>
                                ) : (
                                  "발신 도메인 (SMTP)을 선택하세요"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-0">
                              <Command>
                                <CommandInput placeholder="발신 도메인 (SMTP) 검색" />
                                <CommandEmpty>
                                  {hasSmtpDomains
                                    ? "검색 결과가 없습니다."
                                    : "등록된 발신 도메인 (SMTP)이 없습니다."}
                                </CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {smtpDomainOptions.map((option) => (
                                      <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                          field.onChange(option.value);
                                          setDomainPopoverOpen(false);
                                        }}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{option.label}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {option.securityMode}
                                          </Badge>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fromName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            발신자 이름<span className="ml-1 text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="예: 정보보안팀" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            발신 이메일<span className="ml-1 text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="예: security@phishsense.dev" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>일정 · 운영</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>
                            시작일<span className="ml-1 text-destructive">*</span>
                          </FormLabel>
                          <Popover
                            open={startDatePopoverOpen}
                            onOpenChange={setStartDatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "yyyy-MM-dd") : "날짜 선택"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (!date) return;
                                  field.onChange(date);
                                  setStartDatePopoverOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {projectQuarterBadge ? (
                            <p className="text-xs text-muted-foreground">
                              <Badge variant="outline">{projectQuarterBadge}</Badge>
                            </p>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>종료일</FormLabel>
                          <Popover
                            open={endDatePopoverOpen}
                            onOpenChange={setEndDatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "yyyy-MM-dd") : "날짜 선택"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  if (date) {
                                    setEndDatePopoverOpen(false);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

            </form>
          </Form>

        </div>
      </div>

      <div className="sticky bottom-0 z-30 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {startDateValue ? (
              <span>
                {format(startDateValue, "yyyy-MM-dd")} 시작
                {endDateValue ? ` · ${format(endDateValue, "yyyy-MM-dd")} 종료` : ""}
              </span>
            ) : (
              <span>시작일을 현재 이후로 설정하면 예약 생성이 활성화됩니다.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button
              variant="secondary"
              disabled={!isFormValid}
              onClick={() => handleSubmitProject("create")}
            >
              <Save className="mr-2 h-4 w-4" />
              임시 저장
            </Button>
            <Button
              variant="default"
              disabled={isScheduleDisabled}
              onClick={() => handleSubmitProject("schedule")}
            >
              <Clock className="mr-2 h-4 w-4" />
              예약 생성
            </Button>
            <Button
              variant="default"
              className="bg-primary text-primary-foreground"
              disabled={!isFormValid}
              onClick={() => handleSubmitProject("run")}
            >
              <Play className="mr-2 h-4 w-4" />
              바로 생성
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isConflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="border-amber-200 bg-amber-50">
          <DialogHeader>
            <DialogTitle className="text-amber-700">중복 대상 충돌 감지</DialogTitle>
            <DialogDescription className="text-amber-700/80">
              다음 프로젝트와 일정이 겹칩니다. 제외하거나 일정을 조정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-amber-700">
            <ul className="space-y-1">
              {conflictItems.map((conflict) => (
                <li key={conflict.projectId} className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <Link href={`/projects/${conflict.projectId}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-0 text-amber-700 underline hover:text-amber-800"
                    >
                      {conflict.projectName}
                    </Button>
                  </Link>
                  <Badge variant="outline">{conflict.status}</Badge>
                </li>
              ))}
            </ul>
            {!hasConflicts ? (
              <p className="text-sm text-muted-foreground">현재 충돌이 없습니다.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>테스트 메일 발송</DialogTitle>
            <DialogDescription>
              입력한 주소로 즉시 발송하여 SPF/DKIM/DMARC 결과를 확인합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="테스트 수신자 이메일"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              실제 메일이 발송되지는 않으며, 시뮬레이션 결과만 반환됩니다.
            </p>
            <p className="text-xs text-muted-foreground">
              테스트 발송 전 현재 입력값으로 프로젝트가 임시 저장됩니다.
            </p>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleTestSend} disabled={testSendMutation.isPending}>
              {testSendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  발송 중
                </>
              ) : (
                <>
                  <MailCheck className="mr-2 h-4 w-4" />
                  발송
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
