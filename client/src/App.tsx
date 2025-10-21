import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Templates from "@/pages/Templates";
import TemplateEdit from "@/pages/TemplateEdit";
import Targets from "@/pages/Targets";
import TargetEdit from "@/pages/TargetEdit";
import TrainingPages from "@/pages/TrainingPages";
import TrainingPageEdit from "@/pages/TrainingPageEdit";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/templates" component={Templates} />
      <Route path="/templates/new" component={TemplateEdit} />
      <Route path="/templates/:id/edit" component={TemplateEdit} />
      <Route path="/targets" component={Targets} />
      <Route path="/targets/new" component={TargetEdit} />
      <Route path="/targets/:id/edit" component={TargetEdit} />
      <Route path="/training-pages" component={TrainingPages} />
      <Route path="/training-pages/new" component={TrainingPageEdit} />
      <Route path="/training-pages/:id/edit" component={TrainingPageEdit} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "280px",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <DashboardHeader />
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
