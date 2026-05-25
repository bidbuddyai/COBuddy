import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useProject } from '@/contexts/ProjectContext';
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
import { HelpCircle, Plus, Search, Calendar, User, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Rfi, Project } from '@shared/schema';

export default function RFIs() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    question: '',
    suggestedAnswer: '',
    costImpact: 'undetermined',
    scheduleImpact: '0',
    priority: 'medium',
    discipline: '',
    location: '',
    ballInCourt: '',
    dueDate: '',
  });

  const { data: rfis = [], isLoading } = useQuery<Rfi[]>({
    queryKey: [`/api/projects/${parsedProjectId}/rfis`],
    enabled: !!parsedProjectId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const createRfi = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        projectId: parsedProjectId,
        scheduleImpact: parseInt(data.scheduleImpact || '0', 10),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        number: `RFI-${(rfis.length + 1).toString().padStart(3, '0')}`,
      };
      return await apiRequest('POST', `/api/projects/${parsedProjectId}/rfis`, payload);
    },
    onSuccess: () => {
      toast({
        title: "RFI Created",
        description: "The RFI has been submitted successfully.",
      });
      setIsCreateOpen(false);
      setFormData({
        subject: '',
        question: '',
        suggestedAnswer: '',
        costImpact: 'undetermined',
        scheduleImpact: '0',
        priority: 'medium',
        discipline: '',
        location: '',
        ballInCourt: '',
        dueDate: '',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/rfis`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFI",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'open': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'answered': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'closed': return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 dark:text-red-400 font-semibold';
      case 'medium': return 'text-amber-600 dark:text-amber-400 font-semibold';
      case 'low': return 'text-slate-600 dark:text-slate-400 font-medium';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const filteredRfis = rfis.filter((rfi) => {
    const matchesSearch = rfi.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rfi.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rfi.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rfi.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRfi.mutate(formData);
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
      {/* Breadcrumbs and Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">RFIs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Requests for Information (RFIs)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, track, and resolve clarifications and questions for this project.
          </p>
        </div>
        <div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600">
                <Plus className="mr-2 h-4 w-4" />
                New RFI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Submit Request for Information</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject / Title</Label>
                  <Input 
                    id="subject" 
                    required 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. Asbestos Abatement clearance criteria at gridline C-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Textarea 
                    id="question" 
                    required 
                    rows={4}
                    value={formData.question}
                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                    placeholder="Provide a detailed description of the clarification needed..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suggestedAnswer">Suggested Answer (Optional)</Label>
                  <Textarea 
                    id="suggestedAnswer" 
                    rows={2}
                    value={formData.suggestedAnswer}
                    onChange={(e) => setFormData({...formData, suggestedAnswer: e.target.value})}
                    placeholder="If you have a proposed solution, detail it here..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discipline">Discipline</Label>
                    <Input 
                      id="discipline" 
                      value={formData.discipline}
                      onChange={(e) => setFormData({...formData, discipline: e.target.value})}
                      placeholder="e.g. Hazardous Materials, Structural"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location / Area</Label>
                    <Input 
                      id="location" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Building A - 2nd Floor"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(val) => setFormData({...formData, priority: val})}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costImpact">Cost Impact</Label>
                    <Select 
                      value={formData.costImpact} 
                      onValueChange={(val) => setFormData({...formData, costImpact: val})}
                    >
                      <SelectTrigger id="costImpact">
                        <SelectValue placeholder="Select cost impact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="undetermined">Undetermined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduleImpact">Schedule Impact (Days)</Label>
                    <Input 
                      id="scheduleImpact" 
                      type="number"
                      value={formData.scheduleImpact}
                      onChange={(e) => setFormData({...formData, scheduleImpact: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input 
                      id="dueDate" 
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ballInCourt">Assign to / Ball in Court (Name/Company)</Label>
                  <Input 
                    id="ballInCourt" 
                    value={formData.ballInCourt}
                    onChange={(e) => setFormData({...formData, ballInCourt: e.target.value})}
                    placeholder="e.g. Lead Engineer / Owner Rep"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    disabled={createRfi.isPending}
                  >
                    Submit Rfi
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* RFI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total RFIs</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">{rfis.length}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Open / Active</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {rfis.filter(r => r.status?.toLowerCase() === 'open').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center dark:bg-emerald-950/40">
              <ArrowRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Answered</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {rfis.filter(r => r.status?.toLowerCase() === 'answered').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center dark:bg-blue-950/40">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Resolved / Closed</p>
              <p className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                {rfis.filter(r => r.status?.toLowerCase() === 'closed').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtering and Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-card/50 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search RFIs by number, subject, or question..."
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
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RFI Log Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">RFI #</th>
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Discipline</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Ball in Court</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
              {filteredRfis.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <HelpCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No RFIs Found</p>
                    <p className="text-xs text-slate-400 mt-1">Get started by clicking 'New RFI' to submit a clarification request.</p>
                  </td>
                </tr>
              ) : (
                filteredRfis.map((rfi) => (
                  <tr key={rfi.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">
                      <Link href={`/projects/${parsedProjectId}/rfis/${rfi.id}`} className="hover:text-emerald-600 transition-colors cursor-pointer">
                        {rfi.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-50 truncate max-w-[240px]">
                      <Link href={`/projects/${parsedProjectId}/rfis/${rfi.id}`} className="hover:underline cursor-pointer">
                        {rfi.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-4 capitalize font-medium">{rfi.discipline || '—'}</td>
                    <td className="px-6 py-4 font-medium">{rfi.location || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={getPriorityColor(rfi.priority || 'medium')}>
                        {rfi.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {rfi.ballInCourt?.split(' ').map(n => n[0]).join('') || '—'}
                        </div>
                        <span className="truncate max-w-[120px]">{rfi.ballInCourt || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {rfi.dueDate ? format(new Date(rfi.dueDate), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={`capitalize font-semibold border px-2 py-0.5 rounded ${getStatusColor(rfi.status || 'open')}`}>
                        {rfi.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/projects/${parsedProjectId}/rfis/${rfi.id}`}>
                        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/20">
                          View Details
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
