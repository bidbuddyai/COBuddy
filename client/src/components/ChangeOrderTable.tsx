import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChangeOrder } from '@shared/schema';
import { FileText, Download, Eye, Edit, MoreHorizontal } from 'lucide-react';

interface ChangeOrderTableProps {
  maxRows?: number;
  projectId?: number;
}

export default function ChangeOrderTable({ maxRows, projectId }: ChangeOrderTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const pageSize = maxRows || 10;

  const { data: changeOrdersData, isLoading } = useQuery<{
    data: ChangeOrder[];
    total: number;
  }>({
    queryKey: ['/api/change-orders', { 
      page: currentPage, 
      limit: pageSize, 
      status: statusFilter !== 'all' ? statusFilter : undefined,
      projectId 
    }],
    enabled: !!projectId,
  });

  const changeOrders = changeOrdersData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'draft':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Recent Change Orders</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {changeOrders.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No change orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new change order.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {changeOrders.map((changeOrder) => (
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
                        {formatCurrency(changeOrder.totalAmount)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(changeOrder.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(changeOrder.status)}>
                    {changeOrder.status}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/api/change-orders/${changeOrder.id}/excel`, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {changeOrder.status === 'draft' && (
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}