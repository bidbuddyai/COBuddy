import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ProjectSelector from '@/components/ProjectSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Download,
  Filter,
  Building,
  Info
} from 'lucide-react';
import type { Project } from '@shared/schema';

interface AnalyticsData {
  costTrends: {
    monthly: Array<{
      month: string;
      labor: number;
      materials: number;
      equipment: number;
      total: number;
    }>;
    quarterly: Array<{
      quarter: string;
      labor: number;
      materials: number;
      equipment: number;
      total: number;
    }>;
  };
  anomalies: Array<{
    id: string;
    type: 'cost_spike' | 'unusual_pattern' | 'rate_deviation';
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    expectedValue: number;
    variance: number;
    date: string;
    category: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  efficiency: {
    rateUtilization: number;
    averageProcessingTime: number;
    accuracyRate: number;
    costPerChangeOrder: number;
  };
  predictions: Array<{
    period: string;
    predicted: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

const COLORS = ['#03512A', '#0F7B3C', '#22C55E', '#86EFAC', '#DCFCE7'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('12m');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch projects for selection
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics', { timeRange, category: selectedCategory, projectId: selectedProject }],
    enabled: !!selectedProject || selectedProject === null, // Allow null for all projects
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'cost_spike': return <TrendingUp className="h-4 w-4" />;
      case 'unusual_pattern': return <Activity className="h-4 w-4" />;
      case 'rate_deviation': return <Target className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Advanced Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Cost trends, anomaly detection, and predictive insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProject?.toString() || 'all'} onValueChange={(value) => setSelectedProject(value === 'all' ? null : parseInt(value))}>
            <SelectTrigger className="w-48">
              <Building className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
              <SelectItem value="24m">24 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="disposal">Disposal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$247,890</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.3%</span> from last period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.anomalies?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              3 high priority items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Accuracy</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              AI matching accuracy
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Per Change Order</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,263</div>
            <p className="text-xs text-muted-foreground">
              Average processing cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Selection Alert */}
      {!selectedProject && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Showing analytics for all projects. Select a specific project above to see project-specific analytics.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Cost Trends</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Labor', value: 45, color: '#03512A' },
                        { name: 'Materials', value: 30, color: '#22C55E' },
                        { name: 'Equipment', value: 20, color: '#86EFAC' },
                        { name: 'Disposal', value: 5, color: '#DCFCE7' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Labor', value: 45, color: '#03512A' },
                        { name: 'Materials', value: 30, color: '#22C55E' },
                        { name: 'Equipment', value: 20, color: '#86EFAC' },
                        { name: 'Disposal', value: 5, color: '#DCFCE7' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[
                    { month: 'Jan', total: 25000 },
                    { month: 'Feb', total: 28000 },
                    { month: 'Mar', total: 32000 },
                    { month: 'Apr', total: 29000 },
                    { month: 'May', total: 35000 },
                    { month: 'Jun', total: 38000 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Total Cost']} />
                    <Area type="monotone" dataKey="total" stroke="#03512A" fill="#03512A" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={[
                  { month: 'Jan', labor: 12000, materials: 8000, equipment: 5000 },
                  { month: 'Feb', labor: 14000, materials: 9000, equipment: 5000 },
                  { month: 'Mar', labor: 16000, materials: 10000, equipment: 6000 },
                  { month: 'Apr', labor: 15000, materials: 9500, equipment: 4500 },
                  { month: 'May', labor: 18000, materials: 11000, equipment: 6000 },
                  { month: 'Jun', labor: 20000, materials: 12000, equipment: 6000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="labor" stroke="#03512A" strokeWidth={2} />
                  <Line type="monotone" dataKey="materials" stroke="#22C55E" strokeWidth={2} />
                  <Line type="monotone" dataKey="equipment" stroke="#86EFAC" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <div className="grid gap-4">
            {[
              {
                id: '1',
                type: 'cost_spike',
                severity: 'high',
                description: 'Labor costs 45% above expected range',
                value: 28500,
                expectedValue: 19600,
                variance: 45.4,
                date: '2025-01-10',
                category: 'Labor'
              },
              {
                id: '2',
                type: 'unusual_pattern',
                severity: 'medium',
                description: 'Unusual equipment usage pattern detected',
                value: 8200,
                expectedValue: 6100,
                variance: 34.4,
                date: '2025-01-08',
                category: 'Equipment'
              },
              {
                id: '3',
                type: 'rate_deviation',
                severity: 'low',
                description: 'Material rates deviated from approved tables',
                value: 3400,
                expectedValue: 3800,
                variance: -10.5,
                date: '2025-01-05',
                category: 'Materials'
              }
            ].map((anomaly) => (
              <Card key={anomaly.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(anomaly.severity)}`}>
                        {getAnomalyIcon(anomaly.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{anomaly.description}</h4>
                          <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {anomaly.category} • {anomaly.date}
                        </p>
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Actual:</span> ${anomaly.value.toLocaleString()} • 
                          <span className="font-medium"> Expected:</span> ${anomaly.expectedValue.toLocaleString()} • 
                          <span className={`font-medium ${anomaly.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {anomaly.variance > 0 ? '+' : ''}{anomaly.variance.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Investigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Predictions</CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-powered predictions based on historical data and trends
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={[
                  { month: 'Jul', actual: 38000, predicted: 41000, confidence: 0.85 },
                  { month: 'Aug', actual: null, predicted: 43000, confidence: 0.82 },
                  { month: 'Sep', actual: null, predicted: 45000, confidence: 0.78 },
                  { month: 'Oct', actual: null, predicted: 42000, confidence: 0.75 },
                  { month: 'Nov', actual: null, predicted: 44000, confidence: 0.72 },
                  { month: 'Dec', actual: null, predicted: 46000, confidence: 0.70 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value?.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#03512A" strokeWidth={2} />
                  <Line type="monotone" dataKey="predicted" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}