import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import AIAssistantBubble from "./AIAssistantBubble";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { useProject } from "@/contexts/ProjectContext";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const isMobile = useIsMobile();
  const [location] = useLocation();

  // Collapsible sidebar state for desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  // Keep project ID synced globally based on the active path
  useEffect(() => {
    const match = location.match(/\/projects\/(\d+)/);
    if (match) {
      const pId = parseInt(match[1], 10);
      if (pId && pId !== selectedProjectId) {
        setSelectedProjectId(pId);
      }
    }
  }, [location, selectedProjectId, setSelectedProjectId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Please log in</h1>
          <p className="text-muted-foreground">You need to be authenticated to access this application.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        z-50 bg-card shadow-lg border-r border-border transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden
        ${isMobile 
          ? `fixed inset-y-0 left-0 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
          : `relative h-full ${isCollapsed ? 'w-20' : 'w-64'}`
        }
      `}>
        <Sidebar 
          onClose={() => setSidebarOpen(false)} 
          isCollapsed={!isMobile && isCollapsed} 
          onToggleCollapse={toggleCollapse} 
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        {isMobile && (
          <div className="md:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">ProjectBuddy</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>

      {/* AI Assistant Bubble - hide on AI Assistant page */}
      {location !== '/ai-assistant' && <AIAssistantBubble />}
    </div>
  );
}
