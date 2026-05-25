import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft, MessageSquare, Send, Calendar, CheckCircle2, AlertTriangle, User, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import type { Rfi, RfiComment, Project } from '@shared/schema';

export default function RFIDetails() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const parsedRfiId = parseInt(id || '0', 10);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [commentText, setCommentText] = useState('');
  const [officialResponse, setOfficialResponse] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);

  const { data: rfi, isLoading } = useQuery<Rfi>({
    queryKey: [`/api/rfis/${parsedRfiId}`],
    enabled: !!parsedRfiId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: comments = [] } = useQuery<RfiComment[]>({
    queryKey: [`/api/rfis/${parsedRfiId}/comments`],
    enabled: !!parsedRfiId,
  });

  const postComment = useMutation({
    mutationFn: async (text: string) => {
      return await apiRequest('POST', `/api/rfis/${parsedRfiId}/comments`, { comment: text });
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: [`/api/rfis/${parsedRfiId}/comments`] });
      toast({
        title: "Comment Posted",
        description: "Your comment has been added to the discussion thread.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const updateRfi = useMutation({
    mutationFn: async (payload: Partial<Rfi>) => {
      return await apiRequest('PUT', `/api/rfis/${parsedRfiId}`, payload);
    },
    onSuccess: () => {
      setIsAnswering(false);
      setOfficialResponse('');
      queryClient.invalidateQueries({ queryKey: [`/api/rfis/${parsedRfiId}`] });
      toast({
        title: "RFI Updated",
        description: "The RFI status and details have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update RFI",
        variant: "destructive",
      });
    },
  });

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    postComment.mutate(commentText);
  };

  const handlePostResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialResponse.trim()) return;
    updateRfi.mutate({
      officialResponse: officialResponse,
      status: 'answered',
      ballInCourt: rfi?.createdBy || 'GC PM',
    });
  };

  const handleCloseRfi = () => {
    updateRfi.mutate({ status: 'closed', ballInCourt: '' });
  };

  const handleReopenRfi = () => {
    updateRfi.mutate({ status: 'open', ballInCourt: 'Owner Representative' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rfi) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">RFI Not Found</h2>
        <p className="text-slate-500 mt-2">The requested RFI could not be found or has been deleted.</p>
        <Link href={`/projects/${parsedProjectId}/rfis`}>
          <Button className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700">Back to RFIs</Button>
        </Link>
      </div>
    );
  }

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

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Back button and header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            onClick={() => setLocation(`/projects/${parsedProjectId}/rfis`)}
            className="flex items-center text-slate-500 hover:text-slate-800 pl-0 -ml-1 text-sm dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to RFIs Log
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-500 tracking-tight">{rfi.number}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{rfi.subject}</h1>
          </div>
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-1">
            Project: {project?.name || 'Project Details'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {rfi.status === 'open' && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setIsAnswering(true)}
            >
              Provide Official Response
            </Button>
          )}
          {rfi.status === 'answered' && (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCloseRfi}
            >
              Accept & Close RFI
            </Button>
          )}
          {rfi.status === 'closed' && (
            <Button 
              variant="outline"
              onClick={handleReopenRfi}
            >
              Reopen RFI
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details and Discussion (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question / Clarification Section */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 border-b border-slate-200/60 dark:bg-card/60 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
                <User className="h-4.5 w-4.5 text-slate-500" />
                Clarification / Question
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-card/30 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                  {rfi.question}
                </p>
              </div>
              
              {rfi.suggestedAnswer && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Answer</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic pl-3 border-l-2 border-emerald-500">
                    {rfi.suggestedAnswer}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Official Response Section */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                Official Response
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {rfi.officialResponse ? (
                <div className="bg-emerald-50/20 border border-emerald-100/60 p-4 rounded-lg dark:bg-card/40 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {rfi.officialResponse}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-3 dark:text-emerald-400">
                    RFI resolved and locked as official record
                  </p>
                </div>
              ) : isAnswering ? (
                <form onSubmit={handlePostResponse} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="officialResponse" className="text-sm font-semibold">Write Official Response</Label>
                    <Textarea 
                      id="officialResponse"
                      required
                      rows={5}
                      value={officialResponse}
                      onChange={(e) => setOfficialResponse(e.target.value)}
                      placeholder="Input the official resolution, instruction, or clarification to resolve this RFI..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" type="button" onClick={() => setIsAnswering(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={updateRfi.isPending}
                    >
                      Post Response
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-sm font-medium">No official response has been provided yet.</p>
                  {rfi.status === 'open' && (
                    <Button 
                      variant="outline" 
                      className="mt-3 text-xs border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
                      onClick={() => setIsAnswering(true)}
                    >
                      Provide Response Now
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discussion / Comments Section */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-200/60 dark:border-slate-800">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-500" />
                Discussion Thread ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Write comment */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <Input 
                  placeholder="Type a comment or question..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-card border-slate-200 dark:border-slate-800"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={postComment.isPending || !commentText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              {/* Scrollable feed */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {comments.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-4">No comments posted yet. Begin the conversation above.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-card/30 border border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-400">
                        {comment.userId?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{comment.userId}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {comment.createdAt ? format(new Date(comment.createdAt), 'MMM dd, yyyy h:mm a') : '—'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info Panel (Right Column) */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-200/60 dark:border-slate-800">
              <CardTitle className="text-base font-bold">RFI Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <Badge variant="outline" className={`capitalize font-bold border px-2.5 py-0.5 rounded ${getStatusColor(rfi.status || 'open')}`}>
                  {rfi.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</span>
                <span className="text-sm capitalize font-bold text-slate-700 dark:text-slate-300">{rfi.priority}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discipline</span>
                <span className="text-sm capitalize font-bold text-slate-700 dark:text-slate-300">{rfi.discipline || 'Unassigned'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location / Area</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{rfi.location || 'Job Site'}</span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ball in Court</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{rfi.ballInCourt || '—'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</span>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {rfi.dueDate ? format(new Date(rfi.dueDate), 'MMM dd, yyyy') : '—'}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule Impact</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {rfi.scheduleImpact ? `+${rfi.scheduleImpact} Days` : 'No Impact'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost Impact</span>
                  <span className="text-sm font-bold capitalize text-slate-700 dark:text-slate-300">
                    {rfi.costImpact}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-semibold text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Created By</span>
                  <span>{rfi.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submitted On</span>
                  <span>{rfi.createdAt ? format(new Date(rfi.createdAt), 'MMM dd, yyyy') : '—'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
