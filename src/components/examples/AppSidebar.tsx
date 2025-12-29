import { AppSidebar } from '../AppSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "280px",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-[600px] w-full">
        <AppSidebar />
      </div>
    </SidebarProvider>
  );
}
