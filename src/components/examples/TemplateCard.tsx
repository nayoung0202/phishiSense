import { TemplateCard } from '../TemplateCard';

export default function TemplateCardExample() {
  return (
    <div className="p-6 w-full max-w-md">
      <TemplateCard
        id="1"
        title="배송 알림 템플릿"
        subject="[긴급] 배송 주소 확인 필요"
        lastModified="2시간 전"
      />
    </div>
  );
}
