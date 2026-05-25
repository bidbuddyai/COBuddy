import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  Calendar, 
  HelpCircle, 
  ClipboardCheck, 
  CheckSquare, 
  FileText,
  AlertTriangle,
  TrendingUp,
  Percent
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Rfi, Submittal, Task, BudgetLineItem, ScheduleActivity, ChangeOrder } from "@shared/schema";

interface StatsCardsProps {
  projectId: number;
}

export default function StatsCards({ projectId }: StatsCardsProps) {
  // Fetch Budget
  const { data: budgetItems, isLoading: budgetLoading } = useQuery<BudgetLineItem[]>({
    queryKey: [`/api/projects/${projectId}/budget`],
  });

  // Fetch Schedule
  const { data: scheduleActivities, isLoading: scheduleLoading } = useQuery<ScheduleActivity[]>({
    queryKey: [`/api/projects/${projectId}/schedule`],
  });

  // Fetch RFIs
  const { data: rfis, isLoading: rfisLoading } = useQuery<Rfi[]>({
    queryKey: [`/api/projects/${projectId}/rfis`],
  });

  // Fetch Submittals
  const { data: submittals, isLoading: submittalsLoading } = useQuery<Submittal[]>({
    queryKey: [`/api/projects/${projectId}/submittals`],
  });

  // Fetch Tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/projects/${projectId}/tasks`],
  });

  // Fetch Change Orders
  const { data: changeOrdersResponse, isLoading: coLoading } = useQuery<{ data: ChangeOrder[] }>({
    queryKey: [`/api/change-orders`, { projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/change-orders?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch change orders");
      return res.json();
    }
  });

  const isLoading = budgetLoading || scheduleLoading || rfisLoading || submittalsLoading || tasksLoading || coLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-32"></div>
                </div>
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate Budget
  let originalBudgetTotal = 0;
  let eacTotal = 0;
  budgetItems?.forEach((item) => {
    originalBudgetTotal += Number(item.originalBudget) || 0;
    eacTotal += Number(item.estimatedAtCompletion) || 0;
  });
  const budgetVariance = originalBudgetTotal - eacTotal;
  const isBudgetWarning = budgetVariance < 0;

  // Calculate Schedule
  let totalProgress = 0;
  let completedCount = 0;
  let criticalCount = 0;
  const totalActivities = scheduleActivities?.length || 0;

  scheduleActivities?.forEach((act) => {
    totalProgress += act.percentComplete || 0;
    if (act.percentComplete === 100) completedCount++;
    if (act.criticalPath) criticalCount++;
  });
  const scheduleAvg = totalActivities > 0 ? Math.round(totalProgress / totalActivities) : 0;

  // Calculate RFIs
  const openRfis = rfis?.filter(r => r.status === 'open' || r.status === 'pending') || [];
  const urgentRfis = openRfis.filter(r => r.priority === 'high');

  // Calculate Submittals
  const openSubmittals = submittals?.filter(s => s.status === 'open' || s.status === 'pending_review' || s.status === 'submitted') || [];
  const overdueSubmittalsCount = openSubmittals.filter(s => s.dueDate && new Date(s.dueDate) < new Date()).length;

  // Calculate Tasks
  const openTasks = tasks?.filter(t => t.status === 'open' || t.status === 'in_progress') || [];
  const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

  // Calculate Change Orders
  const changeOrders = changeOrdersResponse?.data || [];
  const approvedCOs = changeOrders.filter(co => co.status === 'approved');
  const approvedCOTotal = approvedCOs.reduce((sum, co) => sum + Number(co.amountApproved || co.totalAmount || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const cards = [
    {
      title: "Budget Health",
      value: formatCurrency(originalBudgetTotal),
      subValue: `EAC: ${formatCurrency(eacTotal)}`,
      detail: budgetVariance >= 0 
        ? `${formatCurrency(budgetVariance)} under budget`
        : `${formatCurrency(Math.abs(budgetVariance))} over budget`,
      icon: DollarSign,
      color: isBudgetWarning ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
      statusColor: isBudgetWarning ? "text-red-600 dark:text-red-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-medium",
      progressBar: { show: true, value: eacTotal > 0 ? Math.min(100, (originalBudgetTotal / eacTotal) * 100) : 100 }
    },
    {
      title: "Schedule Lookahead",
      value: `${scheduleAvg}%`,
      subValue: `${completedCount} of ${totalActivities} activities done`,
      detail: criticalCount > 0 ? `${criticalCount} activities on critical path` : "Critical path is healthy",
      icon: Calendar,
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
      statusColor: criticalCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
      progressBar: { show: true, value: scheduleAvg }
    },
    {
      title: "Open RFIs",
      value: String(openRfis.length),
      subValue: `${urgentRfis.length} urgent RFIs`,
      detail: openRfis.length > 0 ? "Awaiting answers from GC/Sub" : "No open RFIs",
      icon: HelpCircle,
      color: openRfis.length > 3 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
      statusColor: urgentRfis.length > 0 ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground",
      progressBar: { show: false, value: 0 }
    },
    {
      title: "Pending Submittals",
      value: String(openSubmittals.length),
      subValue: `${overdueSubmittalsCount} overdue submittals`,
      detail: openSubmittals.length > 0 ? "Awaiting review and approval" : "All submittals approved",
      icon: ClipboardCheck,
      color: overdueSubmittalsCount > 0 ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
      statusColor: overdueSubmittalsCount > 0 ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground",
      progressBar: { show: false, value: 0 }
    },
    {
      title: "Tasks / Punch List",
      value: String(openTasks.length),
      subValue: `${overdueTasks.length} overdue tasks`,
      detail: openTasks.length > 0 ? "Assigned punch list items" : "Punch list complete",
      icon: CheckSquare,
      color: overdueTasks.length > 0 ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
      statusColor: overdueTasks.length > 0 ? "text-red-600 dark:text-red-400 font-bold" : "text-muted-foreground",
      progressBar: { show: false, value: 0 }
    },
    {
      title: "Change Orders",
      value: formatCurrency(approvedCOTotal),
      subValue: `${approvedCOs.length} approved change orders`,
      detail: `${changeOrders.length - approvedCOs.length} pending/draft status`,
      icon: FileText,
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
      statusColor: "text-muted-foreground",
      progressBar: { show: false, value: 0 }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        
        return (
          <Card key={card.title} className="bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-foreground">
                      {card.value}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {card.subValue}
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {card.progressBar.show && (
                <div className="mt-3 w-full">
                  <Progress 
                    value={card.progressBar.value} 
                    className="h-1.5 bg-slate-100 dark:bg-slate-900 [&>div]:bg-emerald-600" 
                  />
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className={card.statusColor}>
                  {card.detail}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
