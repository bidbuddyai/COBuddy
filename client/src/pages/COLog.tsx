import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Plus, Download, Upload, ChevronDown, ChevronRight, FileSpreadsheet, AlertCircle, Check, X, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useProject } from '@/contexts/ProjectContext';
import type { ChangeOrder, SubcontractorChangeOrder, Project } from '@shared/schema';

export function COLog() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { selectedProjectId, setSelectedProjectId } = useProject();
  
  // State
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ coId: number, field: string } | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects']
  });

  // Fetch change orders for selected project
  const { data: changeOrdersData, isLoading: changeOrdersLoading, refetch: refetchChangeOrders } = useQuery<{ data: ChangeOrder[]; total: number }>({
    queryKey: ['/api/change-orders', { projectId: selectedProjectId }],
    enabled: !!selectedProjectId
  });
  
  const changeOrders = changeOrdersData?.data || [];

  // Fetch SCOs for expanded change orders
  const { data: allScos } = useQuery<SubcontractorChangeOrder[]>({
    queryKey: ['/api/subcontractor-change-orders', selectedProjectId],
    enabled: !!selectedProjectId && expandedRows.size > 0,
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await fetch(`/api/subcontractor-change-orders?projectId=${selectedProjectId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch SCOs');
      return response.json();
    }
  });

  // Fetch CO Log summary
  const { data: summary } = useQuery({
    queryKey: ['/api/co-logs/summary', selectedProjectId],
    enabled: !!selectedProjectId,
    queryFn: async () => {
      const response = await fetch(`/api/co-logs/summary?projectId=${selectedProjectId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    }
  });

  // Export CO Log mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('No project selected');
      
      const response = await fetch(`/api/co-logs/export?projectId=${selectedProjectId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CO_Log_${selectedProjectId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'CO Log exported successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Import CO Log mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!selectedProjectId) throw new Error('No project selected');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProjectId.toString());
      
      const response = await fetch('/api/co-logs/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Import Successful',
        description: `Imported ${data.imported} change orders. ${data.errors.length > 0 ? `${data.errors.length} errors occurred.` : ''}`
      });
      refetchChangeOrders();
      setImportFile(null);
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update change order mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<ChangeOrder> }) => {
      const response = await fetch(`/api/change-orders/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Update failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/co-logs/summary'] });
      setEditingCell(null);
      toast({
        title: 'Success',
        description: 'Change order updated'
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Handlers
  const toggleRowExpansion = (coId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(coId)) {
      newExpanded.delete(coId);
    } else {
      newExpanded.add(coId);
    }
    setExpandedRows(newExpanded);
  };

  const startEditing = (coId: number, field: string, currentValue: any) => {
    setEditingCell({ coId, field });
    setTempEditValue(currentValue?.toString() || '');
  };

  const saveEdit = (coId: number, field: string) => {
    const updates = { [field]: tempEditValue };
    updateMutation.mutate({ id: coId, updates });
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setTempEditValue('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const formatCurrency = (value: any) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'MM/dd/yyyy');
    } catch {
      return '-';
    }
  };

  // Group SCOs by change order
  const scosByChangeOrder = useMemo(() => {
    const grouped: Record<number, SubcontractorChangeOrder[]> = {};
    if (allScos) {
      allScos.forEach(sco => {
        if (sco.gcChangeOrderId) {
          if (!grouped[sco.gcChangeOrderId]) {
            grouped[sco.gcChangeOrderId] = [];
          }
          grouped[sco.gcChangeOrderId].push(sco);
        }
      });
    }
    return grouped;
  }, [allScos]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Change Order Log</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/change-orders/new')}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-new-co"
          >
            <Plus className="mr-2 h-4 w-4" />
            New CO
          </Button>
        </div>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProjectId?.toString() || ''}
            onValueChange={(value) => setSelectedProjectId(parseInt(value))}
          >
            <SelectTrigger className="w-full" data-testid="select-project">
              <SelectValue placeholder="Choose a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem 
                  key={project.id} 
                  value={project.id.toString()}
                  data-testid={`project-${project.id}`}
                >
                  {project.name} ({project.number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{summary.gcCount || 0}</div>
                  <p className="text-sm text-muted-foreground">Total COs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(summary.gcAmountSubmitted)}</div>
                  <p className="text-sm text-muted-foreground">GC Submitted</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(summary.gcAmountApproved)}</div>
                  <p className="text-sm text-muted-foreground">GC Approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatCurrency(summary.variance)}</div>
                  <p className="text-sm text-muted-foreground">Variance</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Import/Export Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Import/Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  data-testid="button-export"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
                
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="max-w-xs"
                    data-testid="input-import-file"
                  />
                  <Button
                    onClick={() => importFile && importMutation.mutate(importFile)}
                    disabled={!importFile || importMutation.isPending}
                    data-testid="button-import"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const response = await fetch('/api/co-logs/template');
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'CO_Log_Template.xlsx';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-download-template"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
              
              {importMutation.data?.errors?.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">Import Errors:</div>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {importMutation.data.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* CO Log Table */}
          <Card>
            <CardHeader>
              <CardTitle>Change Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {changeOrdersLoading ? (
                <div className="text-center py-8">Loading change orders...</div>
              ) : changeOrders?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No change orders found. Create one or import from Excel.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>CO #</TableHead>
                      <TableHead>RFC #</TableHead>
                      <TableHead>GC CO #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders?.map((co) => (
                      <>
                        <TableRow key={co.id} data-testid={`co-row-${co.id}`}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(co.id)}
                              data-testid={`expand-${co.id}`}
                            >
                              {expandedRows.has(co.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          
                          <TableCell>{co.number}</TableCell>
                          
                          <TableCell>
                            {editingCell?.coId === co.id && editingCell?.field === 'gcRfcNumber' ? (
                              <div className="flex gap-1">
                                <Input
                                  value={tempEditValue}
                                  onChange={(e) => setTempEditValue(e.target.value)}
                                  className="h-8 w-24"
                                  data-testid={`edit-rfc-${co.id}`}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => saveEdit(co.id, 'gcRfcNumber')}
                                  data-testid={`save-rfc-${co.id}`}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={cancelEdit}
                                  data-testid={`cancel-rfc-${co.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-1"
                                onClick={() => startEditing(co.id, 'gcRfcNumber', co.gcRfcNumber)}
                                data-testid={`rfc-value-${co.id}`}
                              >
                                {co.gcRfcNumber || '-'}
                                <Edit2 className="h-3 w-3 opacity-50" />
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {editingCell?.coId === co.id && editingCell?.field === 'gcCoNumber' ? (
                              <div className="flex gap-1">
                                <Input
                                  value={tempEditValue}
                                  onChange={(e) => setTempEditValue(e.target.value)}
                                  className="h-8 w-24"
                                  data-testid={`edit-gcco-${co.id}`}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => saveEdit(co.id, 'gcCoNumber')}
                                  data-testid={`save-gcco-${co.id}`}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={cancelEdit}
                                  data-testid={`cancel-gcco-${co.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-1"
                                onClick={() => startEditing(co.id, 'gcCoNumber', co.gcCoNumber)}
                                data-testid={`gcco-value-${co.id}`}
                              >
                                {co.gcCoNumber || '-'}
                                <Edit2 className="h-3 w-3 opacity-50" />
                              </div>
                            )}
                          </TableCell>
                          
                          <TableCell className="max-w-[300px] truncate">
                            {co.description}
                          </TableCell>
                          
                          <TableCell>
                            {formatCurrency(co.amountSubmitted || co.totalAmount || 0)}
                          </TableCell>
                          
                          <TableCell>
                            {formatCurrency(co.amountApproved || 0)}
                          </TableCell>
                          
                          <TableCell>
                            <Badge 
                              variant={co.status === 'approved' ? 'default' : 
                                      co.status === 'submitted' ? 'outline' : 
                                      'secondary'}
                              className={co.status === 'approved' ? 'bg-green-500 text-white' : 
                                        co.status === 'submitted' ? 'bg-yellow-500 text-white' : 
                                        ''}
                              data-testid={`status-${co.id}`}
                            >
                              {co.status}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/change-orders/${co.id}`)}
                              data-testid={`view-${co.id}`}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded SCOs */}
                        {expandedRows.has(co.id) && scosByChangeOrder[co.id] && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/50">
                              <div className="pl-12 py-2">
                                <div className="font-semibold mb-2">Subcontractor Change Orders</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>SCO #</TableHead>
                                      <TableHead>Subcontractor</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead>Amount</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {scosByChangeOrder[co.id].map((sco) => (
                                      <TableRow key={sco.id} data-testid={`sco-row-${sco.id}`}>
                                        <TableCell>{sco.scoNumber || sco.ccoNumber || '-'}</TableCell>
                                        <TableCell>Subcontractor {sco.subcontractorId}</TableCell>
                                        <TableCell>{sco.notes || '-'}</TableCell>
                                        <TableCell>{formatCurrency(sco.amountSubmitted || 0)}</TableCell>
                                        <TableCell>
                                          <Badge 
                                            variant={sco.status === 'approved' ? 'default' : 'secondary'}
                                            className={sco.status === 'approved' ? 'bg-green-500 text-white' : ''}
                                          >
                                            {sco.status}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
