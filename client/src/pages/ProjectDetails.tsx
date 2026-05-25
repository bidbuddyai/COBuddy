import { useParams, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  HelpCircle, 
  ClipboardCheck, 
  CheckSquare, 
  Layers, 
  File,
  ArrowLeft, 
  Activity,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import type { Project, Rfi, Submittal, Task, ChangeOrder } from '@shared/schema';
import StatsCards from '@/components/StatsCards';
import { PlayfulLoadingAnimation } from '@/components/PlayfulLoadingAnimations';

export default function ProjectDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id || '0');

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch RFIs
  const { data: rfis } = useQuery<Rfi[]>({
    queryKey: [`/api/projects/${projectId}/rfis`],
    enabled: !!projectId,
  });

  // Fetch Submittals
  const { data: submittals } = useQuery<Submittal[]>({
    queryKey: [`/api/projects/${projectId}/submittals`],
    enabled: !!projectId,
  });

  // Fetch Tasks
  const { data: tasks } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!projectId,
  });

  // Fetch Change Orders
  const { data: changeOrdersResponse } = useQuery<{ data: ChangeOrder[] }>({
    queryKey: [`/api/change-orders`, { projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/change-orders?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch change orders");
      return res.json();
    },
    enabled: !!projectId,
  });

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <PlayfulLoadingAnimation 
            stage="analyzing" 
            message="Loading project workspace..."
            size="lg"
          />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">
            Project not found
          </h3>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-none';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-none';
      case 'on-hold': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-none';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-none';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  // Compile recent activity list
  const getRecentActivity = () => {
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

    return activityList
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  };

  const recentActivity = getRecentActivity();

  const pmModules = [
    { name: 'Budget & Cost', desc: 'Track costs, EAC, and variances', href: `/projects/${projectId}/budget`, icon: DollarSign, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400" },
    { name: 'Schedule', desc: 'Import schedule and milestones', href: `/projects/${projectId}/schedule`, icon: Calendar, color: "text-blue-700 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400" },
    { name: 'RFIs', desc: 'Clarify designs and queries', href: `/projects/${projectId}/rfis`, icon: HelpCircle, color: "text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400" },
    { name: 'Submittals', desc: 'Approve subcontractor product data', href: `/projects/${projectId}/submittals`, icon: ClipboardCheck, color: "text-purple-700 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400" },
    { name: 'Bid Packages', desc: 'Invite subcontractors and level bids', href: `/projects/${projectId}/bid-packages`, icon: Layers, color: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950/20 dark:text-cyan-400" },
    { name: 'Tasks & Punch', desc: 'Manage defect lists and QC checks', href: `/projects/${projectId}/tasks`, icon: CheckSquare, color: "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400" },
    { name: 'Documents', desc: 'Project specs, plans, and reports', href: `/projects/${projectId}/documents`, icon: File, color: "text-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-400" },
    { name: 'Change Orders', desc: 'Track GC PCOs and T&M Sheets', href: `/projects/${projectId}/change-orders`, icon: FileText, color: "text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400" }
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-background/20 min-h-screen text-foreground">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Projects
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Project Workspace #{project.number}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`text-xs font-bold px-3 py-1 border rounded-full capitalize ${getStatusColor(project.status)}`}>
            {project.status}
          </Badge>
        </div>
      </div>

      {/* Stats Cards Dashboard Section */}
      <StatsCards projectId={projectId} />

      {/* 2 Column Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): PM Modules Launcher Grid */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-foreground">
                Project Operational Modules
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Launch detailed sheets, logs, and workflows for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pmModules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Button
                      key={mod.name}
                      variant="ghost"
                      className="h-auto flex items-start space-x-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-left justify-start transition-all"
                      onClick={() => setLocation(mod.href)}
                    >
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${mod.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {mod.name}
                        </span>
                        <span className="text-xs text-muted-foreground block font-medium mt-0.5 line-clamp-1">
                          {mod.desc}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 self-center flex-shrink-0" />
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3): Project Info & Activity Feed */}
        <div className="space-y-6">
          {/* Project Details Sheet */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-foreground flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Project Metadata</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm font-medium">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Name</p>
                <p className="text-sm font-semibold mt-0.5 text-slate-800 dark:text-slate-200">{project.clientName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Contact</p>
                <p className="text-sm font-semibold mt-0.5 text-slate-800 dark:text-slate-200">{project.clientContact || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contract Budget</p>
                <p className="text-sm font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">{formatCurrency(project.budget || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Created Date</p>
                <p className="text-sm font-semibold mt-0.5 text-slate-800 dark:text-slate-200">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {project.description && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scope Description</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed">{project.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center space-x-2 text-foreground">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span>Recent Updates</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              {recentActivity.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No recent activity updates.
                </div>
              ) : (
                recentActivity.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div key={act.id} className="flex items-start space-x-3 text-xs">
                      <div className={`p-1.5 rounded ${act.color} flex-shrink-0`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {act.title}
                        </p>
                        <span className="text-[9px] text-muted-foreground block mt-0.5">
                          {act.date.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

      </div>
      
    </div>
  );
}
