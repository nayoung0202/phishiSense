"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Save, Plus, Star, X } from "lucide-react";
import { type Target } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCustomDepartments } from "@/hooks/useCustomDepartments";
import { CustomDepartmentManager } from "@/components/CustomDepartmentManager";
import { cn } from "@/lib/utils";

const targetFormSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요."),
  email: z.string().email("유효한 이메일을 입력하세요."),
  mainDepartment: z.string().min(1, "주 소속을 선택하세요."),
  additionalDepartments: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  status: z.enum(["active", "inactive"]),
});

type TargetFormValues = z.infer<typeof targetFormSchema>;

type DepartmentOption = {
  id: string;
  path: string[];
  label: string;
  searchText: string;
};

const defaultDepartmentSeeds: DepartmentOption[] = [
  {
    id: "전사본부 > 보안부 > 침해대응팀",
    path: ["전사본부", "보안부", "침해대응팀"],
    label: "전사본부 > 보안부 > 침해대응팀",
    searchText: "전사본부 보안부 침해대응팀",
  },
  {
    id: "전사본부 > 영업부 > 영업1팀",
    path: ["전사본부", "영업부", "영업1팀"],
    label: "전사본부 > 영업부 > 영업1팀",
    searchText: "전사본부 영업부 영업1팀",
  },
  {
    id: "전사본부 > 개발부 > 플랫폼팀",
    path: ["전사본부", "개발부", "플랫폼팀"],
    label: "전사본부 > 개발부 > 플랫폼팀",
    searchText: "전사본부 개발부 플랫폼팀",
  },
];

function normalizeStatus(status?: string | null): "active" | "inactive" {
  return status === "inactive" ? "inactive" : "active";
}

