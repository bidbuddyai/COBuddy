import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatsCards from "@/components/StatsCards";
import ProjectSelector from "@/components/ProjectSelector";
import QuickStartWizard from "@/components/QuickStartWizard";
import { useProject } from "@/contexts/ProjectContext";
import { 
  Plus, 
  Building2, 
  HelpCircle, 
  ClipboardCheck, 
  CheckSquare, 
  FileText,
  File,
  ArrowRight,
  TrendingUp,
  FolderOpen,
  Calendar,
  Activity,
  DollarSign
} from "lucide-react";
import { Project, Rfi, Submittal, Task, ChangeOrder } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [showQuickStart, setShowQuickStart] = useState(false);

  // Fetch all projects for the portfolio view
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch data for recent activity when a project is selected
  const { data: rfis } = useQuery<Rfi[]>({
    queryKey: [`/api/projects/${selectedProjectId}/rfis`],
    enabled: !!selectedProjectId,
  });

  const { data: submittals } = useQuery<Submittal[]>({
    queryKey: [`/api/projects/${selectedProjectId}/submittals`],
    enabled: !!selectedProjectId,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: [`/api/projects/${selectedProjectId}/tasks`],
    enabled: !!selectedProjectId,
  });

  const { data: changeOrdersResponse } = useQuery<{ data: ChangeOrder[] }>({
    queryKey: [`/api/change-orders`, { projectId: selectedProjectId }],
    queryFn: async () => {
      const res = await fetch(`/api/change-orders?projectId=${selectedProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch change orders");
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    // Show Quick Start Wizard for new users
    const quickStartCompleted = localStorage.getItem('quickStartCompleted');
    if (!quickStartCompleted) {
      setShowQuickStart(true);
    }
  }, []);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  // Compile portfolio metrics
  const totalProjects = projects?.length || 0;
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0;

  // Compile recent activity list for selected project
  const getRecentActivity = () => {
    if (!selectedProjectId) return [];

    const activityList: Array<{
      id: string | number;
      type: 'rfi' | 'submittal' | 'task' | 'co';
      title: string;
      status: string;
      date: Date;
      icon: any;
      color: string;
      badgeColor: string;
    }> = [];

    // Process RFIs
    rfis?.forEach(rfi => {
      activityList.push({
        id: `rfi-${rfi.id}`,
        type: 'rfi',
        title: `RFI ${rfi.number}: ${rfi.subject}`,
        status: rfi.status || 'open',
        date: rfi.createdAt ? new Date(rfi.createdAt) : new Date(),
        icon: HelpCircle,
        color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400",
        badgeColor: rfi.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
      });
    });

    // Process Submittals
    submittals?.forEach(sub => {
      activityList.push({
        id: `sub-${sub.id}`,
        type: 'submittal',
        title: `Submittal ${sub.number}: ${sub.title}`,
        status: sub.status || 'pending',
        date: sub.createdAt ? new Date(sub.createdAt) : new Date(),
        icon: ClipboardCheck,
        color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400",
        badgeColor: sub.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
      });
    });

    // Process Tasks
    tasks?.forEach(task => {
      activityList.push({
        id: `task-${task.id}`,
        type: 'task',
        title: `Task: ${task.title}`,
        status: task.status || 'open',
        date: task.createdAt ? new Date(task.createdAt) : new Date(),
        icon: CheckSquare,
        color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400",
        badgeColor: task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      });
    });

    // Process Change Orders
    changeOrdersResponse?.data?.forEach(co => {
      activityList.push({
        id: `co-${co.id}`,
        type: 'co',
        title: `Change Order ${co.number}: ${co.title} (${formatCurrency(co.totalAmount || 0)})`,
        status: co.status || 'draft',
        date: co.createdAt ? new Date(co.createdAt) : new Date(),
        icon: FileText,
        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400",
        badgeColor: co.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-emerald-100 text-emerald-800'
      });
    });

    // Sort by date descending
    return activityList
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  };

  const recentActivity = getRecentActivity();

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-background/20 min-h-screen text-foreground">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-emerald-600 dark:from-emerald-400 dark:to-emerald-200">
            ProjectBuddy
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Construction Project Operations & Change Order AI Assistant
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition-colors duration-150"
            onClick={() => setLocation('/projects')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          <Button 
            variant="outline"
            className="border-slate-200 hover:bg-slate-100 dark:border-slate-800"
            onClick={() => setShowQuickStart(true)}
          >
            Guide
          </Button>
        </div>
      </div>

      {/* Project Selector component */}
      <div className="bg-white dark:bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Selected Project
        </div>
        <ProjectSelector
          selectedProjectId={selectedProjectId || undefined}
          onProjectSelect={(id) => setSelectedProjectId(id || null)}
        />
      </div>

      {/* PORTFOLIO VIEW (No project selected) */}
      {!selectedProjectId && (
        <div className="space-y-6">
          {/* Portfolio KPI summary row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Projects
                  </p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    {totalProjects}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeProjects} currently active
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Total Portfolio Budget
                  </p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    {projects ? formatCurrency(projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0)) : '$0'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contract allocations
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Open PM Tasks
                  </p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    --
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Punch items in progress
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                  <CheckSquare className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Unanswered RFIs
                  </p>
                  <p className="text-3xl font-extrabold text-foreground mt-1">
                    --
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting GC response
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl">
                  <HelpCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Project Portfolio Table */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Active Project Portfolio
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Select a project to enter its detailed workspace
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLocation('/projects')}
                  className="border-slate-200 dark:border-slate-800 text-xs"
                >
                  Manage Projects
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {projectsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Loading project portfolio...
                </div>
              ) : !projects || projects.length === 0 ? (
                <div className="p-12 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                  <h3 className="mt-2 text-sm font-semibold text-foreground">No projects found</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Create your first construction project to start managing budgets, RFIs, submittals, and schedules.
                  </p>
                  <Button 
                    className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                    onClick={() => setLocation('/projects')}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Create First Project
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-card hover:bg-slate-50/50 dark:hover:bg-card">
                      <TableHead className="font-semibold text-xs py-3">Project Name</TableHead>
                      <TableHead className="font-semibold text-xs py-3">Number</TableHead>
                      <TableHead className="font-semibold text-xs py-3">Client</TableHead>
                      <TableHead className="font-semibold text-xs py-3">Status</TableHead>
                      <TableHead className="font-semibold text-xs py-3 text-right">Contract Value</TableHead>
                      <TableHead className="font-semibold text-xs py-3 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow 
                        key={project.id} 
                        className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <TableCell className="font-semibold text-sm text-slate-900 dark:text-slate-100 py-3.5">
                          {project.name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500 py-3.5">
                          {project.number}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 py-3.5">
                          {project.clientName || 'N/A'}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              project.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-none' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-none'
                            }`}
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-right py-3.5 text-slate-950 dark:text-white">
                          {formatCurrency(project.budget || 0)}
                        </TableCell>
                        <TableCell className="text-right py-3.5 pr-6">
                          <Button variant="ghost" size="icon" className="hover:text-emerald-600">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PROJECT DASHBOARD (Project selected) */}
      {selectedProjectId && (
        <div className="space-y-6">
          {/* Stats Cards grid */}
          <StatsCards projectId={selectedProjectId} />

          {/* 2 Column Layout: Activity and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Recent Activity Feed (2/3) */}
            <Card className="lg:col-span-2 bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center space-x-2 text-foreground">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span>Recent Project Activity</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest updates across all active PM modules
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No recent activity recorded for this project.
                  </div>
                ) : (
                  recentActivity.map((act) => {
                    const Icon = act.icon;
                    return (
                      <div key={act.id} className="flex items-start space-x-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0 dark:border-slate-800/80">
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${act.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {act.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 rounded ${act.badgeColor}`}>
                              {act.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {act.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Right: Quick Actions Card (1/3) */}
            <div className="space-y-6">
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                  <CardTitle className="text-base font-bold text-foreground">
                    Quick PM Actions
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Quickly launch work item drawers or pages
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-left px-3 py-6 rounded-lg border border-slate-100 dark:border-slate-800/80"
                    onClick={() => setLocation(`/projects/${selectedProjectId}/rfis`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Create RFI</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Draft and route clarification request</span>
                      </div>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-left px-3 py-6 rounded-lg border border-slate-100 dark:border-slate-800/80"
                    onClick={() => setLocation(`/projects/${selectedProjectId}/submittals`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <ClipboardCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">New Submittal</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Submit product data or shop drawings</span>
                      </div>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-left px-3 py-6 rounded-lg border border-slate-100 dark:border-slate-800/80"
                    onClick={() => setLocation(`/projects/${selectedProjectId}/tasks`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                        <CheckSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Add Task</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Record a new punch list or assignment</span>
                      </div>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-left px-3 py-6 rounded-lg border border-slate-100 dark:border-slate-800/80"
                    onClick={() => setLocation(`/projects/${selectedProjectId}/documents`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <File className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">Upload Document</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Store project plans, specs or sheets</span>
                      </div>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="w-full justify-between hover:bg-slate-50 dark:hover:bg-slate-800 text-left px-3 py-6 rounded-lg border border-slate-100 dark:border-slate-800/80"
                    onClick={() => setLocation(`/projects/${selectedProjectId}/change-orders`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">New Change Order</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Create a potential change order (PCO)</span>
                      </div>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      )}
      
      {/* Quick Start Wizard */}
      <QuickStartWizard 
        isOpen={showQuickStart} 
        onClose={() => setShowQuickStart(false)} 
      />
    </div>
  );
}
