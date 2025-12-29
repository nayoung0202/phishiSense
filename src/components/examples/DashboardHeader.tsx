import { DashboardHeader } from '../DashboardHeader';
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardHeaderExample() {
  return (
    <SidebarProvider>
      <div className="w-full">
        <DashboardHeader />
      </div>
    </SidebarProvider>
  );
}
