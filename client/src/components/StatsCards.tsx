import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types";
import { FileText, DollarSign, Clock, Brain, TrendingUp, AlertTriangle } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Change Orders",
      value: stats?.totalChangeOrders || 0,
      change: "+12% from last month",
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
      trend: "up"
    },
    {
      title: "Total Value",
      value: `$${((stats?.totalValue || 0) / 1000000).toFixed(1)}M`,
      change: "+8% from last month",
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
      trend: "up"
    },
    {
      title: "Pending Approval",
      value: stats?.pendingApproval || 0,
      change: "Requires attention",
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600",
      trend: "warning"
    },
    {
      title: "AI Processed",
      value: `${Math.round(stats?.aiProcessedRate || 0)}%`,
      change: "Automation rate",
      icon: Brain,
      color: "bg-purple-100 text-purple-600",
      trend: "info"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "warning" ? AlertTriangle : Brain;
        
        return (
          <Card key={stat.title} className="transition-all duration-200 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {stat.value}
                  </p>
                  <p className={`text-xs mt-1 flex items-center ${
                    stat.trend === "up" ? "text-green-600" : 
                    stat.trend === "warning" ? "text-yellow-600" : 
                    "text-blue-600"
                  }`}>
                    <TrendIcon className="h-3 w-3 mr-1" />
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
