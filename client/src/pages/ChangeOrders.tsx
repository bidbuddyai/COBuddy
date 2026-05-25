import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ChangeOrder, Project, ChangeOrderLog } from '@shared/schema';
import { FileText, Plus, Search, Filter, Download, Eye, Edit, Building, FileSpreadsheet, FileImage, Folder, ArrowLeft, ClipboardList, MessageSquare, Calendar, User } from 'lucide-react';
import ProjectSelector from '@/components/ProjectSelector';
import ChangeOrderTemplates from '@/components/ChangeOrderTemplates';
import ChangeOrderForm from '@/components/ChangeOrderForm';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

// Component to show recent logs
function RecentLogs({ projectId, changeOrderId, limit = 5 }: { projectId: number; changeOrderId: number; limit?: number }) {
  const { data: logs = [], isLoading } = useQuery<ChangeOrderLog[]>({
    queryKey: [`/api/projects/${projectId}/co-logs?changeOrderId=${changeOrderId}`],
    enabled: !!projectId && !!changeOrderId,
  });

  const recentLogs = logs.slice(0, limit);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading activity...</div>;
  }

  if (recentLogs.length === 0) {
    return <div className="text-sm text-gray-500">No activity logged yet</div>;
  }

  return (
    <div className="space-y-3">
      {recentLogs.map((log) => (
        <div key={log.id} className="flex items-start space-x-3 text-sm">
          <div className="flex-shrink-0 mt-0.5">
            {log.logType === 'meeting' && <User className="h-4 w-4 text-blue-500" />}
            {log.logType === 'decision' && <FileText className="h-4 w-4 text-green-500" />}
            {log.logType === 'phone_call' && <MessageSquare className="h-4 w-4 text-purple-500" />}
            {!['meeting', 'decision', 'phone_call'].includes(log.logType) && <ClipboardList className="h-4 w-4 text-gray-500" />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">{log.subject}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{log.description?.substring(0, 100)}...</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(log.createdAt ? new Date(log.createdAt) : new Date(), 'MMM dd, yyyy')}
              </span>
              <span>{log.createdBy}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChangeOrders() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract change order ID from URL
  const changeOrderId = location.match(/^\/change-orders\/(\d+)$/)?.[1];
  const isViewingSpecificChangeOrder = !!changeOrderId;

  const { data: changeOrdersData, isLoading } = useQuery<{
    data: ChangeOrder[];
    total: number;
  }>({
    queryKey: ['/api/change-orders', { 
      projectId: selectedProjectId,
      page: currentPage,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }],
    enabled: !!selectedProjectId && !isViewingSpecificChangeOrder,
  });

  // Query for specific change order when viewing individual ID
  const { data: specificChangeOrder, isLoading: isLoadingSpecific } = useQuery<ChangeOrder>({
    queryKey: ['/api/change-orders', changeOrderId],
    enabled: isViewingSpecificChangeOrder,
  });

  // Query for project info when viewing specific change order
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', specificChangeOrder?.projectId],
    enabled: !!specificChangeOrder?.projectId,
  });

  const changeOrders = changeOrdersData?.data || [];
  const totalChangeOrders = changeOrdersData?.total || 0;

  const createChangeOrder = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/change-orders', {
        ...data,
        projectId: selectedProjectId,
        totalAmount: data.totalAmount || '0'
      });
    },
    onSuccess: () => {
      toast({
        title: "Change Order Created",
        description: "The change order has been created successfully.",
      });
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create change order",
        variant: "destructive",
      });
    },
  });

  const handleExport = async (id: number, format: 'excel' | 'pdf') => {
    try {
      const endpoint = format === 'excel' 
        ? `/api/change-orders/${id}/excel`
        : `/api/change-orders/${id}/pdf`;
      
      const response = await apiRequest('GET', endpoint);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CO-${id}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: `Change order exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export change order as ${format}.`,
        variant: "destructive",
      });
    }
  };

  const handleProjectExport = async (format: 'excel' | 'pdf') => {
    if (!selectedProjectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const endpoint = `/api/projects/${selectedProjectId}/change-orders/export?format=${format}`;
      
      const response = await apiRequest('GET', endpoint);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${selectedProjectId}-change-order-log.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: `Change order log exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to export change order log as ${format}.`,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const filteredChangeOrders = changeOrders.filter(co =>
    co.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    co.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle individual change order view
  if (isViewingSpecificChangeOrder) {
    if (isLoadingSpecific) {
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/change-orders')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Change Orders
            </Button>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </div>
      );
    }

    if (!specificChangeOrder) {
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/change-orders')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Change Orders
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Change Order Not Found</h3>
              <p className="text-gray-500">The change order you're looking for doesn't exist or has been deleted.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/change-orders')}
              className="flex items-center"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Back to Change Orders</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {specificChangeOrder.title}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                {project?.name || 'Loading project...'} • {specificChangeOrder.number || `CO-${specificChangeOrder.id}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => handleExport(specificChangeOrder.id, 'excel')}
              className="flex items-center text-sm"
              size="sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1 md:mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExport(specificChangeOrder.id, 'pdf')}
              className="flex items-center text-sm"
              size="sm"
            >
              <FileImage className="h-4 w-4 mr-1 md:mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Change Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Change Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(specificChangeOrder.status)}>
                        {specificChangeOrder.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Amount</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(specificChangeOrder.totalAmount || 0)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</label>
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {specificChangeOrder.description || 'No description provided'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Labor Cost</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {formatCurrency(specificChangeOrder.laborAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Material Cost</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {formatCurrency(specificChangeOrder.materialAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Equipment Cost</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {formatCurrency(specificChangeOrder.equipmentAmount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Disposal Cost</label>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {formatCurrency(specificChangeOrder.disposalAmount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center"
                  onClick={() => handleExport(specificChangeOrder.id, 'excel')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center"
                  onClick={() => handleExport(specificChangeOrder.id, 'pdf')}
                >
                  <FileImage className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {specificChangeOrder.status === 'draft' && (
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Change Order
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Communication & Documentation */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Communication & Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center"
                  onClick={() => setLocation(`/projects/${specificChangeOrder.projectId}/co-logs/${specificChangeOrder.id}`)}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View Activity Logs
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center"
                  onClick={() => setLocation(`/projects/${specificChangeOrder.projectId}/co-logs`)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  All Project Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Recent Logs Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation(`/projects/${specificChangeOrder.projectId}/co-logs/${specificChangeOrder.id}`)}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RecentLogs 
              projectId={specificChangeOrder.projectId || 0} 
              changeOrderId={specificChangeOrder.id} 
              limit={5} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Change Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            Manage and track change orders for your projects
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsTemplatesModalOpen(true)}
            disabled={!selectedProjectId}
            size="sm"
            className="text-sm"
          >
            <Folder className="h-4 w-4 mr-1 md:mr-2" />
            Templates
          </Button>
          <Button 
            disabled={!selectedProjectId}
            onClick={() => {
              console.log('New Change Order button clicked');
              console.log('Selected Project ID:', selectedProjectId);
              console.log('Setting isCreateModalOpen to true');
              setIsCreateModalOpen(true);
            }}
            size="sm"
            className="text-sm"
          >
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            New Change Order
          </Button>
        </div>
      </div>

      {/* Project Selection - Prominent */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Select Project:</h3>
          </div>
          <div className="mt-2">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectSelect={setSelectedProjectId}
            />
          </div>
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a project to view its change orders.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters and Export */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search change orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleProjectExport('excel')}
                title="Export project change order log as Excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Log (Excel)
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleProjectExport('pdf')}
                title="Export project change order log as PDF"
              >
                <FileImage className="h-4 w-4 mr-2" />
                Export Log (PDF)
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {totalChangeOrders}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {changeOrders.filter(co => co.status === 'pending').length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Approved</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {changeOrders.filter(co => co.status === 'approved').length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(changeOrders.reduce((sum, co) => sum + (Number(co.totalAmount) || 0), 0))}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">$</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Change Orders List */}
          <Card>
            <CardHeader>
              <CardTitle>Change Orders ({filteredChangeOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredChangeOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No change orders found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new change order.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredChangeOrders.map((changeOrder) => (
                    <div
                      key={changeOrder.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {changeOrder.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {changeOrder.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {formatCurrency(changeOrder.totalAmount || 0)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {changeOrder.createdAt ? new Date(changeOrder.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(changeOrder.status)}>
                          {changeOrder.status}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Export as Excel"
                            onClick={() => handleExport(changeOrder.id, 'excel')}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Export as PDF"
                            onClick={() => handleExport(changeOrder.id, 'pdf')}
                          >
                            <FileImage className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Change Order Templates Modal */}
      <ChangeOrderTemplates
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={(template) => {
          // Template selection will be handled in the form
          setIsCreateModalOpen(true);
        }}
      />
      
      {/* Change Order Form Modal */}
      <ChangeOrderForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createChangeOrder.mutate(data)}
        projectId={selectedProjectId}
        isSubmitting={createChangeOrder.isPending}
      />
    </div>
  );
}
