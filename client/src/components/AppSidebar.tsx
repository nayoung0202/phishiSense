import { LayoutDashboard, FolderKanban, Users, FileText, Mail, Paperclip, Link, BookOpen } from "lucide-react";
import { Link as RouterLink, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "대시보드",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "프로젝트",
    url: "/projects",
    icon: FolderKanban,
  },
  {
    title: "훈련대상 관리",
    url: "/targets",
    icon: Users,
  },
  {
    title: "템플릿 관리",
    url: "/templates",
    icon: FileText,
  },
  {
    title: "메일 본문 관리",
    url: "/email-content",
    icon: Mail,
  },
  {
    title: "첨부파일 관리",
    url: "/attachments",
    icon: Paperclip,
  },
  {
    title: "링크 페이지 관리",
    url: "/link-pages",
    icon: Link,
  },
  {
    title: "훈련 안내 페이지 관리",
    url: "/training-pages",
    icon: BookOpen,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary">PhishSense</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <RouterLink href={item.url} data-testid={`link-${item.url.slice(1) || 'dashboard'}`}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </RouterLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