function splitDepartments(department?: string | null): string[] {
  if (!department) return [];
  return department
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseDepartmentEntry(entry: string): string[] {
  const trimmed = entry.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.includes(">")) {
    return trimmed
      .split(">")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  if (trimmed.includes("/")) {
    return trimmed
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  if (trimmed.includes(" - ")) {
    return trimmed
      .split(" - ")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  const spaceParts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (spaceParts.length >= 2) {
    return spaceParts;
  }
  return [trimmed];
}

function buildDepartmentOptions(targets: Target[]): DepartmentOption[] {
  const map = new Map<string, DepartmentOption>();

  const ensureOption = (path: string[]) => {
    const normalizedPath = path.map((part) => part.trim()).filter((part) => part.length > 0);
    if (normalizedPath.length === 0) return;
    const label = normalizedPath.join(" > ");
    if (map.has(label)) return;
    map.set(label, {
      id: label,
      path: normalizedPath,
      label,
      searchText: `${label} ${normalizedPath.join(" ")}`,
    });
  };

  targets.forEach((target) => {
    splitDepartments(target.department).forEach((entry) => {
      const path = parseDepartmentEntry(entry);
      ensureOption(path);
    });
  });

  if (map.size === 0) {
    defaultDepartmentSeeds.forEach((seed) => map.set(seed.id, seed));
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function findDepartmentOption(value: string, options: DepartmentOption[]): DepartmentOption {
  const lookup = options.find((option) => option.id === value || option.label === value);
  if (lookup) return lookup;
  const path = parseDepartmentEntry(value);
  const label = path.length > 0 ? path.join(" > ") : value;
  return {
    id: label,
    path: path.length > 0 ? path : [value],
    label,
    searchText: `${label} ${path.join(" ")}`,
  };
}

function normalizeTags(tags?: string[] | null): string[] {
  if (!tags || tags.length === 0) return [];
  return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

export default function TargetEdit({ targetId }: { targetId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { customDepartments, addCustomDepartment, removeCustomDepartment } = useCustomDepartments();
  const normalizedTargetId = targetId ?? "";
  const isNew = normalizedTargetId.length === 0;
  const [isMainOpen, setIsMainOpen] = useState(false);
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false);
  const [mainQuery, setMainQuery] = useState("");
  const [additionalQuery, setAdditionalQuery] = useState("");

  const { data: target } = useQuery<Target>({
    queryKey: ["/api/targets", normalizedTargetId],
    enabled: !isNew,
  });

  const { data: allTargets = [] } = useQuery<Target[]>({
    queryKey: ["/api/targets"],
  });

  const departmentOptions = useMemo(() => {
    const base = buildDepartmentOptions(allTargets);
    if (!customDepartments.length) {
      return base;
    }
    const map = new Map(base.map((option) => [option.id, option]));
    customDepartments.forEach((label) => {
      const option = findDepartmentOption(label, base);
      if (option.id.length > 0 && !map.has(option.id)) {
        map.set(option.id, option);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [allTargets, customDepartments]);

  const { main: initialMainDepartment, additional: initialAdditionalDepartments } = useMemo(() => {
    const entries = target ? splitDepartments(target.department) : [];
    const first = entries[0];
    const mainOption = first ? findDepartmentOption(first, departmentOptions) : null;
    const main = mainOption ? mainOption.id : "";
    const additionalSet = new Set<string>();
    entries.slice(1).forEach((entry) => {
      const option = findDepartmentOption(entry, departmentOptions);
      if (option.id !== main && option.id.length > 0) {
        additionalSet.add(option.id);
      }
    });
    return {
      main,
      additional: Array.from(additionalSet),
    };
  }, [target, departmentOptions]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    allTargets.forEach((t) => {
      t.tags?.forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed.length > 0) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allTargets]);

  const initialTags = useMemo(
    () => normalizeTags(target?.tags ?? null),
    [target],
  );

  const form = useForm<TargetFormValues>({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      name: "",
      email: "",
      mainDepartment: "",
      additionalDepartments: [],
      tags: [],
      status: "active",
    },
    values: target
      ? {
          name: target.name,
          email: target.email,
          mainDepartment: initialMainDepartment,
          additionalDepartments: initialAdditionalDepartments,
          tags: initialTags,
          status: normalizeStatus(target.status),
        }
      : undefined,
  });

  useEffect(() => {
    if (!isMainOpen) {
      setMainQuery("");
    }
  }, [isMainOpen]);

  useEffect(() => {
    if (!isAdditionalOpen) {
      setAdditionalQuery("");
    }
  }, [isAdditionalOpen]);

  const mainDepartmentValue = form.watch("mainDepartment");
  const additionalDepartmentValues = form.watch("additionalDepartments") ?? [];

  const selectedMainOption = mainDepartmentValue
    ? findDepartmentOption(mainDepartmentValue, departmentOptions)
    : null;

  const selectedDepartmentOptions = useMemo(() => {
    const ordered: string[] = [];
    if (mainDepartmentValue) {
      ordered.push(mainDepartmentValue);
    }
    additionalDepartmentValues.forEach((value) => {
      if (value && !ordered.includes(value)) {
        ordered.push(value);
      }
    });
    return ordered.map((value) => findDepartmentOption(value, departmentOptions));
  }, [mainDepartmentValue, additionalDepartmentValues, departmentOptions]);

  const mainCandidateOption =
    mainQuery.trim().length > 0 ? findDepartmentOption(mainQuery, departmentOptions) : null;
  const canAddMainDepartment =
    Boolean(
      mainCandidateOption &&
        mainCandidateOption.label.trim().length > 0 &&
        !departmentOptions.some((option) => option.id === mainCandidateOption.id),
    );

  const additionalCandidateOption =
    additionalQuery.trim().length > 0
      ? findDepartmentOption(additionalQuery, departmentOptions)
      : null;
  const canAddAdditionalDepartment =
    Boolean(
      additionalCandidateOption &&
        additionalCandidateOption.label.trim().length > 0 &&
        additionalCandidateOption.id !== mainDepartmentValue &&
        !additionalDepartmentValues.includes(additionalCandidateOption.id),
    );

  const handleSelectMain = (option: DepartmentOption) => {
    const previousMain = form.getValues("mainDepartment");
    const currentAdditional = form.getValues("additionalDepartments") ?? [];
    const withoutSelected = currentAdditional.filter((value) => value !== option.id);
    const nextAdditional =
      previousMain && previousMain.length > 0 && previousMain !== option.id
        ? Array.from(new Set([...withoutSelected, previousMain]))
        : withoutSelected;
    form.setValue("mainDepartment", option.id, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    form.setValue("additionalDepartments", nextAdditional, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setIsMainOpen(false);
  };

  const handleToggleAdditional = (option: DepartmentOption) => {
    const main = form.getValues("mainDepartment");
    if (option.id === main) return;
    const current = form.getValues("additionalDepartments") ?? [];
    const exists = current.includes(option.id);
    const next = exists
      ? current.filter((value) => value !== option.id)
      : [...current, option.id];
    form.setValue("additionalDepartments", next, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handlePromoteToMain = (value: string) => {
    const main = form.getValues("mainDepartment");
    if (value === main) return;
    const current = form.getValues("additionalDepartments") ?? [];
    const remaining = current.filter((item) => item !== value);
    const nextAdditional =
      main && main.length > 0 ? Array.from(new Set([...remaining, main])) : remaining;
    form.setValue("mainDepartment", value, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    form.setValue("additionalDepartments", nextAdditional, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleRemoveDepartment = (value: string) => {
    const main = form.getValues("mainDepartment");
    const current = form.getValues("additionalDepartments") ?? [];
    if (value === main) {
      if (current.length === 0) {
        form.setValue("mainDepartment", "", {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true,
        });
        return;
      }
      const [nextMain, ...rest] = current;
      form.setValue("mainDepartment", nextMain, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
      form.setValue("additionalDepartments", rest, {
        shouldDirty: true,
        shouldTouch: true,
      });
      return;
    }
    const next = current.filter((item) => item !== value);
    form.setValue("additionalDepartments", next, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleManualDepartmentAdd = (label: string) => {
    const option = findDepartmentOption(label, departmentOptions);
    addCustomDepartment(option.label);
    if (!form.getValues("mainDepartment")) {
      handleSelectMain(option);
    } else {
      const current = form.getValues("additionalDepartments") ?? [];
      if (!current.includes(option.id) && option.id !== form.getValues("mainDepartment")) {
        form.setValue("additionalDepartments", [...current, option.id], {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    }
    toast({
      title: "새 소속 추가",
      description: `"${option.label}" 소속을 추가했습니다.`,
    });
    return true;
  };

  const handleManualDepartmentRemove = (label: string) => {
    removeCustomDepartment(label);
    toast({
      title: "소속 제거",
      description: `"${label}" 소속을 목록에서 제거했습니다.`,
    });
  };

  const handleCreateDepartmentOption = (option: DepartmentOption, target: "main" | "additional") => {
    const normalizedLabel = option.label.trim();
    if (!normalizedLabel) return;
    addCustomDepartment(normalizedLabel);
    if (target === "main") {
      handleSelectMain(option);
      setMainQuery("");
    } else {
      handleToggleAdditional(option);
      setAdditionalQuery("");
      setIsAdditionalOpen(false);
    }
    toast({
      title: "새 소속 추가",
      description: `"${normalizedLabel}" 소속을 추가했습니다.`,
    });
  };

  const [tagDraft, setTagDraft] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (data: TargetFormValues) => {
      const departmentLabels = (() => {
        const labels: string[] = [];
        const seen = new Set<string>();
        const append = (value?: string | null) => {
          if (!value) return;
          const option = findDepartmentOption(value, departmentOptions);
          const label = option.label;
          if (label.length === 0 || seen.has(label)) return;
          seen.add(label);
          labels.push(label);
        };
        append(data.mainDepartment);
        (data.additionalDepartments ?? []).forEach((value) => append(value));
        return labels;
      })();

      const payload = {
        name: data.name,
        email: data.email,
        department: departmentLabels.length > 0 ? departmentLabels.join(", ") : null,
        tags: data.tags.length > 0 ? data.tags : null,
        status: data.status,
      };

      if (isNew) {
        return await apiRequest("POST", "/api/targets", payload);
      }
      return await apiRequest("PATCH", `/api/targets/${normalizedTargetId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({
        title: "저장 완료",
        description: "훈련 대상 정보가 저장되었습니다.",
      });
      router.push("/targets");
    },
  });

  const onSubmit = (data: TargetFormValues) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/targets">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-bold">
            {isNew ? "훈련 대상 생성" : "훈련 대상 수정"}
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
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 김보안" {...field} data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: security@company.com"
                      {...field}
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainDepartment"
              render={({ field }) => {
                const selectedLabel = selectedMainOption?.label ?? "";
                return (
                  <FormItem>
                    <FormLabel>주 소속</FormLabel>
                    <Popover open={isMainOpen} onOpenChange={setIsMainOpen}>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Input
                            readOnly
                            value={selectedLabel}
                            placeholder="주 소속을 선택하세요"
                            onFocus={() => setIsMainOpen(true)}
                            onClick={() => setIsMainOpen(true)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            data-testid="combobox-main-department"
                          />
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput
                            placeholder="소속을 검색하세요"
                            value={mainQuery}
                            onValueChange={setMainQuery}
                          />
                          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {departmentOptions.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  value={option.searchText}
                                  onSelect={() => handleSelectMain(option)}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="truncate text-sm">{option.label}</span>
                                  {field.value === option.id ? (
                                    <Badge variant="outline" className="text-xs">
                                      선택됨
                                  </Badge>
                                ) : null}
                              </CommandItem>
                            ))}
                            {canAddMainDepartment && mainCandidateOption ? (
                              <CommandItem
                                value={`create-${mainCandidateOption.label}`}
                                onSelect={() =>
                                  handleCreateDepartmentOption(mainCandidateOption, "main")
                                }
                                className="flex items-center gap-2 text-sm text-primary"
                              >
                                <Plus className="h-4 w-4" />
                                "{mainCandidateOption.label}" 소속 추가
                              </CommandItem>
                            ) : null}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="additionalDepartments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>추가 소속</FormLabel>
                  <div className="space-y-3">
                    <Popover open={isAdditionalOpen} onOpenChange={setIsAdditionalOpen}>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Input
                            readOnly
                            placeholder="소속을 검색/선택하세요 (여러 개)"
                            value=""
                            onFocus={() => setIsAdditionalOpen(true)}
                            onClick={() => setIsAdditionalOpen(true)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            data-testid="combobox-additional-department"
                          />
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput
                            placeholder="소속을 검색하세요"
                            value={additionalQuery}
                            onValueChange={setAdditionalQuery}
                          />
                          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {departmentOptions.map((option) => {
                                const isDisabled =
                                  option.id === mainDepartmentValue ||
                                  field.value.includes(option.id);
                                return (
                                  <CommandItem
                                    key={option.id}
                                    value={option.searchText}
                                    onSelect={() => handleToggleAdditional(option)}
                                    disabled={isDisabled}
                                    className={cn(
                                      "flex items-center justify-between gap-3 text-sm",
                                      isDisabled ? "opacity-50" : "",
                                    )}
                                  >
                                    <span className="truncate">{option.label}</span>
                                    {!isDisabled ? (
                                      <span className="text-xs text-muted-foreground">추가</span>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        선택됨
                                      </Badge>
                                    )}
                                  </CommandItem>
                                );
                              })}
                              {canAddAdditionalDepartment && additionalCandidateOption ? (
                                <CommandItem
                                  value={`create-${additionalCandidateOption.label}`}
                                  onSelect={() =>
                                    handleCreateDepartmentOption(
                                      additionalCandidateOption,
                                      "additional",
                                    )
                                  }
                                  className="flex items-center gap-2 text-sm text-primary"
                                >
                                  <Plus className="h-4 w-4" />
                                  "{additionalCandidateOption.label}" 소속 추가
                                </CommandItem>
                              ) : null}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {selectedDepartmentOptions.map((option) => {
                          const isMain = option.id === mainDepartmentValue;
                          return (
                            <div
                              key={`chip-${option.id}`}
                              className={cn(
                                "flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs transition",
                                isMain ? "border-primary/70 bg-primary/10" : "",
                              )}
                              data-testid={`chip-department-${option.id.replace(/[^0-9a-zA-Z가-힣_-]/g, "-")}`}
                            >
                              <span className="font-medium">[{option.label}]</span>
                              <button
                                type="button"
                                onClick={() => handlePromoteToMain(option.id)}
                                className={cn(
                                  "flex items-center text-muted-foreground transition hover:text-amber-400",
                                  isMain ? "text-amber-400" : "",
                                )}
                                aria-label={`${option.label}을 주 소속으로 지정`}
                                data-testid={`button-promote-${option.id.replace(/[^0-9a-zA-Z가-힣_-]/g, "-")}`}
                              >
                                <Star
                                  className="h-4 w-4"
                                  fill={isMain ? "currentColor" : "none"}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveDepartment(option.id)}
                                className="flex items-center text-muted-foreground transition hover:text-destructive"
                                aria-label={`${option.label} 소속 제거`}
                                data-testid={`button-remove-${option.id.replace(/[^0-9a-zA-Z가-힣_-]/g, "-")}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      총 {selectedDepartmentOptions.length}개 선택
                      {selectedMainOption ? `, 주 소속: ${selectedMainOption.label}` : ""}
                    </p>
                  </div>
                  {form.formState.errors.mainDepartment ? (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.mainDepartment.message}
                    </p>
                  ) : null}
                </FormItem>
              )}
            />

            <CustomDepartmentManager
              customDepartments={customDepartments}
              onAdd={handleManualDepartmentAdd}
              onRemove={handleManualDepartmentRemove}
              title="새 조직/팀 직접 추가"
              description="조직/팀 목록에 없다면 아래에서 직접 추가하세요. 추가 즉시 주 소속 또는 추가 소속으로 지정할 수 있습니다."
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                const selected = field.value ?? [];
                const options = Array.from(new Set([...tagOptions, ...selected]));

                const handleAddTag = () => {
                  const trimmed = tagDraft.trim();
                  if (trimmed.length === 0) return;
                  if (selected.includes(trimmed)) {
                    setTagDraft("");
                    return;
                  }
                  const next = [...selected, trimmed];
                  field.onChange(next);
                  setTagDraft("");
                };

                const handleRemoveTag = (tag: string) => {
                  const next = selected.filter((value) => value !== tag);
                  field.onChange(next);
                };

                return (
                  <FormItem>
                    <FormLabel>태그</FormLabel>
                    <div className="space-y-3">
                      {options.length > 0 ? (
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {options.map((tag) => {
                              const isSelected = selected.includes(tag);
                              const testId = tag.replace(/[^0-9a-zA-Z가-힣_-]/g, "-");
                              return (
                                <Button
                                  key={tag}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() =>
                                    isSelected
                                      ? handleRemoveTag(tag)
                                      : field.onChange([...selected, tag])
                                  }
                                  className={cn(
                                    "rounded-full px-3",
                                    isSelected ? "bg-primary/80 text-primary-foreground" : "",
                                  )}
                                  data-testid={`tag-option-${testId}`}
                                >
                                  {tag}
                                </Button>
                              );
                            })}
                          </div>
                        </FormControl>
                      ) : (
                        <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                          등록된 태그가 없습니다. 아래 입력창에서 새 태그를 추가하세요.
                        </div>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <FormControl>
                          <Input
                            placeholder="태그를 입력하고 추가 버튼을 누르세요."
                            value={tagDraft}
                            onChange={(event) => setTagDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddTag();
                              }
                            }}
                            data-testid="input-tags"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddTag}
                          data-testid="button-add-tag"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          태그 추가
                        </Button>
                      </div>
                      {selected.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selected.map((tag) => {
                            const testId = tag.replace(/[^0-9a-zA-Z가-힣_-]/g, "-");
                            return (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1"
                                data-testid={`badge-tag-${testId}`}
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="rounded-full p-0.5 text-muted-foreground transition hover:text-destructive"
                                  aria-label={`${tag} 태그 제거`}
                                  data-testid={`button-remove-tag-${testId}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={saveMutation.isPending || !mainDepartmentValue}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Link href="/targets">
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
