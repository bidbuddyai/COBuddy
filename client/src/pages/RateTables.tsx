import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Upload, CheckCircle, AlertCircle, Clock, Eye, Download, Filter, Search } from "lucide-react";
import { RateTable } from "@shared/schema";

export default function RateTables() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<RateTable | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rateTables, isLoading } = useQuery<RateTable[]>({
    queryKey: ["/api/rate-tables"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('PUT', `/api/rate-tables/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rate-tables"] });
      toast({
        title: "Rate table approved",
        description: "The rate table has been approved and is now active.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to approve rate table",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'labor':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'equipment':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'material':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'disposal':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'import':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (isApproved: boolean) => {
    return isApproved ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <Clock className="h-4 w-4 text-yellow-600" />
    );
  };

  const filteredTables = rateTables?.filter(table => {
    const matchesType = !typeFilter || table.type === typeFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'approved' && table.isApproved) ||
      (statusFilter === 'pending' && !table.isApproved);
    const matchesSearch = !searchTerm || 
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.region?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const stats = [
    {
      label: "Total Rate Tables",
      value: rateTables?.length || 0,
      icon: Database,
      color: "bg-blue-100 text-blue-600"
    },
    {
      label: "Approved",
      value: rateTables?.filter(rt => rt.isApproved).length || 0,
      icon: CheckCircle,
      color: "bg-green-100 text-green-600"
    },
    {
      label: "Pending Review",
      value: rateTables?.filter(rt => !rt.isApproved).length || 0,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      label: "Labor Tables",
      value: rateTables?.filter(rt => rt.type === 'labor').length || 0,
      icon: Database,
      color: "bg-purple-100 text-purple-600"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Rate Tables</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and review extracted rate tables from PDF documents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Rate PDF
          </Button>
          <Button variant="outline">
            Export All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="transition-all duration-200 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {stat.value}
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

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rate Tables</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rate tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="disposal">Disposal</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Extracted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredTables?.map((table) => (
                    <TableRow key={table.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{table.name}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(table.type)}>
                          {table.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {table.region || 'N/A'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {new Date(table.effectiveDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={table.isApproved ? 
                          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        }>
                          {getStatusIcon(table.isApproved)}
                          <span className="ml-1">
                            {table.isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {new Date(table.extractedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table);
                              setViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {!table.isApproved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => approveMutation.mutate(table.id)}
                              disabled={approveMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              {approveMutation.isPending ? (
                                <div className="loading-spinner w-4 h-4"></div>
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Rate Table Details</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Name</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTable.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Type</h4>
                  <Badge className={getTypeColor(selectedTable.type)}>
                    {selectedTable.type}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Region</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTable.region || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Effective Date</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(selectedTable.effectiveDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Rate Entries</h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {selectedTable.data && typeof selectedTable.data === 'object' ? (
                    <div className="space-y-2">
                      {((selectedTable.data as any).entries || []).map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                          <div>
                            <p className="text-sm font-medium">{entry.description}</p>
                            {entry.code && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Code: {entry.code}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${entry.rate}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{entry.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No rate entries available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
