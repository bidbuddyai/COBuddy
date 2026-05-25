import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Gavel, Calendar, Users, Layers, ArrowLeft, Plus, Copy, Check, ExternalLink, Mail } from 'lucide-react';
import { format } from 'date-fns';
import type { BidPackage, BidInvitation, Project, Subcontractor } from '@shared/schema';

type InvitationWithSubcontractor = BidInvitation & {
  subcontractor: Subcontractor;
};

export default function BidPackageDetails() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const parsedPackageId = parseInt(id || '0', 10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [copiedTokenId, setCopiedTokenId] = useState<number | null>(null);

  const { data: bidPackage, isLoading: isPackageLoading } = useQuery<BidPackage>({
    queryKey: [`/api/bid-packages/${parsedPackageId}`],
    enabled: !!parsedPackageId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: invitations = [], isLoading: isInvitationsLoading } = useQuery<InvitationWithSubcontractor[]>({
    queryKey: [`/api/bid-packages/${parsedPackageId}/invitations`],
    enabled: !!parsedPackageId,
  });

  const { data: subcontractors = [] } = useQuery<Subcontractor[]>({
    queryKey: ['/api/subcontractors'],
  });

  const createInvitation = useMutation({
    mutationFn: async (data: { subcontractorId: number; inviteeEmail: string }) => {
      return await apiRequest('POST', `/api/bid-packages/${parsedPackageId}/invitations`, data);
    },
    onSuccess: () => {
      toast({
        title: "Bidder Invited",
        description: "The subcontractor invitation has been recorded, and a secure bidding link is active.",
      });
      setIsInviteOpen(false);
      setSelectedSubId('');
      setInviteeEmail('');
      queryClient.invalidateQueries({ queryKey: [`/api/bid-packages/${parsedPackageId}/invitations`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite bidder",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || !inviteeEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a subcontractor and input an invitee email.",
        variant: "destructive",
      });
      return;
    }
    createInvitation.mutate({
      subcontractorId: parseInt(selectedSubId, 10),
      inviteeEmail: inviteeEmail.trim(),
    });
  };

  const copyToClipboard = (token: string, invitationId: number) => {
    const link = `${window.location.origin}/bidding-portal/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedTokenId(invitationId);
      toast({
        title: "Copied!",
        description: "Secure bidding link copied to clipboard.",
      });
      setTimeout(() => setCopiedTokenId(null), 2000);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'invited': return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'viewed': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'declined': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60';
      case 'submitted': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'awarded': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isPackageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bidPackage) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">Bid Package Not Found</h2>
        <p className="text-slate-500 mt-2">The requested bid package does not exist.</p>
        <Link href={`/projects/${parsedProjectId}/bid-packages`}>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
            Back to Bid Packages
          </Button>
        </Link>
      </div>
    );
  }

  // Filter out subcontractors that are already invited
  const uninvitedSubs = subcontractors.filter(
    (sub) => !invitations.some((inv) => inv.subcontractorId === sub.id)
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Link href={`/projects/${parsedProjectId}/bid-packages`} className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Bid Packages
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">{bidPackage.title}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            {bidPackage.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Category: <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{bidPackage.tradeCategory || '—'}</span> | Proposals Due: <span className="font-bold">{bidPackage.dueDate ? format(new Date(bidPackage.dueDate), 'MMM dd, yyyy') : '—'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${parsedProjectId}/bid-packages/${bidPackage.id}/leveling`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600 font-bold">
              Open Bid Leveling sheet
            </Button>
          </Link>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Plus className="mr-2 h-4 w-4" />
                Invite Subcontractor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Invite Bidder</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="subcontractor">Select Subcontractor *</Label>
                  <Select value={selectedSubId} onValueChange={setSelectedSubId}>
                    <SelectTrigger id="subcontractor">
                      <SelectValue placeholder="Select subcontractor" />
                    </SelectTrigger>
                    <SelectContent>
                      {uninvitedSubs.length === 0 ? (
                        <SelectItem value="none" disabled>All subcontractors already invited</SelectItem>
                      ) : (
                        uninvitedSubs.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            {sub.name} ({sub.tradeType || 'General'})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteeEmail">Invitee Contact Email *</Label>
                  <Input 
                    id="inviteeEmail" 
                    type="email" 
                    required 
                    placeholder="subcontractor@estimating.com"
                    value={inviteeEmail}
                    onChange={(e) => setInviteeEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="outline" type="button" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    disabled={createInvitation.isPending}
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope Description */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Scope Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                {bidPackage.description || 'No detailed scope description provided.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Bid Invitations / Bidders List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Invited Subcontractors
              </CardTitle>
              <span className="text-xs font-semibold text-slate-400">{invitations.length} Bidders</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
                  <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-card/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Subcontractor</th>
                      <th className="px-6 py-3 font-semibold">Invitee Email</th>
                      <th className="px-6 py-3 font-semibold">Bidding Portal Token Access</th>
                      <th className="px-6 py-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
                    {invitations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                          <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="font-semibold text-sm">No subcontractors invited yet.</p>
                          <p className="text-xs mt-0.5">Use the 'Invite Subcontractor' button to add bidders.</p>
                        </td>
                      </tr>
                    ) : (
                      invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">
                            {inv.subcontractor?.name}
                            <span className="text-[10px] block font-normal text-slate-400 capitalize">{inv.subcontractor?.tradeType} | License: {inv.subcontractor?.licenseNumber || '—'}</span>
                          </td>
                          <td className="px-6 py-4 font-medium flex items-center gap-1.5 mt-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {inv.inviteeEmail}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(inv.token, inv.id)}
                                className="h-8 border-slate-200 dark:border-slate-700 bg-slate-50/50 hover:bg-slate-100 hover:text-slate-900 text-xs gap-1.5"
                              >
                                {copiedTokenId === inv.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    Copied Link
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                                    Copy Bidding Link
                                  </>
                                )}
                              </Button>
                              <a 
                                href={`/bidding-portal/${inv.token}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="outline" className={`capitalize font-semibold border px-2 py-0.5 rounded text-xs ${getStatusColor(inv.status || 'invited')}`}>
                              {inv.status?.replace('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
