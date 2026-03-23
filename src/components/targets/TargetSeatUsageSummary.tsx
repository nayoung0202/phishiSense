import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

type SeatLimitedContext = {
  seatLimit?: number | null;
};

export type PlatformSeatContext = {
  platformProduct?: SeatLimitedContext | null;
  localEntitlement?: SeatLimitedContext | null;
};

type TargetSeatUsageSummaryProps = {
  usedSeats: number;
  seatLimit: number | null | undefined;
  isLoading?: boolean;
};

export const resolveDisplayedTargetSeatLimit = (
  context?: PlatformSeatContext | null,
) => context?.platformProduct?.seatLimit ?? context?.localEntitlement?.seatLimit ?? null;

export function TargetSeatUsageSummary({
  usedSeats,
  seatLimit,
  isLoading = false,
}: TargetSeatUsageSummaryProps) {
  const normalizedSeatLimit = typeof seatLimit === "number" ? seatLimit : null;
  const remainingSeats =
    normalizedSeatLimit === null ? null : Math.max(normalizedSeatLimit - usedSeats, 0);
  const usagePercent =
    normalizedSeatLimit === null || normalizedSeatLimit === 0
      ? null
      : Math.min(Math.round((usedSeats / normalizedSeatLimit) * 100), 100);

  const isNearLimit = usagePercent !== null && usagePercent >= 80;
  const isFull = remainingSeats === 0 && normalizedSeatLimit !== null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isFull
              ? "bg-destructive/10 text-destructive"
              : isNearLimit
                ? "bg-amber-500/10 text-amber-500"
                : "bg-primary/10 text-primary",
          )}
        >
          <Users className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-medium text-foreground">대상자 시트</p>
            {!isLoading && (
              <p className="text-sm tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{usedSeats}</span>
                {normalizedSeatLimit !== null && (
                  <span> / {normalizedSeatLimit}명</span>
                )}
                {normalizedSeatLimit === null && <span>명 등록</span>}
              </p>
            )}
          </div>

          {!isLoading && normalizedSeatLimit !== null && (
            <div className="mt-2.5">
              <Progress
                value={usagePercent ?? 0}
                className={cn(
                  "h-2",
                  isFull
                    ? "[&>div]:bg-destructive"
                    : isNearLimit
                      ? "[&>div]:bg-amber-500"
                      : "",
                )}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isFull
                  ? "시트를 모두 사용 중입니다"
                  : `${remainingSeats}명 추가 가능`}
              </p>
            </div>
          )}

          {isLoading && (
            <p className="mt-1 text-xs text-muted-foreground">
              시트 정보를 확인하고 있습니다...
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
