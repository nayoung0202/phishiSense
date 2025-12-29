import { StatCard } from '../StatCard';
import { Users } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="p-6 w-full max-w-sm">
      <StatCard
        title="전체 훈련 참여자"
        value="1,247"
        icon={Users}
        description="누적 참여자 수"
      />
    </div>
  );
}
