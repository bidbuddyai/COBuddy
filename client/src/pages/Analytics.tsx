import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, FileText, Calendar, AlertTriangle, Download, Filter } from "lucide-react";
import { ChangeOrder } from "@shared/schema";
import { DashboardStats, PaginatedResponse } from "@/types";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("3m");
  const [selectedMetric, setSelectedMetric] = useState("value");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: changeOrders } = useQuery<PaginatedResponse<ChangeOrder>>({
    queryKey: ["/api/change-orders"],
  });

  // Mock data for charts - in production, this would come from the API
  const monthlyData = [
    { month: 'Jan', value: 45000, count: 12, approved: 10, pending: 2 },
    { month: 'Feb', value: 52000, count: 15, approved: 12, pending: 3 },
    { month: 'Mar', value: 48000, count: 11, approved: 9, pending: 2 },
    { month: 'Apr', value: 61000, count: 18, approved: 15, pending: 3 },
    { month: 'May', value: 55000, count: 14, approved: 11, pending: 3 },
    { month: 'Jun', value: 67000, count: 20, approved: 17, pending: 3 },
  ];

  const statusData = [
    { name: 'Approved', value: changeOrders?.data.filter(co => co.status === 'approved').length || 0, color: '#10B981' },
    { name: 'Pending', value: changeOrders?.data.filter(co => co.status === 'pending').length || 0, color: '#F59E0B' },
    { name: 'Rejected', value: changeOrders?.data.filter(co => co.status === 'rejected').length || 0, color: '#EF4444' },
    { name: 'Draft', value: changeOrders?.data.filter(co => co.status === 'draft').length || 0, color: '#6B7280' },
  ];

  const typeData = [
    { name: 'Labor', value: 45, color: '#3B82F6' },
    { name: 'Equipment', value: 30, color: '#10B981' },
    { name: 'Materials', value: 20, color: '#8B5CF6' },
    { name: 'Other', value: 5, color: '#F59E0B' },
  ];

  const trendData = [
    { week: 'W1', thisYear: 12000, lastYear: 10000 },
    { week: 'W2', thisYear: 15000, lastYear: 12000 },
    { week: 'W3', thisYear: 18000, lastYear: 14000 },
    { week: 'W4', thisYear: 14000, lastYear: 16000 },
    { week: 'W5', thisYear: 20000, lastYear: 13000 },
    { week: 'W6', thisYear: 16000, lastYear: 15000 },
  ];

  const totalValue = changeOrders?.data.reduce((sum, co) => {
    return sum + (parseFloat(co.totalAmount?.toString() || '0'));
  }, 0) || 0;

  const averageValue = changeOrders?.data.length ? totalValue / changeOrders.data.length : 0;

  const topCostItems = [
    { name: 'Asbestos Removal - School Project', value: 45000, type: 'Labor', status: 'Approved' },
    { name: 'Excavator Rental - Office Complex', value: 32000, type: 'Equipment', status: 'Approved' },
    { name: 'Hazmat Disposal - Warehouse', value: 28000, type: 'Disposal', status: 'Pending' },
    { name: 'Additional Concrete - Parking Lot', value: 25000, type: 'Materials', status: 'Approved' },
    { name: 'Overtime Labor - Emergency Work', value: 22000, type: 'Labor', status: 'Approved' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Insights and trends for change orders and project costs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ${totalValue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">+12% from last period</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ${Math.round(averageValue).toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 mt-1">Per change order</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {changeOrders?.data.filter(co => {
                    const coDate = new Date(co.createdAt);
                    const now = new Date();
                    return coDate.getMonth() === now.getMonth() && coDate.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
                <p className="text-sm text-purple-600 mt-1">Change orders</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Approval Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {changeOrders?.data.length ? 
                    Math.round((changeOrders.data.filter(co => co.status === 'approved').length / changeOrders.data.length) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-green-600 mt-1">+5% from last period</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Change Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                    <Bar dataKey="value" fill="#03512A" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Year-over-Year Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="thisYear" stroke="#03512A" strokeWidth={2} name="This Year" />
                  <Line type="monotone" dataKey="lastYear" stroke="#94A3B8" strokeWidth={2} name="Last Year" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Count vs Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Cost Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCostItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          <Badge className={item.status === 'Approved' ? 
                            'bg-green-100 text-green-700' : 
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          ${item.value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Change order volume increased 12% this quarter
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Driven primarily by additional asbestos removal projects
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Average approval time decreased by 18%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        AI-powered processing has improved efficiency
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Equipment costs are trending 8% higher
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Consider negotiating better rental rates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        89% of documents processed automatically
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        High accuracy rate with minimal manual intervention
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
