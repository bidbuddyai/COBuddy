import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Upload, CheckCircle, AlertCircle, Clock, Eye, Download, Filter, Search, Edit, Save, X } from "lucide-react";
import { RateTable } from "@shared/schema";
import { useDropzone } from "react-dropzone";
import { PlayfulLoadingAnimation } from "@/components/PlayfulLoadingAnimations";

// Caltrans uploader component
function CaltransUploader() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const uploadCaltransRates = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/rate-tables/caltrans/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Imported ${result.totalImported} Caltrans rates successfully!`
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/rate-tables"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload Caltrans rates",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        uploadCaltransRates(acceptedFiles[0]);
      }
    },
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });
  
  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center">
            <Database className="h-12 w-12 text-gray-400 mb-3 animate-pulse" />
            <p className="text-sm text-gray-600">Uploading Caltrans rates...</p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm text-gray-600">Drop the CSV file here...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Database className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              Drag and drop Caltrans CSV file here, or click to select
            </p>
            <p className="text-xs text-gray-500">Only CSV files are accepted</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RateTables() {
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<RateTable | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRates, setEditedRates] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get user data to check if admin
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

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

  const updateRatesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/rate-tables/${id}`, { data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rate-tables"] });
      toast({
        title: "Rates updated",
        description: "The rate table has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update rates",
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
    const matchesType = !typeFilter || typeFilter === 'all' || table.type === typeFilter;
    const matchesStatus = !statusFilter || statusFilter === 'all' || 
      (statusFilter === 'approved' && table.isApproved) ||
      (statusFilter === 'pending' && !table.isApproved);
    
    // Enhanced search: search in table name, region, and rate entries
    if (!searchTerm) return matchesType && matchesStatus;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in table name and region
    if (table.name.toLowerCase().includes(searchLower) ||
        table.region?.toLowerCase().includes(searchLower)) {
      return matchesType && matchesStatus;
    }
    
    // Search within rate entries
    const data = table.data;
    let entries: any[] = [];
    
    if (Array.isArray(data)) {
      entries = data;
    } else if (data && typeof data === 'object' && 'entries' in data) {
      entries = (data as any).entries || [];
    }
    
    // Search in rate descriptions, codes, units
    const matchesRateEntry = entries.some(entry => {
      return (
        entry.description?.toLowerCase().includes(searchLower) ||
        entry.code?.toLowerCase().includes(searchLower) ||
        entry.unit?.toLowerCase().includes(searchLower) ||
        entry.rate?.toString().includes(searchTerm)
      );
    });
    
    return matchesType && matchesStatus && matchesRateEntry;
  });

  // Handle opening the view modal
  const handleViewTable = (table: RateTable) => {
    setSelectedTable(table);
    
    // Extract rates based on data structure
    const data = table.data;
    let entries: any[] = [];
    
    if (Array.isArray(data)) {
      entries = data;
    } else if (data && typeof data === 'object' && 'entries' in data) {
      entries = (data as any).entries || [];
    } else if (data && typeof data === 'object') {
      entries = Object.values(data);
    }
    
    setEditedRates(entries.map(entry => ({ ...entry })));
    setViewModalOpen(true);
    setIsEditing(false);
  };

  // Handle rate changes
  const handleRateChange = (index: number, field: string, value: string) => {
    const updatedRates = [...editedRates];
    if (field === 'rate') {
      const numValue = parseFloat(value);
      updatedRates[index][field] = isNaN(numValue) ? 0 : numValue;
    } else {
      updatedRates[index][field] = value;
    }
    setEditedRates(updatedRates);
  };

  // Save edited rates
  const handleSaveRates = () => {
    if (!selectedTable) return;
    
    const updatedData = { ...selectedTable.data };
    if (Array.isArray(updatedData)) {
      updateRatesMutation.mutate({ id: selectedTable.id, data: editedRates });
    } else if (updatedData && typeof updatedData === 'object' && 'entries' in updatedData) {
      updateRatesMutation.mutate({ id: selectedTable.id, data: { ...updatedData, entries: editedRates } });
    } else {
      updateRatesMutation.mutate({ id: selectedTable.id, data: editedRates });
    }
  };

  // Calculate comprehensive statistics
  const totalRates = rateTables?.reduce((sum, table) => 
    sum + (Array.isArray(table.data) ? table.data.length : 0), 0) || 0;
  const equipmentCount = rateTables?.filter(table => table.type === 'equipment')
    .reduce((sum, table) => sum + (Array.isArray(table.data) ? table.data.length : 0), 0) || 0;
  const materialCount = rateTables?.filter(table => table.type === 'material')
    .reduce((sum, table) => sum + (Array.isArray(table.data) ? table.data.length : 0), 0) || 0;

  const stats = [
    {
      label: "Total Rates",
      value: totalRates,
      icon: Database,
      color: "bg-blue-100 text-blue-600"
    },
    {
      label: "Equipment Rates",
      value: equipmentCount,
      icon: CheckCircle,
      color: "bg-green-100 text-green-600"
    },
    {
      label: "Material Rates",
      value: materialCount,
      icon: Clock,
      color: "bg-purple-100 text-purple-600"
    },
    {
      label: "Approved Tables",
      value: rateTables?.filter(rt => rt.isApproved).length || 0,
      icon: CheckCircle,
      color: "bg-emerald-100 text-emerald-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Rate Tables</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive rate database
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <PlayfulLoadingAnimation 
            stage="matching" 
            message="CO Buddy is loading your rate tables..."
            size="lg"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Rate Tables</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive rate database with {totalRates} approved rates across {rateTables?.length || 0} tables
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Rate PDF
          </Button>
          {user?.role === 'admin' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Upload Caltrans Rates
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Caltrans Rates</DialogTitle>
                  <DialogDescription>
                    Upload official California Department of Transportation equipment rental rates in CSV format.
                    These rates will be available to all companies.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <CaltransUploader />
                </div>
              </DialogContent>
            </Dialog>
          )}
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
                  <SelectItem value="all">All Types</SelectItem>
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
                  <SelectItem value="all">All Status</SelectItem>
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
                  <TableHead>Rate Count</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
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
                      <TableCell>
                        <Badge variant="secondary">
                          {Array.isArray(table.data) ? table.data.length : 
                           (table.data && typeof table.data === 'object' && Array.isArray((table.data as any).entries)) ? 
                           (table.data as any).entries.length : 0} rates
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {new Date(table.effectiveDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={table.isApproved ? 
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          }>
                            {getStatusIcon(table.isApproved)}
                            <span className="ml-1">
                              {table.isApproved ? 'Approved' : 'Pending'}
                            </span>
                          </Badge>
                          {table.companyId === null && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700">
                              Public
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTable(table)}
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
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Rate Table Details</DialogTitle>
            <DialogDescription className="sr-only">View and edit rate table entries</DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 gap-4 flex-1">
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
                <div className="flex items-center space-x-2">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Rates
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveRates} disabled={updateRatesMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={() => {
                        setIsEditing(false);
                        handleViewTable(selectedTable);
                      }} variant="outline">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Rate Entries</h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  {editedRates.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No rate entries available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-900">
                          <tr>
                            {editedRates[0]?.code !== undefined && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>}
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                            {editedRates[0]?.unit !== undefined && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {editedRates.map((entry: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              {entry.code !== undefined && (
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <Input
                                      value={entry.code || ''}
                                      onChange={(e) => handleRateChange(index, 'code', e.target.value)}
                                      className="w-24 h-8 text-sm"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{entry.code}</span>
                                  )}
                                </td>
                              )}
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <Input
                                    value={entry.description || entry.item || entry.name || ''}
                                    onChange={(e) => handleRateChange(index, 'description', e.target.value)}
                                    className="w-full h-8 text-sm"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-900 dark:text-gray-100">
                                    {entry.description || entry.item || entry.name || 'N/A'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={entry.rate || 0}
                                    onChange={(e) => handleRateChange(index, 'rate', e.target.value)}
                                    className="w-24 h-8 text-sm text-right"
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    ${typeof entry.rate === 'number' ? entry.rate.toFixed(2) : entry.rate || '0.00'}
                                  </span>
                                )}
                              </td>
                              {entry.unit !== undefined && (
                                <td className="px-3 py-2">
                                  {isEditing ? (
                                    <Input
                                      value={entry.unit || ''}
                                      onChange={(e) => handleRateChange(index, 'unit', e.target.value)}
                                      className="w-20 h-8 text-sm"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{entry.unit}</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
