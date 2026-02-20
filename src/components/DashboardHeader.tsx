"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export function DashboardHeader() {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-border">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg p-1" data-testid="button-user-menu">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary text-primary-foreground">관</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>관리자</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="button-profile">
            <User className="w-4 h-4 mr-2" />
            프로필
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
