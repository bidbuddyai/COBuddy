import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import ProjectBuddyIcon from "@/assets/projectbuddy_icon.png";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  FileText, 
  Database, 
  Settings,
  Moon,
  Sun,
  LogOut,
  X,
  Building,
  Building2,
  HelpCircle,
  ClipboardCheck,
  CheckSquare,
  DollarSign,
  Calendar,
  Layers,
  File,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { selectedProjectId } = useProject();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  // Global platform navigation
  const globalNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: Building },
    { name: 'Company', href: '/company', icon: Building2 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // PM Project Workspace navigation
  const projectWorkspaceNavigation = selectedProjectId ? [
    { name: 'Overview', href: `/projects/${selectedProjectId}`, icon: LayoutDashboard },
    { name: 'AI Copilot', href: `/projects/${selectedProjectId}/ai-copilot`, icon: Sparkles },
    { name: 'Budget & Cost', href: `/projects/${selectedProjectId}/budget`, icon: DollarSign },
    { name: 'Schedule', href: `/projects/${selectedProjectId}/schedule`, icon: Calendar },
    { name: 'RFIs', href: `/projects/${selectedProjectId}/rfis`, icon: HelpCircle },
    { name: 'Submittals', href: `/projects/${selectedProjectId}/submittals`, icon: ClipboardCheck },
    { name: 'Bid Packages', href: `/projects/${selectedProjectId}/bid-packages`, icon: Layers },
    { name: 'Tasks / Punch', href: `/projects/${selectedProjectId}/tasks`, icon: CheckSquare },
    { name: 'Documents', href: `/projects/${selectedProjectId}/documents`, icon: File },
  ] : [];

  // Change Orders sub-section navigation
  const changeOrdersNavigation = selectedProjectId ? [
    { name: 'Change Order Log', href: `/projects/${selectedProjectId}/change-orders`, icon: FileText },
    { name: 'Rate Tables', href: `/rate-tables`, icon: Database },
  ] : [];

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;
    const content = (
      <div className={`
        flex items-center rounded-lg transition-all duration-150 cursor-pointer
        ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2 text-sm font-medium'}
        ${isActive 
          ? 'bg-[var(--mint-highlight)] text-[var(--deep-green)] dark:text-[var(--foreground)] shadow-sm font-semibold' 
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
        }
      `}>
        <Icon className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-[var(--primary)] dark:text-[var(--accent)]' : 'text-slate-500'}`} />
        {!isCollapsed && <span>{item.name}</span>}
      </div>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.name} delayDuration={50}>
          <TooltipTrigger asChild>
            <Link href={item.href} onClick={handleLinkClick}>
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-semibold">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link key={item.name} href={item.href} onClick={handleLinkClick}>
        {content}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-card border-r border-border transition-all duration-300">
      {/* Close button for mobile */}
      {onClose && (
        <div className="flex justify-end p-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Logo Section */}
      <div className={`flex items-center border-b border-border bg-white dark:bg-card ${isCollapsed ? 'justify-center py-5 px-0' : 'px-6 py-5'}`}>
        <div className="flex items-center space-x-3">
          <img 
            src={ProjectBuddyIcon} 
            alt="ProjectBuddy" 
            className="w-10 h-10 rounded-xl object-cover shadow-sm border border-emerald-100 dark:border-emerald-950 flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="transition-all duration-300 overflow-hidden whitespace-nowrap">
              <h1 className="text-lg font-bold text-foreground tracking-tight">ProjectBuddy</h1>
              <p className="text-xs text-muted-foreground font-medium">Construction PM Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Toggle Button for Desktop */}
      {onToggleCollapse && (
        <div className={`hidden md:flex ${isCollapsed ? 'justify-center' : 'justify-end'} px-4 py-2 border-b border-border`}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto bg-slate-50/50 dark:bg-card/40 py-6 space-y-7 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        
        {/* Project Workspace Section */}
        {selectedProjectId && (
          <div className="space-y-2">
            {!isCollapsed ? (
              <h3 className="px-3 text-xs font-bold text-emerald-800 dark:text-emerald-500 uppercase tracking-wider">
                Project Workspace
              </h3>
            ) : (
              <div className="border-t border-border/80 my-2 mx-2" />
            )}
            <nav className="space-y-1">
              {projectWorkspaceNavigation.map((item) => {
                const isActive = location === item.href || (item.href !== `/projects/${selectedProjectId}` && location.startsWith(item.href + '/'));
                return renderNavItem(item, isActive);
              })}
            </nav>
          </div>
        )}

        {/* Change Orders Section */}
        {selectedProjectId && (
          <div className="space-y-2">
            {!isCollapsed ? (
              <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Change Orders (AI)
              </h3>
            ) : (
              <div className="border-t border-border/80 my-2 mx-2" />
            )}
            <nav className="space-y-1">
              {changeOrdersNavigation.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + '/');
                return renderNavItem(item, isActive);
              })}
            </nav>
          </div>
        )}

        {/* Global Platform Section */}
        <div className="space-y-2">
          {!isCollapsed ? (
            <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Global Platform
            </h3>
          ) : (
            <div className="border-t border-border/80 my-2 mx-2" />
          )}
          <nav className="space-y-1">
            {globalNavigation.map((item) => {
              // If dashboard or other main page is selected
              const isActive = selectedProjectId 
                ? location === item.href
                : location === item.href || (item.href !== '/' && location.startsWith(item.href));
              
              return renderNavItem(item, isActive);
            })}
          </nav>
        </div>
      </div>

      {/* User Profile */}
      <div className={`border-t border-border bg-white dark:bg-card ${isCollapsed ? 'py-4 px-2' : 'px-4 py-4'}`}>
        {!isCollapsed ? (
          <div className="flex items-center space-x-3">
            <Link href="/settings" onClick={handleLinkClick} className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-9 w-9 cursor-pointer shadow-sm border border-border">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground capitalize font-medium">{user?.role}</p>
              </div>
            </Link>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <Link href="/settings" onClick={handleLinkClick}>
                  <Avatar className="h-9 w-9 cursor-pointer shadow-sm border border-border">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">
                Settings ({user?.firstName} {user?.lastName})
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">
                Toggle theme
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-semibold">
                Logout
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
