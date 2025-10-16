import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, BarChart3 } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "진행중" | "완료" | "예약";
  openRate: number;
  clickRate: number;
}

const statusConfig = {
  "진행중": { variant: "default" as const, className: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
  "완료": { variant: "default" as const, className: "bg-green-500/20 text-green-400 hover:bg-green-500/30" },
  "예약": { variant: "default" as const, className: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
};

export function ProjectCard({ id, name, startDate, endDate, status, openRate, clickRate }: ProjectCardProps) {
  return (
    <Card className="p-6 hover-elevate" data-testid={`card-project-${id}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-2 truncate" data-testid={`text-project-name-${id}`}>{name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{startDate} ~ {endDate}</span>
            </div>
          </div>
          <Badge className={statusConfig[status].className} data-testid={`badge-status-${id}`}>
            {status}
          </Badge>
        </div>
        
        <div className="flex items-center gap-6 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <div className="text-sm">
              <span className="text-muted-foreground">오픈률: </span>
              <span className="font-semibold text-primary" data-testid={`text-open-rate-${id}`}>{openRate}%</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">클릭률: </span>
            <span className="font-semibold text-primary" data-testid={`text-click-rate-${id}`}>{clickRate}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
