import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectSelector from '@/components/ProjectSelector';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, FileText, AlertTriangle, Building } from 'lucide-react';
import { PlayfulLoadingAnimation, DataProcessingWave } from '@/components/PlayfulLoadingAnimations';

interface ProjectAnalytics {
  totalChangeOrders: number;
  totalValue: number;
  avgChangeOrderValue: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
    value: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    changeOrders: number;
    value: number;
  }>;
}

export default function Analytics() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();

  const { data: analytics, isLoading } = useQuery<ProjectAnalytics>({
    queryKey: ['/api/analytics', selectedProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/${selectedProjectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  if (!selectedProjectId) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View project analytics and insights
            </p>
          </div>
        </div>

        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
        />

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a project to view its analytics and insights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Project analytics and insights
            </p>
          </div>
        </div>

        <ProjectSelector
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
        />

        <div className="flex items-center justify-center h-64">
          <PlayfulLoadingAnimation 
            stage="analyzing" 
            message="CO Buddy is crunching the numbers..."
            size="lg"
          />
        </div>
        
        <div className="mb-4">
          <DataProcessingWave />
        </div>
      </div>
    );
  }

  const COLORS = ['#03512A', '#22C55E', '#86EFAC', '#DCFCE7', '#FCA5A5'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Project analytics and insights
          </p>
        </div>
      </div>

      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectSelect={setSelectedProjectId}
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Change Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalChangeOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.totalValue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.avgChangeOrderValue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.statusBreakdown?.length || 0} Types
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.statusBreakdown || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics?.statusBreakdown?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}`, 'Change Orders']} />
                <Bar dataKey="changeOrders" fill="#03512A" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}