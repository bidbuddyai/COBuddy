import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileText, 
  DollarSign,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  FileImage,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Sparkles,
  MessageSquare,
  Zap,
  BarChart3
} from 'lucide-react';
import type { ChangeOrder, Project } from '@shared/schema';
import { PlayfulLoadingAnimation } from '@/components/PlayfulLoadingAnimations';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function ChangeOrderLogs() {
  const { projectId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(val) || 0);
  };

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch change orders for this project
  const { data: changeOrdersResponse, isLoading: ordersLoading } = useQuery<{ data: ChangeOrder[]; total: number }>({
    queryKey: [`/api/change-orders`, { projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/change-orders?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch change orders");
      return res.json();
    },
    enabled: !!projectId,
  });

  const changeOrders = changeOrdersResponse?.data || [];

  const isLoading = projectLoading || ordersLoading;

  // Filter change orders based on search
  const filteredOrders = changeOrders.filter(order => 
    order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totals = filteredOrders.reduce((acc, order) => {
    const orderTotal = Number(order.laborAmount || 0) + Number(order.materialAmount || 0) + 
                      Number(order.equipmentAmount || 0) +
                      Number(order.disposalAmount || 0) + Number(order.importAmount || 0) + 
                      Number(order.subcontractorAmount || 0);
    
    acc.total += orderTotal;
    acc.approved += order.status === 'approved' ? orderTotal : 0;
    acc.pending += order.status === 'pending' ? orderTotal : 0;
    acc.draft += order.status === 'draft' ? orderTotal : 0;
    
    return acc;
  }, { total: 0, approved: 0, pending: 0, draft: 0 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleExport = async (id: number, format: 'excel' | 'pdf') => {
    try {
      const endpoint = format === 'excel' 
        ? `/api/change-orders/${id}/excel`
        : `/api/change-orders/${id}/pdf`;
      
      const response = await apiRequest('GET', endpoint);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `change-order-${id}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Success',
        description: `Change order exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export change order',
        variant: 'destructive',
      });
    }
  };
  
  const handleExportAll = async (format: 'excel' | 'pdf') => {
    try {
      const response = await apiRequest('GET', `/api/projects/${projectId}/change-orders/export?format=${format}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${project?.number || 'project'}-change-order-log.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Success',
        description: `All change orders exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export change order log',
        variant: 'destructive',
      });
    }
  };



  if (isLoading) {
    return <PlayfulLoadingAnimation stage="analyzing" />;
  }

  if (!project) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Change Order Log
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {project.name} • {project.number}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportAll('excel')}
              className="hidden md:flex"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportAll('pdf')}
              className="hidden md:flex"
            >
              <FileImage className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
        
        {/* Mobile Export Buttons */}
        <div className="flex gap-2 md:hidden">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExportAll('excel')}
            className="flex-1"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleExportAll('pdf')}
            className="flex-1"
          >
            <FileImage className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* AI-Powered Features Banner */}
      <div className="bg-[var(--mint-highlight)] dark:bg-[var(--deep-green)] border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-4 md:p-6 text-[var(--deep-green)] dark:text-[var(--foreground)] mb-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-2 text-emerald-850 dark:text-emerald-300">
              <Sparkles className="h-5 w-5 text-[var(--primary)] dark:text-[var(--accent)] animate-pulse" />
              AI-Powered Change Order Creation
            </h2>
            <p className="text-sm md:text-base text-emerald-900/80 dark:text-emerald-100/80">
              Upload T&M sheets or invoices and let AI instantly create change orders with your pre-loaded rates
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Link href={`/projects/${projectId}/documents`}>
              <Button className="bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-400 w-full sm:w-auto border-none">
                <Upload className="h-4 w-4 mr-2" />
                Upload T&M
              </Button>
            </Link>
            <Button 
              variant="outline"
              className="bg-white dark:bg-card text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-850 hover:bg-emerald-50 dark:hover:bg-emerald-950 w-full sm:w-auto"
              onClick={() => {
                const event = new CustomEvent('open-ai-assistant', { 
                  detail: { message: `Help me create a change order for project ${project?.name}` } 
                });
                window.dispatchEvent(event);
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with AI
            </Button>
          </div>
        </div>
        
        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/60 text-emerald-850 dark:text-emerald-250">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--primary)] dark:text-[var(--accent)]" />
            <span className="text-sm font-medium">Instant CO creation from uploads</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--primary)] dark:text-[var(--accent)]" />
            <span className="text-sm font-medium">Pre-loaded company rates</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--primary)] dark:text-[var(--accent)]" />
            <span className="text-sm font-medium">AI validates & matches rates</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total COs</p>
                <p className="text-xl md:text-2xl font-bold">{filteredOrders.length}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-lg md:text-xl font-bold">{formatCurrency(totals.total)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-lg md:text-xl font-bold text-green-600">{formatCurrency(totals.approved)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-lg md:text-xl font-bold text-yellow-600">{formatCurrency(totals.pending)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by CO number or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href={`/change-orders?project=${projectId}`}>
          <Button className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Change Order
          </Button>
        </Link>
      </div>

      {/* Change Orders Table - Mobile */}
      <div className="block md:hidden space-y-3">
        {filteredOrders.map((order) => {
          const total = Number(order.laborAmount || 0) + Number(order.materialAmount || 0) + 
                       Number(order.equipmentAmount || 0) +
                       Number(order.disposalAmount || 0) + Number(order.importAmount || 0) + 
                       Number(order.subcontractorAmount || 0);
          
          return (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {order.number}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {order.description}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(total)}
                  </span>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Link href={`/change-orders/${order.id}`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport(order.id, 'excel')}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport(order.id, 'pdf')}
                  >
                    <FileImage className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Change Orders Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CO Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Open
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => {
                  const total = Number(order.laborAmount || 0) + Number(order.materialAmount || 0) + 
                               Number(order.equipmentAmount || 0) +
                               Number(order.disposalAmount || 0) + Number(order.importAmount || 0) + 
                               Number(order.subcontractorAmount || 0);
                  
                  const daysOpen = order.createdAt ? Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {order.number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {order.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {order.status === 'approved' ? (
                          <span className="text-green-600">Closed</span>
                        ) : (
                          <span className={daysOpen > 30 ? 'text-red-600 font-medium' : ''}>
                            {daysOpen} days
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/change-orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleExport(order.id, 'excel')}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleExport(order.id, 'pdf')}
                          >
                            <FileImage className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No change orders found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Create your first change order for this project'}
            </p>
            <Link href={`/change-orders?project=${projectId}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Change Order
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
