"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Trash2,
  Settings,
  Upload,
  Menu,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { UserProfileNav } from "./user-profile-nav";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Route {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultExpanded?: boolean;
}

export function Sidebar({ className, defaultExpanded = false }: SidebarProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const repoRoutes: Route[] = [
    {
      label: "角色库",
      icon: Users,
      href: "/cards",
      active: pathname === "/cards" || pathname === "/",
    },
  ];

  const manageRoutes: Route[] = [
    {
      label: "上传",
      icon: Upload,
      href: "/upload",
      active: pathname.startsWith("/upload"),
    },
    {
      label: "回收站",
      icon: Trash2,
      href: "/trash",
      active: pathname.startsWith("/trash"),
    },
  ];

  const systemRoutes: Route[] = [
    {
      label: "设置",
      icon: Settings,
      href: "/settings",
      active: pathname.startsWith("/settings"),
    },
  ];

  const renderNavItem = (route: Route) => {
    const isActive = route.active;
    const button = (
      <Button
        key={route.href}
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full font-normal transition-all duration-200",
          isExpanded ? "justify-start px-4" : "justify-center px-0 h-10 w-10 mx-auto",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground" 
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
        asChild
      >
        <Link href={route.href}>
          <route.icon className={cn("flex-shrink-0 transition-all", isExpanded ? "h-5 w-5 mr-2" : "h-6 w-6")} />
          {isExpanded && <span className="animate-in fade-in duration-200">{route.label}</span>}
        </Link>
      </Button>
    );

    if (isExpanded) {
        return button;
    }

    return (
        <Tooltip key={route.href} delayDuration={0}>
            <TooltipTrigger asChild>
                {button}
            </TooltipTrigger>
            <TooltipContent side="right" className="z-50 ml-2">
                {route.label}
            </TooltipContent>
        </Tooltip>
    );
  };

  return (
    <TooltipProvider>
    <div 
      className={cn(
        "pb-12 h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out z-50 flex flex-col", 
        isExpanded ? "w-56" : "w-16",
        isExpanded && "shadow-xl", // Shadow only when expanded
        // If we are inside a Sheet (mobile), we want to avoid extra shadows or fixed positioning issues if any.
        // But here we rely on the parent container (SheetContent or aside) to handle positioning.
        className
      )}
    >
      <div className="space-y-4 py-4 h-full flex flex-col overflow-hidden">
        <div className="px-3 py-2 flex-1 space-y-6">
          <div className={cn("px-2 flex items-center transition-all duration-300 h-10", isExpanded ? "justify-start gap-3" : "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src="/icons/icon-72x72.png"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                  unoptimized // 暂时禁用优化，排除 Next.js 图片优化服务的干扰
                />
            </div>
            {isExpanded && (
                <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent whitespace-nowrap animate-in fade-in duration-300">
                囤囤小兄许
                </h2>
            )}
          </div>
          
          <div>
            {isExpanded && (
                <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground tracking-wider uppercase animate-in fade-in duration-300">
                仓库
                </h3>
            )}
            <div className="space-y-1">
              {repoRoutes.map(renderNavItem)}
            </div>
          </div>

          <div>
            {isExpanded && (
                <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground tracking-wider uppercase animate-in fade-in duration-300">
                管理
                </h3>
            )}
            <div className="space-y-1">
              {manageRoutes.map(renderNavItem)}
            </div>
          </div>

          <div>
            {isExpanded && (
                <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground tracking-wider uppercase animate-in fade-in duration-300">
                系统
                </h3>
            )}
            <div className="space-y-1">
              {systemRoutes.map(renderNavItem)}
            </div>
          </div>
        </div>

        <div className="mt-auto px-2 py-2 space-y-2 relative">
           <div className="flex justify-center mb-2 hidden md:flex">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="h-6 w-6 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground border shadow-sm"
                title={isExpanded ? "收起侧边栏" : "展开侧边栏"}
               >
                   {isExpanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
               </Button>
           </div>
           <UserProfileNav isCollapsed={!isExpanded} />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
