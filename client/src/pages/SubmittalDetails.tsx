import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ClipboardCheck, Calendar, User, FileText, ArrowLeft, Send, CheckCircle2, MessageSquare, AlertCircle, Stamp } from 'lucide-react';
import { format } from 'date-fns';
import type { Submittal, SubmittalReview, Project, Subcontractor } from '@shared/schema';

export default function SubmittalDetails() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const parsedSubmittalId = parseInt(id || '0', 10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewComments, setReviewComments] = useState('');

  const { data: submittal, isLoading: isSubmittalLoading } = useQuery<Submittal>({
    queryKey: [`/api/submittals/${parsedSubmittalId}`],
    enabled: !!parsedSubmittalId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: subcontractors = [] } = useQuery<Subcontractor[]>({
    queryKey: ['/api/subcontractors'],
  });

  const { data: reviews = [], isLoading: isReviewsLoading } = useQuery<SubmittalReview[]>({
    queryKey: [`/api/submittals/${parsedSubmittalId}/reviews`],
    enabled: !!parsedSubmittalId,
  });

  const submitReview = useMutation({
    mutationFn: async (data: { status: string; comments: string }) => {
      const payload = {
        submittalId: parsedSubmittalId,
        status: data.status,
        comments: data.comments,
        attachments: [],
      };
      return await apiRequest('POST', `/api/submittals/${parsedSubmittalId}/reviews`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted",
        description: "The submittal review response has been registered.",
      });
      setReviewComments('');
      queryClient.invalidateQueries({ queryKey: [`/api/submittals/${parsedSubmittalId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/submittals/${parsedSubmittalId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/submittals`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComments.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter review comments or justification.",
        variant: "destructive",
      });
      return;
    }
    submitReview.mutate({ status: reviewStatus, comments: reviewComments });
  };

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

  if (isSubmittalLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!submittal) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold">Submittal Not Found</h2>
        <p className="text-slate-500 mt-2">The requested submittal does not exist or has been deleted.</p>
        <Link href={`/projects/${parsedProjectId}/submittals`}>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
            Back to Submittals
          </Button>
        </Link>
      </div>
    );
  }

  const contractor = subcontractors.find(s => s.id === submittal.responsibleContractorId);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumbs and Top Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Link href={`/projects/${parsedProjectId}/submittals`} className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Submittals
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">{submittal.number}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            {submittal.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section: <span className="font-semibold text-slate-800 dark:text-slate-200">{submittal.specSection || '—'}</span> | Revision: <span className="font-bold">Rev {submittal.revision}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={`capitalize font-semibold border px-3 py-1 text-sm rounded ${getStatusColor(submittal.status || 'open')}`}>
            {submittal.status?.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Main Details and Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Submittal Overview & Review Logs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Submittal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Package Reference</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{submittal.package || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Submittal Type</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{submittal.type?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Responsible Contractor</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{contractor?.name || '—'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block uppercase">Ball In Court</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{submittal.ballInCourt || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Required On Site</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {submittal.requiredDate ? format(new Date(submittal.requiredDate), 'MMM dd, yyyy') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Due Date</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {submittal.dueDate ? format(new Date(submittal.dueDate), 'MMM dd, yyyy') : '—'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Received Date</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {submittal.receivedDate ? format(new Date(submittal.receivedDate), 'MMM dd, yyyy') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase">Returned Date</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {submittal.returnedDate ? format(new Date(submittal.returnedDate), 'MMM dd, yyyy') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Progress Logs */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Stamp className="h-4 w-4 text-emerald-600" />
                Submittal Reviews & Approval Stamp History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-sm">No review history yet.</p>
                  <p className="text-xs mt-0.5">Use the review stamp panel to register approvals or feedback.</p>
                </div>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-800 pl-6 space-y-6">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-card border border-slate-300 dark:border-slate-700">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                      </span>
                      <div className="bg-slate-50 dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`capitalize font-semibold border px-2 py-0.5 rounded text-xs ${getStatusColor(rev.status)}`}>
                              {rev.status?.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-slate-400">by {rev.userId}</span>
                          </div>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(rev.createdAt || ''), 'MMM dd, yyyy p')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {rev.comments}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Action Stamps / Review Panel */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
            <CardHeader className="bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Stamp className="h-4 w-4 text-emerald-600" />
                Approval Stamp Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewStatus">Response Stamp</Label>
                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                    <SelectTrigger id="reviewStatus" className="w-full">
                      <SelectValue placeholder="Select stamp status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="approved_as_noted">Approved as Noted</SelectItem>
                      <SelectItem value="revise_resubmit">Revise and Resubmit</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Comments & Justification</Label>
                  <Textarea
                    id="comments"
                    rows={6}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Enter review comments, field annotations, or reason for rejection/stamp status..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                  disabled={submitReview.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Stamp Response
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
