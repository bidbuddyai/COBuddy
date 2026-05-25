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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Gavel, Plus, Search, Calendar, Users, Layers, Award, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { BidPackage, Project } from '@shared/schema';

export default function BidPackages() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tradeCategory: '',
    dueDate: '',
  });

  const { data: bidPackages = [], isLoading } = useQuery<BidPackage[]>({
    queryKey: [`/api/projects/${parsedProjectId}/bid-packages`],
    enabled: !!parsedProjectId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const createPackage = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        projectId: parsedProjectId,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        status: 'draft',
      };
      return await apiRequest('POST', `/api/projects/${parsedProjectId}/bid-packages`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Bid Package Created",
        description: "The bid package has been created successfully.",
      });
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', tradeCategory: '', dueDate: '' });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/bid-packages`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bid package",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'closed': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'awarded': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredPackages = bidPackages.filter((pkg) => {
    const matchesSearch = pkg.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (pkg.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (pkg.tradeCategory || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPackage.mutate(formData);
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">Bid Packages</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Bid Packages Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize scopes of work, invite subcontractor proposals, and perform bid leveling.
          </p>
        </div>
        <div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600">
                <Plus className="mr-2 h-4 w-4" />
                New Bid Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Create Bid Package</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Bid Package Title *</Label>
                  <Input 
                    id="title" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Phase 1 Asbestos Abatement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Scope Description</Label>
                  <Textarea 
                    id="description" 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detail the scope of work, inclusions, exclusions, and attachments..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tradeCategory">Trade Category / Specification Section</Label>
                    <Input 
                      id="tradeCategory" 
                      value={formData.tradeCategory}
                      onChange={(e) => setFormData({...formData, tradeCategory: e.target.value})}
                      placeholder="e.g. Abatement, Demolition"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Proposal Due Date</Label>
                    <Input 
                      id="dueDate" 
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
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
                    disabled={createPackage.isPending}
                  >
                    Create Package
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
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Packages</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">{bidPackages.length}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <Gavel className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Draft Scope</p>
              <p className="text-3xl font-extrabold text-slate-500 dark:text-slate-400 mt-1">
                {bidPackages.filter(p => p.status?.toLowerCase() === 'draft').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <Layers className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Bidding</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {bidPackages.filter(p => p.status?.toLowerCase() === 'active').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center dark:bg-emerald-950/40">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Awarded</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {bidPackages.filter(p => p.status?.toLowerCase() === 'awarded').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center dark:bg-blue-950/40">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-card/50 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search bid packages by scope, category, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
      </div>

      {/* Bid Package Registry Log */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Scope Package Name</th>
                <th className="px-6 py-4 font-semibold">Trade Category</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Gavel className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No Bid Packages Registered</p>
                    <p className="text-xs text-slate-400 mt-1">Get started by creating a package scope to invite pricing from subcontractors.</p>
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">
                      <Link href={`/projects/${parsedProjectId}/bid-packages/${pkg.id}`} className="hover:underline hover:text-emerald-600 transition-colors cursor-pointer">
                        {pkg.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-semibold capitalize">{pkg.tradeCategory || '—'}</td>
                    <td className="px-6 py-4 font-medium">
                      {pkg.dueDate ? format(new Date(pkg.dueDate), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={`capitalize font-semibold border px-2 py-0.5 rounded ${getStatusColor(pkg.status || 'draft')}`}>
                        {pkg.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/projects/${parsedProjectId}/bid-packages/${pkg.id}`}>
                        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/20 mr-2">
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/projects/${parsedProjectId}/bid-packages/${pkg.id}/leveling`}>
                        <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Bid Leveling
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
