import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ClipboardCheck, Plus, Search, Calendar, Layers, FileText, CheckSquare, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import type { Submittal, Project, Subcontractor } from '@shared/schema';

export default function Submittals() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    specSection: '',
    package: '',
    type: 'product_data',
    responsibleContractorId: '',
    dueDate: '',
    requiredDate: '',
  });

  const { data: submittals = [], isLoading } = useQuery<Submittal[]>({
    queryKey: [`/api/projects/${parsedProjectId}/submittals`],
    enabled: !!parsedProjectId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: subcontractors = [] } = useQuery<Subcontractor[]>({
    queryKey: ['/api/subcontractors'],
  });

  const createSubmittal = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        projectId: parsedProjectId,
        responsibleContractorId: data.responsibleContractorId ? parseInt(data.responsibleContractorId, 10) : null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        requiredDate: data.requiredDate ? new Date(data.requiredDate).toISOString() : null,
        number: `SUB-${(submittals.length + 1).toString().padStart(3, '0')}`,
        revision: 0,
        status: 'open',
        ballInCourt: 'Subcontractor / Sub PM',
      };
      return await apiRequest('POST', `/api/projects/${parsedProjectId}/submittals`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Submittal Created",
        description: "The submittal record has been created successfully.",
      });
      setIsCreateOpen(false);
      setFormData({
        title: '',
        specSection: '',
        package: '',
        type: 'product_data',
        responsibleContractorId: '',
        dueDate: '',
        requiredDate: '',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/submittals`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create submittal",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'open': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'pending_review': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'approved': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/60';
      case 'approved_as_noted': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'revise_resubmit': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60';
      case 'rejected': return 'bg-slate-900 text-red-200 border-slate-800 dark:bg-slate-950 dark:text-red-400 dark:border-slate-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredSubmittals = submittals.filter((sub) => {
    const matchesSearch = sub.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (sub.specSection || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSubmittal.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">Submittals</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Submittals Register
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage submittal records, shop drawings, product data, and samples for review and approval.
          </p>
        </div>
        <div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600">
                <Plus className="mr-2 h-4 w-4" />
                New Submittal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Register Submittal</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Submittal Title</Label>
                  <Input 
                    id="title" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Asbestos Abatement Work Plan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specSection">Spec Section</Label>
                    <Input 
                      id="specSection" 
                      value={formData.specSection}
                      onChange={(e) => setFormData({...formData, specSection: e.target.value})}
                      placeholder="e.g. 02 82 13 Asbestos Abatement"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package">Package Reference</Label>
                    <Input 
                      id="package" 
                      value={formData.package}
                      onChange={(e) => setFormData({...formData, package: e.target.value})}
                      placeholder="e.g. Phase 1 Demolition"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Submittal Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(val) => setFormData({...formData, type: val})}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product_data">Product Data</SelectItem>
                        <SelectItem value="shop_drawing">Shop Drawing</SelectItem>
                        <SelectItem value="sample">Sample</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsibleContractor">Responsible Subcontractor</Label>
                    <Select 
                      value={formData.responsibleContractorId} 
                      onValueChange={(val) => setFormData({...formData, responsibleContractorId: val})}
                    >
                      <SelectTrigger id="responsibleContractor">
                        <SelectValue placeholder="Select subcontractor" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcontractors.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            {sub.name} ({sub.tradeType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input 
                      id="dueDate" 
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requiredDate">Required On Site Date</Label>
                    <Input 
                      id="requiredDate" 
                      type="date"
                      value={formData.requiredDate}
                      onChange={(e) => setFormData({...formData, requiredDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    disabled={createSubmittal.isPending}
                  >
                    Register Submittal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Submittals</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">{submittals.length}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <ClipboardCheck className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Under Review</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {submittals.filter(s => s.status?.toLowerCase() === 'pending_review').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center dark:bg-blue-950/40">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approved / Met</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {submittals.filter(s => ['approved', 'approved_as_noted'].includes(s.status?.toLowerCase() || '')).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center dark:bg-emerald-950/40">
              <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Open / Inbound</p>
              <p className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                {submittals.filter(s => s.status?.toLowerCase() === 'open').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-card/50 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search submittals by number, title, or spec section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="approved_as_noted">Approved as Noted</SelectItem>
              <SelectItem value="revise_resubmit">Revise and Resubmit</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submittal Log Grid/Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Submittal #</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Spec Section</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Revision</th>
                <th className="px-6 py-4 font-semibold">Responsible Sub</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
              {filteredSubmittals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No Submittals Found</p>
                    <p className="text-xs text-slate-400 mt-1">Get started by registering a submittal for review.</p>
                  </td>
                </tr>
              ) : (
                filteredSubmittals.map((sub) => {
                  const matchingSub = subcontractors.find(s => s.id === sub.responsibleContractorId);
                  
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">
                        <Link href={`/projects/${parsedProjectId}/submittals/${sub.id}`} className="hover:text-emerald-600 transition-colors cursor-pointer">
                          {sub.number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-50 truncate max-w-[240px]">
                        <Link href={`/projects/${parsedProjectId}/submittals/${sub.id}`} className="hover:underline cursor-pointer">
                          {sub.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-semibold">{sub.specSection || '—'}</td>
                      <td className="px-6 py-4 capitalize font-semibold">{sub.type?.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-center font-bold">Rev {sub.revision}</td>
                      <td className="px-6 py-4 font-medium">
                        {matchingSub ? (
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px] font-bold text-slate-700 dark:text-slate-300">{matchingSub.name}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {sub.dueDate ? format(new Date(sub.dueDate), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className={`capitalize font-semibold border px-2 py-0.5 rounded ${getStatusColor(sub.status || 'open')}`}>
                          {sub.status?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/projects/${parsedProjectId}/submittals/${sub.id}`}>
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/20">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
