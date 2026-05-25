import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ShieldAlert, Gavel, Calendar, FileText, CheckCircle2, DollarSign, Plus, Trash2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { BidInvitation, BidPackage, Subcontractor } from '@shared/schema';

type InvitationWithRelations = BidInvitation & {
  bidPackage: BidPackage;
  subcontractor: Subcontractor;
};

export default function BiddingPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [baseBid, setBaseBid] = useState('');
  const [clarifications, setClarifications] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  
  // Alternates list: [{name, amount}]
  const [alternates, setAlternates] = useState<Array<{ name: string; amount: string }>>([]);
  const [newAltName, setNewAltName] = useState('');
  const [newAltAmount, setNewAltAmount] = useState('');
  
  // Unit prices list: [{item, price, unit}]
  const [unitPrices, setUnitPrices] = useState<Array<{ item: string; price: string; unit: string }>>([]);
  const [newUnitItem, setNewUnitItem] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState('');
  const [newUnitUnit, setNewUnitUnit] = useState('');

  const { data: invitation, isLoading, error } = useQuery<InvitationWithRelations>({
    queryKey: [`/api/bidding-portal/${token}`],
    enabled: !!token,
    retry: false,
  });

  const submitBid = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/bidding-portal/${token}/submit`, data);
    },
    onSuccess: () => {
      toast({
        title: "Bid Submitted Successfully",
        description: "Thank you! Your pricing proposals have been registered.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/bidding-portal/${token}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit bid proposal",
        variant: "destructive",
      });
    },
  });

  const addAlternate = () => {
    if (!newAltName.trim() || !newAltAmount.trim()) return;
    setAlternates([...alternates, { name: newAltName, amount: newAltAmount }]);
    setNewAltName('');
    setNewAltAmount('');
  };

  const removeAlternate = (index: number) => {
    setAlternates(alternates.filter((_, i) => i !== index));
  };

  const addUnitPrice = () => {
    if (!newUnitItem.trim() || !newUnitPrice.trim() || !newUnitUnit.trim()) return;
    setUnitPrices([...unitPrices, { item: newUnitItem, price: newUnitPrice, unit: newUnitUnit }]);
    setNewUnitItem('');
    setNewUnitPrice('');
    setNewUnitUnit('');
  };

  const removeUnitPrice = (index: number) => {
    setUnitPrices(unitPrices.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseBid.trim() || isNaN(parseFloat(baseBid))) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid base bid amount.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      baseBid: parseFloat(baseBid),
      clarifications,
      exclusions,
      submittedBy: submittedBy || invitation?.inviteeEmail,
      alternates: alternates.map(alt => ({ name: alt.name, amount: parseFloat(alt.amount) })),
      unitPrices: unitPrices.map(up => ({ item: up.item, price: parseFloat(up.price), unit: up.unit })),
      attachments: [],
    };

    submitBid.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Bidding Invitation Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4">
        <Card className="max-w-md w-full border-red-900/40 bg-slate-950 text-slate-100">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-2" />
            <CardTitle>Portal Access Denied</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              The secure link you clicked is either invalid, has expired, or the invitation has been rescinded.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { bidPackage, subcontractor } = invitation;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Premium Guest Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur py-4 px-6 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-emerald-600 rounded flex items-center justify-center">
              <Gavel className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">ProjectCommand</span>
              <span className="text-[10px] uppercase font-semibold text-emerald-500 ml-2 border border-emerald-500/30 px-1.5 py-0.5 rounded bg-emerald-950/20">Bidder Portal</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-medium">Invited Subcontractor:</p>
            <p className="text-sm font-bold text-slate-200">{subcontractor.name}</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Scope & Instructions */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur text-slate-100 shadow-xl">
            <CardHeader className="border-b border-slate-800/60 pb-4">
              <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">Package Scope</span>
              <CardTitle className="text-xl font-bold mt-1 text-white">{bidPackage.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Package Description</Label>
                <p className="text-sm text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                  {bidPackage.description || 'No formal description provided.'}
                </p>
              </div>
              <div className="border-t border-slate-800/60 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Trade Category</Label>
                  <Badge variant="outline" className="mt-1 border-slate-700 bg-slate-800/50 text-slate-200 capitalize font-medium py-0.5 px-2">
                    {bidPackage.tradeCategory || '—'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Proposal Due Date</Label>
                  <span className="text-sm text-slate-200 font-bold block mt-1 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    {bidPackage.dueDate ? format(new Date(bidPackage.dueDate), 'MMM dd, yyyy') : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/30 text-slate-100">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-950/40 rounded border border-emerald-900/40 mt-0.5">
                  <FileText className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">Plans & Specifications</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Refer to your email attachment invitation or the project administrator for detailed blueprints.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Bid Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          {invitation.status === 'submitted' ? (
            <Card className="border-emerald-800/40 bg-emerald-950/10 text-slate-100 shadow-xl p-8 text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Proposal Successfully Submitted</h2>
              <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                Your proposal has been logged securely. The estimating manager has been notified. You can update your submission by resubmitting this form if required.
              </p>
              <div className="pt-4 border-t border-slate-800/60 max-w-sm mx-auto">
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/bidding-portal/${token}`] })} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Refresh Details
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-slate-800 bg-slate-900/40 text-slate-100 shadow-2xl">
              <CardHeader className="border-b border-slate-800/60 pb-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Submit Pricing Proposal
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Please fill out the pricing and clarification sheets below to submit your official bid.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Base Bid */}
                  <div className="space-y-2">
                    <Label htmlFor="baseBid" className="text-slate-300 text-xs font-bold uppercase tracking-wider">Base Bid Price ($ USD) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="baseBid"
                        type="number"
                        placeholder="0.00"
                        className="pl-9 bg-slate-950 border-slate-800 text-white"
                        value={baseBid}
                        onChange={(e) => setBaseBid(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Alternates */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/60">
                    <div>
                      <Label className="text-slate-300 text-xs font-bold uppercase tracking-wider">Alternates (Optional Add/Deduct)</Label>
                      <p className="text-xs text-slate-500 mt-1">Specify additional scopes or cost variances for review.</p>
                    </div>
                    {alternates.length > 0 && (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                        {alternates.map((alt, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/40 p-2 rounded border border-slate-800">
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[280px]">{alt.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-emerald-400">${parseFloat(alt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeAlternate(idx)} className="h-6 w-6 p-0 text-red-500 hover:text-red-400">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Alternate Scope/Name"
                        className="col-span-2 bg-slate-950 border-slate-800 text-xs text-white"
                        value={newAltName}
                        onChange={(e) => setNewAltName(e.target.value)}
                      />
                      <div className="relative">
                        <Input
                          placeholder="Amount"
                          type="number"
                          className="bg-slate-950 border-slate-800 text-xs text-white pr-8"
                          value={newAltAmount}
                          onChange={(e) => setNewAltAmount(e.target.value)}
                        />
                        <Button 
                          type="button" 
                          onClick={addAlternate} 
                          className="absolute right-0 top-0 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 shadow-sm rounded-l-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Unit Prices */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/60">
                    <div>
                      <Label className="text-slate-300 text-xs font-bold uppercase tracking-wider">Unit Pricing Table (Optional)</Label>
                      <p className="text-xs text-slate-500 mt-1">Specify billing rates for quantity changes.</p>
                    </div>
                    {unitPrices.length > 0 && (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                        {unitPrices.map((up, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/40 p-2 rounded border border-slate-800">
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[280px]">{up.item}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-emerald-400">${parseFloat(up.price).toLocaleString()} / {up.unit}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeUnitPrice(idx)} className="h-6 w-6 p-0 text-red-500 hover:text-red-400">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-12 gap-2">
                      <Input
                        placeholder="Item Description"
                        className="col-span-6 bg-slate-950 border-slate-800 text-xs text-white"
                        value={newUnitItem}
                        onChange={(e) => setNewUnitItem(e.target.value)}
                      />
                      <Input
                        placeholder="Price"
                        type="number"
                        className="col-span-3 bg-slate-950 border-slate-800 text-xs text-white"
                        value={newUnitPrice}
                        onChange={(e) => setNewUnitPrice(e.target.value)}
                      />
                      <div className="col-span-3 relative">
                        <Input
                          placeholder="Unit"
                          className="bg-slate-950 border-slate-800 text-xs text-white pr-8"
                          value={newUnitUnit}
                          onChange={(e) => setNewUnitUnit(e.target.value)}
                        />
                        <Button 
                          type="button" 
                          onClick={addUnitPrice} 
                          className="absolute right-0 top-0 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 shadow-sm rounded-l-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Clarifications & Exclusions */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/60">
                    <div className="space-y-2">
                      <Label htmlFor="clarifications" className="text-slate-300 text-xs font-bold uppercase tracking-wider">Scope Clarifications / Inclusions</Label>
                      <Textarea
                        id="clarifications"
                        rows={3}
                        placeholder="Detail specific details included in your bid proposal..."
                        className="bg-slate-950 border-slate-800 text-white"
                        value={clarifications}
                        onChange={(e) => setClarifications(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exclusions" className="text-slate-300 text-xs font-bold uppercase tracking-wider">Scope Exclusions</Label>
                      <Textarea
                        id="exclusions"
                        rows={3}
                        placeholder="Detail specific items excluded from your bid proposal..."
                        className="bg-slate-950 border-slate-800 text-white"
                        value={exclusions}
                        onChange={(e) => setExclusions(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-800/60">
                    <Label htmlFor="submittedBy" className="text-slate-300 text-xs font-bold uppercase tracking-wider">Authorized Submitter Name *</Label>
                    <Input
                      id="submittedBy"
                      placeholder="e.g. John Doe, Estimating Manager"
                      className="bg-slate-950 border-slate-800 text-white"
                      value={submittedBy}
                      onChange={(e) => setSubmittedBy(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl dark:bg-emerald-700 dark:hover:bg-emerald-600 font-bold"
                    disabled={submitBid.isPending}
                  >
                    Submit Official Bid Proposal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
