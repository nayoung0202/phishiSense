import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomDepartmentManagerProps = {
  title?: string;
  description?: string;
  customDepartments: string[];
  onAdd: (label: string) => boolean | void;
  onRemove?: (label: string) => void;
  className?: string;
};

export function CustomDepartmentManager({
  title = "새 조직/팀 추가",
  description = "조직이나 팀이 아직 없다면 직접 입력해 목록에 추가하세요. 추가된 소속은 모든 입력창에서 바로 선택할 수 있습니다.",
  customDepartments,
  onAdd,
  onRemove,
  className,
}: CustomDepartmentManagerProps) {
  const [organization, setOrganization] = useState("");
  const [team, setTeam] = useState("");
  const [error, setError] = useState<string | null>(null);

  const buildLabel = () => {
    const org = organization.trim();
    const t = team.trim();
    if (!org && !t) return "";
    if (org && t) return `${org} > ${t}`;
    return org || t;
  };

  const handleAdd = () => {
    const label = buildLabel();
    if (!label) {
      setError("조직명 또는 팀명을 입력해야 합니다.");
      return;
    }
    setError(null);
    const result = onAdd(label);
    if (result === false) {
      return;
    }
    setOrganization("");
    setTeam("");
  };

  return (
    <section
      className={cn("rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 space-y-4", className)}
    >
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="조직명 (예: 기획본부)"
          value={organization}
          onChange={(event) => {
            setOrganization(event.target.value);
            if (error) setError(null);
          }}
          aria-label="조직명"
        />
        <Input
          placeholder="팀/세부 조직 (선택)"
          value={team}
          onChange={(event) => {
            setTeam(event.target.value);
            if (error) setError(null);
          }}
          aria-label="팀명"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleAdd}>
          새 소속 추가
        </Button>
        <p className="text-sm text-muted-foreground">
          예: "기획본부 &gt; 전략팀" 또는 "보안실"
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">추가한 조직/팀</p>
        {customDepartments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customDepartments.map((department) => (
              <Badge
                key={department}
                variant="secondary"
                className="flex items-center gap-1"
                data-testid={`custom-department-${department.replace(/[^0-9a-zA-Z가-힣_-]/g, "-")}`}
              >
                {department}
                {onRemove ? (
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground transition hover:text-destructive"
                    aria-label={`${department} 제거`}
                    onClick={() => onRemove(department)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-border/60 bg-background/40 p-3 text-sm text-muted-foreground">
            아직 추가한 소속이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
