import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  DollarSign, 
  Plus, 
  Search, 
  ArrowUpDown, 
  TrendingDown, 
  TrendingUp, 
  Percent, 
  FolderPlus, 
  Edit,
  MoreHorizontal,
  Info,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import type { BudgetLineItem, CostCode, Project } from '@shared/schema';

type BudgetLineItemWithCostCode = BudgetLineItem & { costCode: CostCode };

export default function Budget() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetLineItemWithCostCode | null>(null);

  // Form State - Budget Line Item
  const [formData, setFormData] = useState({
    costCodeId: '',
    originalBudget: '0.00',
    approvedChanges: '0.00',
    pendingChanges: '0.00',
    committedCosts: '0.00',
    forecastCost: '0.00',
    estimatedAtCompletion: '0.00',
  });

  // Form State - Cost Code Seeder
  const [codeFormData, setCodeFormData] = useState({
    code: '',
    name: '',
  });

  // Queries
  const { data: budgetItems = [], isLoading: budgetLoading } = useQuery<BudgetLineItemWithCostCode[]>({
    queryKey: [`/api/projects/${parsedProjectId}/budget`],
    enabled: !!parsedProjectId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: costCodes = [], isLoading: costCodesLoading } = useQuery<CostCode[]>({
    queryKey: ['/api/companies/current/cost-codes'],
  });

  // Mutations
  const createBudgetItem = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        projectId: parsedProjectId,
        costCodeId: parseInt(data.costCodeId, 10),
      };
      const response = await apiRequest('POST', `/api/projects/${parsedProjectId}/budget`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget Item Added",
        description: "The line item has been successfully added to the project budget.",
      });
      setIsItemDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/budget`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding budget item",
        description: error.message || "Failed to add budget line item.",
        variant: "destructive",
      });
    },
  });

  const updateBudgetItem = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const payload = {
        ...data,
        costCodeId: parseInt(data.costCodeId, 10),
      };
      const response = await apiRequest('PUT', `/api/budget-line-items/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget Item Updated",
        description: "The budget line item has been successfully updated.",
      });
      setIsItemDialogOpen(false);
      setEditingItem(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/budget`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating budget item",
        description: error.message || "Failed to update budget details.",
        variant: "destructive",
      });
    },
  });

  const createCostCode = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/companies/current/cost-codes', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cost Code Created",
        description: "New cost code created successfully. It is now selectable in the dropdown.",
      });
      setIsCodeDialogOpen(false);
      setCodeFormData({ code: '', name: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current/cost-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating cost code",
        description: error.message || "Failed to create cost code.",
        variant: "destructive",
      });
    },
  });

  // Helpers
  const resetForm = () => {
    setFormData({
      costCodeId: '',
      originalBudget: '0.00',
      approvedChanges: '0.00',
      pendingChanges: '0.00',
      committedCosts: '0.00',
      forecastCost: '0.00',
      estimatedAtCompletion: '0.00',
    });
  };

  const handleOpenCreateDialog = () => {
    setEditingItem(null);
    resetForm();
    setIsItemDialogOpen(true);
  };

  const handleOpenEditDialog = (item: BudgetLineItemWithCostCode) => {
    setEditingItem(item);
    setFormData({
      costCodeId: item.costCodeId.toString(),
      originalBudget: Number(item.originalBudget).toFixed(2),
      approvedChanges: Number(item.approvedChanges).toFixed(2),
      pendingChanges: Number(item.pendingChanges).toFixed(2),
      committedCosts: Number(item.committedCosts).toFixed(2),
      forecastCost: Number(item.forecastCost).toFixed(2),
      estimatedAtCompletion: Number(item.estimatedAtCompletion).toFixed(2),
    });
    setIsItemDialogOpen(true);
  };

  // Form submission
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.costCodeId) {
      toast({
        title: "Cost Code Required",
        description: "Please select a cost code for the budget item.",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      updateBudgetItem.mutate({ id: editingItem.id, data: formData });
    } else {
      createBudgetItem.mutate(formData);
    }
  };

  const handleCostCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeFormData.code.trim() || !codeFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Code and Name are required.",
        variant: "destructive",
      });
      return;
    }
    createCostCode.mutate(codeFormData);
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'number' ? value : Number(value) || 0;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(num));
    
    return num < 0 ? `(${formatted})` : formatted;
  };

  // Quick helper calculations
  const calculateRevisedBudget = (orig: string | number | null | undefined, approved: string | number | null | undefined) => {
    return (Number(orig) || 0) + (Number(approved) || 0);
  };

  const calculateVariance = (orig: string | number | null | undefined, approved: string | number | null | undefined, eac: string | number | null | undefined) => {
    const revised = calculateRevisedBudget(orig, approved);
    return revised - (Number(eac) || 0);
  };

  // Filter list
  const filteredBudgetItems = budgetItems.filter((item) => {
    const code = item.costCode.code.toLowerCase();
    const name = item.costCode.name.toLowerCase();
    const search = searchTerm.toLowerCase();
    return code.includes(search) || name.includes(search);
  });

  // Summary Card Totals
  let totalOriginal = 0;
  let totalApproved = 0;
  let totalPending = 0;
  let totalCommitted = 0;
  let totalForecast = 0;
  let totalEAC = 0;

  budgetItems.forEach((item) => {
    totalOriginal += Number(item.originalBudget) || 0;
    totalApproved += Number(item.approvedChanges) || 0;
    totalPending += Number(item.pendingChanges) || 0;
    totalCommitted += Number(item.committedCosts) || 0;
    totalForecast += Number(item.forecastCost) || 0;
    totalEAC += Number(item.estimatedAtCompletion) || 0;
  });

  const totalRevised = totalOriginal + totalApproved;
  const totalVariance = totalRevised - totalEAC;

  if (budgetLoading || costCodesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">Budget</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Project Cost Budget
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track cost codes, committed contracts, actual/forecast expenditures, change impact, and variance control.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsCodeDialogOpen(true)}
            className="border-slate-200 hover:border-slate-300 dark:border-slate-800 shadow-sm"
          >
            <FolderPlus className="mr-2 h-4 w-4 text-emerald-600" />
            Add Cost Code
          </Button>
          <Button 
            onClick={handleOpenCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Budget Line
          </Button>
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Original Budget</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">{formatCurrency(totalOriginal)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approved Changes</p>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(totalApproved)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Revised Budget</p>
            <p className="text-2xl font-extrabold text-slate-950 dark:text-slate-50 mt-1">{formatCurrency(totalRevised)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Committed Costs</p>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{formatCurrency(totalCommitted)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Projected Variance</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-2xl font-extrabold ${totalVariance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(totalVariance)}
              </p>
              {totalVariance < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-card/50 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search cost codes, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>

      {/* Budget Ledger Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4 font-semibold w-32">Cost Code</th>
                <th className="px-5 py-4 font-semibold">Description</th>
                <th className="px-5 py-4 font-semibold text-right">Original Budget</th>
                <th className="px-5 py-4 font-semibold text-right">Approved Changes</th>
                <th className="px-5 py-4 font-semibold text-right">Pending Changes</th>
                <th className="px-5 py-4 font-semibold text-right">Revised Budget</th>
                <th className="px-5 py-4 font-semibold text-right">Committed Costs</th>
                <th className="px-5 py-4 font-semibold text-right">Forecast Costs</th>
                <th className="px-5 py-4 font-semibold text-right">EAC</th>
                <th className="px-5 py-4 font-semibold text-right">Variance</th>
                <th className="px-5 py-4 font-semibold text-right w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
              {filteredBudgetItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-slate-400">
                    <DollarSign className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No Budget Items Found</p>
                    <p className="text-xs text-slate-400 mt-1">Start by adding a budget line item or creating new Cost Codes.</p>
                  </td>
                </tr>
              ) : (
                filteredBudgetItems.map((item) => {
                  const revised = calculateRevisedBudget(item.originalBudget, item.approvedChanges);
                  const variance = calculateVariance(item.originalBudget, item.approvedChanges, item.estimatedAtCompletion);
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-slate-50">
                        {item.costCode.code}
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span 
                            onClick={() => handleOpenEditDialog(item)}
                            className="font-semibold text-slate-800 dark:text-slate-300 hover:text-emerald-600 cursor-pointer hover:underline"
                          >
                            {item.costCode.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.originalBudget || "0")}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(item.approvedChanges || "0")}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-400">
                        {formatCurrency(item.pendingChanges || "0")}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-slate-200">
                        {formatCurrency(revised)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-purple-600 dark:text-purple-400">
                        {formatCurrency(item.committedCosts || "0")}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(item.forecastCost || "0")}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.estimatedAtCompletion || "0")}
                      </td>
                      <td className={`px-5 py-4 text-right font-bold ${
                        variance < 0 
                          ? 'text-red-600 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {formatCurrency(variance)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEditDialog(item)}
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Sum Totals Footer */}
            {filteredBudgetItems.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-card font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-150">
                <tr>
                  <td colSpan={2} className="px-5 py-4 text-left uppercase tracking-wider text-xs">Total Summary Ledger</td>
                  <td className="px-5 py-4 text-right">{formatCurrency(totalOriginal)}</td>
                  <td className="px-5 py-4 text-right text-blue-600 dark:text-blue-400">{formatCurrency(totalApproved)}</td>
                  <td className="px-5 py-4 text-right text-slate-400">{formatCurrency(totalPending)}</td>
                  <td className="px-5 py-4 text-right">{formatCurrency(totalRevised)}</td>
                  <td className="px-5 py-4 text-right text-purple-600 dark:text-purple-400">{formatCurrency(totalCommitted)}</td>
                  <td className="px-5 py-4 text-right">{formatCurrency(totalForecast)}</td>
                  <td className="px-5 py-4 text-right">{formatCurrency(totalEAC)}</td>
                  <td className={`px-5 py-4 text-right ${
                    totalVariance < 0 
                      ? 'text-red-600 dark:text-red-400 bg-red-100/20' 
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {formatCurrency(totalVariance)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Add / Edit Budget Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Budget Line Ledger' : 'Add Budget Line Ledger'}</DialogTitle>
            <DialogDescription>
              Assign the budget line to a division cost code and fill out the financial amounts.
            </DialogDescription>
          </DialogHeader>

          {costCodes.length === 0 ? (
            <div className="py-6 text-center space-y-4 border border-dashed rounded-lg">
              <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Cost Codes Defined</p>
                <p className="text-xs text-slate-500 mt-1">You must define at least one Division Cost Code in your company before setting budget ledgers.</p>
              </div>
              <Button onClick={() => { setIsItemDialogOpen(false); setIsCodeDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                Create Cost Code Now
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="costCodeId">Division Cost Code</Label>
                <Select 
                  value={formData.costCodeId} 
                  onValueChange={(val) => setFormData({...formData, costCodeId: val})}
                  disabled={!!editingItem} // Cost code shouldn't change after creation to maintain integrity
                >
                  <SelectTrigger id="costCodeId">
                    <SelectValue placeholder="Select Cost Code..." />
                  </SelectTrigger>
                  <SelectContent>
                    {costCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id.toString()}>
                        {code.code} — {code.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalBudget">Original Budget ($)</Label>
                  <Input 
                    id="originalBudget" 
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.originalBudget}
                    onChange={(e) => setFormData({...formData, originalBudget: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approvedChanges">Approved Cost Changes ($)</Label>
                  <Input 
                    id="approvedChanges" 
                    type="number"
                    step="0.01"
                    required
                    value={formData.approvedChanges}
                    onChange={(e) => setFormData({...formData, approvedChanges: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pendingChanges">Pending Cost Changes ($)</Label>
                  <Input 
                    id="pendingChanges" 
                    type="number"
                    step="0.01"
                    required
                    value={formData.pendingChanges}
                    onChange={(e) => setFormData({...formData, pendingChanges: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="committedCosts">Committed Contract Costs ($)</Label>
                  <Input 
                    id="committedCosts" 
                    type="number"
                    step="0.01"
                    required
                    value={formData.committedCosts}
                    onChange={(e) => setFormData({...formData, committedCosts: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="forecastCost">Forecast Cost ($)</Label>
                  <Input 
                    id="forecastCost" 
                    type="number"
                    step="0.01"
                    required
                    value={formData.forecastCost}
                    onChange={(e) => setFormData({...formData, forecastCost: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedAtCompletion">Estimated at Completion (EAC) ($)</Label>
                  <div className="relative">
                    <Input 
                      id="estimatedAtCompletion" 
                      type="number"
                      step="0.01"
                      required
                      value={formData.estimatedAtCompletion}
                      onChange={(e) => setFormData({...formData, estimatedAtCompletion: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        // Quick calculate recommendation: EAC = Committed Costs or Forecast Costs
                        const val = formData.forecastCost !== '0.00' ? formData.forecastCost : formData.committedCosts;
                        setFormData({...formData, estimatedAtCompletion: val});
                      }}
                      title="Recommend from Forecast/Committed"
                      className="absolute right-2 top-2 p-1 text-slate-400 hover:text-emerald-600"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" type="button" onClick={() => setIsItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                  disabled={createBudgetItem.isPending || updateBudgetItem.isPending}
                >
                  {editingItem ? 'Save Ledger changes' : 'Add Budget Line'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Cost Code Dialog */}
      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Company Cost Code</DialogTitle>
            <DialogDescription>
              Create a new cost division trade code that can be used across all project budgets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCostCodeSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code Identifier (e.g. 02-100)</Label>
              <Input 
                id="code" 
                required 
                placeholder="e.g. 03-300"
                value={codeFormData.code}
                onChange={(e) => setCodeFormData({...codeFormData, code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Code Name / Title</Label>
              <Input 
                id="name" 
                required 
                placeholder="e.g. Cast-in-Place Concrete"
                value={codeFormData.name}
                onChange={(e) => setCodeFormData({...codeFormData, name: e.target.value})}
              />
            </div>


            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsCodeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                disabled={createCostCode.isPending}
              >
                Create Cost Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
