import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, 
  Gavel, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Award, 
  ChevronRight, 
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import type { BidPackage, BidInvitation, Subcontractor, BidSubmission } from '@shared/schema';

type BidderLeveling = BidInvitation & {
  subcontractor: Subcontractor;
  submissions: BidSubmission[];
};

type LevelingResponse = {
  bidPackage: BidPackage;
  bidders: BidderLeveling[];
};

export default function BidComparison() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const parsedPackageId = parseInt(id || '0', 10);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [awardingInvitationId, setAwardingInvitationId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<LevelingResponse>({
    queryKey: [`/api/bid-packages/${parsedPackageId}/leveling`],
    enabled: !!parsedPackageId,
  });

  const awardMutation = useMutation({
    mutationFn: async ({ invitationId }: { invitationId: number }) => {
      // 1. Award invitation
      await apiRequest('PUT', `/api/bid-invitations/${invitationId}`, { status: 'awarded' });
      // 2. Mark bid package as awarded
      await apiRequest('PUT', `/api/bid-packages/${parsedPackageId}`, { status: 'awarded' });
    },
    onSuccess: () => {
      toast({
        title: "Bid Package Awarded",
        description: "The package has been successfully awarded to the selected subcontractor.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bid-packages/${parsedPackageId}/leveling`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Awarding Package",
        description: error.message || "Failed to award bid package.",
        variant: "destructive",
      });
    },
  });

  const handleAward = (invitationId: number, name: string) => {
    if (confirm(`Are you sure you want to award this bid package to ${name}?`)) {
      awardMutation.mutate({ invitationId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.bidPackage) {
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

  const { bidPackage, bidders } = data;

  // Filter bidders who have submitted a bid
  const submittedBidders = bidders.filter(b => b.submissions && b.submissions.length > 0);

  // Collect all unique alternate names from all submissions to build standard comparison rows
  const allAlternates = Array.from(
    new Set(
      submittedBidders.flatMap(b => {
        const sub = b.submissions[0];
        const alternates = (sub.alternates as Array<{ name: string; amount: number }>) || [];
        return alternates.map(alt => alt.name);
      })
    )
  );

  // Collect all unique unit price items to build standard comparison rows
  const allUnitPrices = Array.from(
    new Set(
      submittedBidders.flatMap(b => {
        const sub = b.submissions[0];
        const unitPrices = (sub.unitPrices as Array<{ item: string; price: number; unit: string }>) || [];
        return unitPrices.map(up => `${up.item}::${up.unit}`);
      })
    )
  );

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'invited':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">Invited</Badge>;
      case 'viewed':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Viewed</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Submitted</Badge>;
      case 'awarded':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Awarded</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Link href={`/projects/${parsedProjectId}/bid-packages/${bidPackage.id}`} className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Bid Package Details
            </Link>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">Bid Leveling sheet</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Bid Leveling: {bidPackage.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze, align, and compare subcontractor proposals side-by-side to make informed award decisions.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/bid-packages/${bidPackage.id}/export`} download>
            <Button variant="outline" className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 font-semibold gap-2">
              <Download className="h-4 w-4 text-emerald-600" />
              Export Leveling (CSV)
            </Button>
          </a>
        </div>
      </div>

      {bidders.length === 0 ? (
        <Card className="shadow-sm border-slate-200 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No Bidders Invited</h3>
          <p className="text-sm text-slate-500 mt-1">You have not invited any subcontractors to bid on this package yet.</p>
          <Link href={`/projects/${parsedProjectId}/bid-packages/${bidPackage.id}`}>
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Invite Subcontractors
            </Button>
          </Link>
        </Card>
      ) : submittedBidders.length === 0 ? (
        <Card className="shadow-sm border-slate-200 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No Bids Submitted Yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Subcontractors have been invited, but none have submitted their formal proposals yet.
          </p>
          <div className="mt-6 border-t border-slate-100 pt-6 max-w-xl mx-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Bid Invitation Progress</h4>
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden text-left">
              {bidders.map(inv => (
                <div key={inv.id} className="flex justify-between items-center px-4 py-3 text-sm">
                  <div>
                    <span className="font-bold text-slate-800">{inv.subcontractor?.name}</span>
                    <span className="text-slate-400 text-xs block">{inv.inviteeEmail}</span>
                  </div>
                  {getStatusBadge(inv.status || '')}
                </div>
              ))}
            </div>
          </div>
          <Link href={`/projects/${parsedProjectId}/bid-packages/${bidPackage.id}`}>
            <Button variant="outline" className="mt-6 border-slate-200 hover:bg-slate-50 font-semibold">
              Manage Invitations
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Leveling Grid */}
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Gavel className="h-4 w-4 text-emerald-600" />
                Side-By-Side Comparison Grid
              </CardTitle>
              <span className="text-xs font-semibold text-slate-400">
                {submittedBidders.length} Submitted Proposals
              </span>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-slate-200 divide-x divide-slate-200">
                    <th className="px-6 py-4 font-bold text-slate-500 w-[240px] sticky left-0 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Leveling Parameters
                    </th>
                    {submittedBidders.map(bidder => (
                      <th key={bidder.id} className="px-6 py-4 font-bold text-slate-900 bg-white min-w-[280px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-base text-slate-900">
                            {bidder.subcontractor?.name}
                          </span>
                          <span className="text-xs font-normal text-slate-500 capitalize">
                            {bidder.subcontractor?.tradeType || 'Subcontractor'} | License: {bidder.subcontractor?.licenseNumber || '—'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 divide-x divide-slate-200">
                  {/* Status Row */}
                  <tr className="divide-x divide-slate-200">
                    <td className="px-6 py-3 font-bold text-slate-600 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      Invitation Status
                    </td>
                    {submittedBidders.map(bidder => (
                      <td key={bidder.id} className="px-6 py-3 bg-white">
                        {getStatusBadge(bidder.status || '')}
                      </td>
                    ))}
                  </tr>

                  {/* Base Bid Row */}
                  <tr className="divide-x divide-slate-200 bg-emerald-50/10">
                    <td className="px-6 py-4 font-bold text-slate-800 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Base Bid Price
                    </td>
                    {submittedBidders.map(bidder => {
                      const submission = bidder.submissions[0];
                      return (
                        <td key={bidder.id} className="px-6 py-4 font-black text-lg text-emerald-700 bg-white">
                          {formatCurrency(submission.baseBid)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Alternates Section Header */}
                  {allAlternates.length > 0 && (
                    <tr className="bg-slate-50 divide-x divide-slate-200 border-y border-slate-200">
                      <td colSpan={submittedBidders.length + 1} className="px-6 py-2 font-bold uppercase text-xs tracking-wider text-slate-400">
                        Alternates / Optionals
                      </td>
                    </tr>
                  )}

                  {/* Alternate Rows */}
                  {allAlternates.map(altName => (
                    <tr key={altName} className="divide-x divide-slate-200">
                      <td className="px-6 py-3 font-semibold text-slate-600 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] pl-8">
                        {altName}
                      </td>
                      {submittedBidders.map(bidder => {
                        const sub = bidder.submissions[0];
                        const alternates = (sub.alternates as Array<{ name: string; amount: number }>) || [];
                        const match = alternates.find(a => a.name.toLowerCase() === altName.toLowerCase());
                        return (
                          <td key={bidder.id} className="px-6 py-3 bg-white font-medium text-slate-800">
                            {match ? formatCurrency(match.amount) : <span className="text-slate-300">Not Included</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Unit Prices Section Header */}
                  {allUnitPrices.length > 0 && (
                    <tr className="bg-slate-50 divide-x divide-slate-200 border-y border-slate-200">
                      <td colSpan={submittedBidders.length + 1} className="px-6 py-2 font-bold uppercase text-xs tracking-wider text-slate-400">
                        Unit Rate Items
                      </td>
                    </tr>
                  )}

                  {/* Unit Price Rows */}
                  {allUnitPrices.map(upKey => {
                    const [item, unit] = upKey.split('::');
                    return (
                      <tr key={upKey} className="divide-x divide-slate-200">
                        <td className="px-6 py-3 font-semibold text-slate-600 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] pl-8">
                          {item} <span className="text-xs font-normal text-slate-400">({unit})</span>
                        </td>
                        {submittedBidders.map(bidder => {
                          const sub = bidder.submissions[0];
                          const unitPrices = (sub.unitPrices as Array<{ item: string; price: number; unit: string }>) || [];
                          const match = unitPrices.find(u => u.item.toLowerCase() === item.toLowerCase() && u.unit === unit);
                          return (
                            <td key={bidder.id} className="px-6 py-3 bg-white text-slate-700 font-medium">
                              {match ? `${formatCurrency(match.price)} / ${unit}` : <span className="text-slate-300">Not Included</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Clarifications Row */}
                  <tr className="bg-slate-50/10 divide-x divide-slate-200">
                    <td colSpan={submittedBidders.length + 1} className="px-6 py-2 font-bold uppercase text-xs tracking-wider text-slate-400">
                      Clarifications & Inclusions
                    </td>
                  </tr>
                  <tr className="divide-x divide-slate-200">
                    <td className="px-6 py-4 font-semibold text-slate-600 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] pl-8">
                      Inclusions
                    </td>
                    {submittedBidders.map(bidder => {
                      const sub = bidder.submissions[0];
                      return (
                        <td key={bidder.id} className="px-6 py-4 bg-white align-top text-xs text-slate-600 max-w-[320px] whitespace-pre-wrap">
                          {sub.clarifications || <span className="text-slate-400 italic">None specified.</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Exclusions Row */}
                  <tr className="bg-slate-50/10 divide-x divide-slate-200">
                    <td colSpan={submittedBidders.length + 1} className="px-6 py-2 font-bold uppercase text-xs tracking-wider text-slate-400">
                      Scope Exclusions
                    </td>
                  </tr>
                  <tr className="divide-x divide-slate-200">
                    <td className="px-6 py-4 font-semibold text-slate-600 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] pl-8">
                      Exclusions
                    </td>
                    {submittedBidders.map(bidder => {
                      const sub = bidder.submissions[0];
                      return (
                        <td key={bidder.id} className="px-6 py-4 bg-white align-top text-xs text-slate-600 max-w-[320px] whitespace-pre-wrap">
                          {sub.exclusions || <span className="text-slate-400 italic">None specified.</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Action Row */}
                  <tr className="bg-slate-50/20 border-t border-slate-200 divide-x divide-slate-200">
                    <td className="px-6 py-6 font-bold text-slate-800 bg-slate-50/30 sticky left-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      Leveling Actions
                    </td>
                    {submittedBidders.map(bidder => {
                      const isAwarded = bidder.status?.toLowerCase() === 'awarded';
                      const isPackageAwarded = bidPackage.status?.toLowerCase() === 'awarded';
                      
                      return (
                        <td key={bidder.id} className="px-6 py-6 bg-white">
                          {isAwarded ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-sm">
                              <CheckCircle className="h-5 w-5" />
                              Awarded Subcontractor
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleAward(bidder.id, bidder.subcontractor?.name)}
                              disabled={isPackageAwarded || awardMutation.isPending}
                              className={`w-full font-bold shadow-sm flex items-center justify-center gap-1.5 py-5 ${
                                isPackageAwarded 
                                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed hover:bg-slate-100'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600'
                              }`}
                            >
                              <Award className="h-4 w-4" />
                              Award Package
                            </Button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
