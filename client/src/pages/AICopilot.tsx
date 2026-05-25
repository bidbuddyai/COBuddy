import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  ShieldAlert, 
  CalendarDays, 
  TrendingUp, 
  HelpCircle, 
  Layers, 
  FileText, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { Project, ScheduleActivity, ChangeOrder } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function AICopilot() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();

  // Selected agent state
  const [selectedAgent, setSelectedAgent] = useState<'supervisor' | 'schedule' | 'budget' | 'rfi' | 'leveling'>('supervisor');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AgentLog[]>([]);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditCompleted, setAuditCompleted] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Queries
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: activities = [] } = useQuery<ScheduleActivity[]>({
    queryKey: [`/api/projects/${parsedProjectId}/schedule`],
    enabled: !!parsedProjectId,
  });

  // Mock logs for when agents are running
  const supervisorAgentLogs: AgentLog[] = [
    { timestamp: '12:04:10', type: 'info', message: 'Supervisor Agent initialized. Scanning draft Potential Change Orders (PCOs)...' },
    { timestamp: '12:04:11', type: 'info', message: 'Analyzing CO-2 (Addendum #1 Structural Footings). Found 4 cost line items.' },
    { timestamp: '12:04:12', type: 'info', message: 'Running semantic hybrid search on labor classifications against Company Rate Sheets...' },
    { timestamp: '12:04:13', type: 'success', message: 'Trigram Match: "Journeyman Carpenter" matched "Journeyman Carpenter" (Confidence: 98%). Rate matches approved $65.00/hr.' },
    { timestamp: '12:04:14', type: 'warning', message: 'Rate Discrepancy Found: "Laborer Group 3" loaded with $48.00/hr. Registered company rate is $45.00/hr. (Difference: +$3.00/hr)' },
    { timestamp: '12:04:14', type: 'info', message: 'Verifying operated equipment rules on equipment line: "Excavator CAT 320" (8 hours).' },
    { timestamp: '12:04:15', type: 'error', message: 'Logic Violation: "Excavator CAT 320" listed as unoperated, but no operated operator hours or labor line is linked. Equipment must be operated per contract Section 4.2.' },
    { timestamp: '12:04:16', type: 'info', message: 'Calculating markup percentages. Expected Markups: Labor 15%, Equipment 10%.' },
    { timestamp: '12:04:17', type: 'warning', message: 'Markup Mismatch: Stored markup of $850.00 does not align with computed contract markup of $785.50.' },
    { timestamp: '12:04:18', type: 'info', message: 'Audit complete. Flagged 1 logic violation, 1 rate mismatch, and 1 markup mismatch.' }
  ];

  const scheduleAgentLogs: AgentLog[] = [
    { timestamp: '12:05:01', type: 'info', message: 'Schedule Risk Auditor initialized. Scanning project schedule lookahead logs...' },
    { timestamp: '12:05:02', type: 'info', message: `Found ${activities.length} total activities. Computing critical path sequence...` },
    { timestamp: '12:05:03', type: 'success', message: 'Critical path mapped: [Structure Demolition] -> [Concrete Footings] -> [Structural Steel Framing].' },
    { timestamp: '12:05:04', type: 'info', message: 'Querying external supply chain APIs & regional weather risk models...' },
    { timestamp: '12:05:05', type: 'warning', message: 'Delay Risk: "Concrete Footings" (Start: June 11) overlaps with predicted heavy precipitation window (June 12-14). Delay probability: 72%.' },
    { timestamp: '12:05:06', type: 'warning', message: 'Resource Overallocation: "Demolition Sub" is scheduled on "Structure Demolition" and an adjacent municipal contract simultaneously. Labor crunch probability: 64%.' },
    { timestamp: '12:05:07', type: 'info', message: 'Evaluating milestones. Target completion date: Oct 15, 2026.' },
    { timestamp: '12:05:08', type: 'error', message: 'Critical Path Compression: Due to predicted weather delays, overall project delivery is at risk of slipping by 6 business days. Immediate recovery schedule recommended.' },
    { timestamp: '12:05:09', type: 'info', message: 'Lookahead audit complete. Mapped 3 critical delays with delay mitigations.' }
  ];

  const budgetAgentLogs: AgentLog[] = [
    { timestamp: '12:06:00', type: 'info', message: 'Budget Variance Auditor initialized. Auditing active cost codes...' },
    { timestamp: '12:06:01', type: 'info', message: 'Comparing Original Budget vs Estimated at Completion (EAC) across 8 main codes.' },
    { timestamp: '12:06:02', type: 'success', message: 'Code 02-100 (Site Demolition): EAC variance is positive (+$24,500). Budget healthy.' },
    { timestamp: '12:06:03', type: 'warning', message: 'Forecast Warning: Code 03-300 (Concrete Reinforcing): Actual spent is at 92%, but percent complete is only 78%. Forecasted overrun of $18,200.' },
    { timestamp: '12:06:04', type: 'error', message: 'Budget Leakage Detected: Code 05-100 (Structural Framing): EAC exceeds original budget. Negative variance: -$45,200. Driven by committed subcontractor steel cost overrun.' },
    { timestamp: '12:06:05', type: 'info', message: 'Auditing change order integrations.' },
    { timestamp: '12:06:06', type: 'warning', message: 'Unintegrated Costs: Found $12,500 in pending GC PCOs that have not been compiled into cost forecasts.' },
    { timestamp: '12:06:07', type: 'info', message: 'Audit complete. Flagged 1 budget leakage overrun and 2 cost forecast anomalies.' }
  ];

  const rfiAgentLogs: AgentLog[] = [
    { timestamp: '12:07:05', type: 'info', message: 'RFI Technical Solver initialized. Querying open RFIs and specifications...' },
    { timestamp: '12:07:06', type: 'info', message: 'Pounding spec documents and structural footings blueprint indexes...' },
    { timestamp: '12:07:07', type: 'success', message: 'Retrieved Section 03300 (Cast-in-Place Concrete) and Section 05120 (Structural Steel).' },
    { timestamp: '12:07:08', type: 'info', message: 'Formulating draft response for RFI #102: "Footing Rebar Clearance Collision".' },
    { timestamp: '12:07:09', type: 'info', message: 'Applying structural rebar clearance parameters (ACI 318 compliance)...' },
    { timestamp: '12:07:10', type: 'success', message: 'Response drafted! Proposes shifting vertical bars by 1.5 inches to clear plumbing sleeve, in line with specification Section 03300-3.04.B.' },
    { timestamp: '12:07:11', type: 'info', message: 'Audit complete. Autopopulated technical answers for 1 open RFI.' }
  ];

  const levelingAgentLogs: AgentLog[] = [
    { timestamp: '12:08:12', type: 'info', message: 'Subcontractor Bid Leveling Analyst initialized...' },
    { timestamp: '12:08:13', type: 'info', message: 'Scanning Bid Package #12 (North Wing Concrete Works). Found 3 submitted bids.' },
    { timestamp: '12:08:14', type: 'info', message: 'Mapping lump sums: Concrete Pros ($245k), Titan Concrete ($228k), Apex Builders ($260k).' },
    { timestamp: '12:08:15', type: 'warning', message: 'Scope Gap Spotted: Titan Concrete ($228k) is missing Code 03-200 (Rebar Installation) in their scope description! Omission value estimated at $22,000.' },
    { timestamp: '12:08:16', type: 'warning', message: 'Exclusion Detected: Concrete Pros ($245k) excludes concrete pumping equipment fees (+10k estimated).' },
    { timestamp: '12:08:17', type: 'success', message: 'AI Leveling Matrix Compiled. Leveled values: Concrete Pros ($255k), Titan Concrete ($250k), Apex Builders ($260k).' },
    { timestamp: '12:08:18', type: 'info', message: 'Audit complete. Highlighted 1 scope gap and compiled leveled comparison table.' }
  ];

  // Execute Agent Audit Simulation
  const runAgentAudit = async () => {
    setIsAuditing(true);
    setAuditCompleted(false);
    setAuditProgress(0);
    setAuditLogs([]);
    setReportData(null);

    try {
      const response = await fetch(`/api/projects/${parsedProjectId}/ai-copilot/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent: selectedAgent }),
      });

      if (!response.ok) throw new Error('Failed to deploy agent');
      
      const data = await response.json();
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < data.logs.length) {
          setAuditLogs(prev => [...prev, data.logs[index]]);
          setAuditProgress(Math.round(((index + 1) / data.logs.length) * 100));
          index++;
        } else {
          clearInterval(interval);
          setIsAuditing(false);
          setAuditCompleted(true);
          setReportData(data.report);
          toast({
            title: "Audit Completed",
            description: `The ProjectBuddy AI ${selectedAgent.toUpperCase()} Agent has successfully finished auditing.`,
          });
        }
      }, 350);
    } catch (err: any) {
      setIsAuditing(false);
      toast({
        title: "Agent Deployment Failed",
        description: err.message || "Failed to communicate with agent service",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Reset audit states when changing agent
    setAuditLogs([]);
    setAuditProgress(0);
    setAuditCompleted(false);
    setIsAuditing(false);
  }, [selectedAgent]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">AI Copilot</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            AI Operations Control Room
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deploy specialized, autonomous AI agents to audit schedules, budgets, change order compliance, and level bids.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/projects/${parsedProjectId}`}>
            <Button variant="outline" className="border-slate-200 hover:bg-slate-100 dark:border-slate-800">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Workspace Overview
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid of Available Agents */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Supervisor Agent */}
        <Card 
          onClick={() => !isAuditing && setSelectedAgent('supervisor')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
            selectedAgent === 'supervisor' 
              ? 'border-emerald-600 bg-emerald-50/20 dark:border-emerald-500/50 dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-card'
          }`}
        >
          <CardContent className="p-4 flex flex-col items-center text-center space-y-2.5">
            <div className={`p-3 rounded-xl ${selectedAgent === 'supervisor' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">CO Compliance</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">Audits draft change orders against rate tables.</p>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 text-[10px] border-none font-bold">
              3 Warnings
            </Badge>
          </CardContent>
        </Card>

        {/* Schedule Risk Agent */}
        <Card 
          onClick={() => !isAuditing && setSelectedAgent('schedule')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
            selectedAgent === 'schedule' 
              ? 'border-emerald-600 bg-emerald-50/20 dark:border-emerald-500/50 dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-card'
          }`}
        >
          <CardContent className="p-4 flex flex-col items-center text-center space-y-2.5">
            <div className={`p-3 rounded-xl ${selectedAgent === 'schedule' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Schedule Risk</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">Predicts critical path bottlenecks and weather delays.</p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 text-[10px] border-none font-bold">
              2 Risks
            </Badge>
          </CardContent>
        </Card>

        {/* Budget Leakage Agent */}
        <Card 
          onClick={() => !isAuditing && setSelectedAgent('budget')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
            selectedAgent === 'budget' 
              ? 'border-emerald-600 bg-emerald-50/20 dark:border-emerald-500/50 dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-card'
          }`}
        >
          <CardContent className="p-4 flex flex-col items-center text-center space-y-2.5">
            <div className={`p-3 rounded-xl ${selectedAgent === 'budget' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Budget Leakage</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">Monitors committed overruns & forecasts variance.</p>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 text-[10px] border-none font-bold">
              1 Cost Leak
            </Badge>
          </CardContent>
        </Card>

        {/* RFI Solver Agent */}
        <Card 
          onClick={() => !isAuditing && setSelectedAgent('rfi')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
            selectedAgent === 'rfi' 
              ? 'border-emerald-600 bg-emerald-50/20 dark:border-emerald-500/50 dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-card'
          }`}
        >
          <CardContent className="p-4 flex flex-col items-center text-center space-y-2.5">
            <div className={`p-3 rounded-xl ${selectedAgent === 'rfi' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">RFI Solver</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">Pounds design specs to draft technical answers.</p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 text-[10px] border-none font-bold">
              1 Open
            </Badge>
          </CardContent>
        </Card>

        {/* Bid Leveling Agent */}
        <Card 
          onClick={() => !isAuditing && setSelectedAgent('leveling')}
          className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
            selectedAgent === 'leveling' 
              ? 'border-emerald-600 bg-emerald-50/20 dark:border-emerald-500/50 dark:bg-emerald-950/10' 
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-card'
          }`}
        >
          <CardContent className="p-4 flex flex-col items-center text-center space-y-2.5">
            <div className={`p-3 rounded-xl ${selectedAgent === 'leveling' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Bid Leveling</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">Compares bids, spots exclusions, and levels scopes.</p>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 text-[10px] border-none font-bold">
              1 Scope Gap
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Console: Run Audit & Live Thought Terminals (1/3) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-5 w-5 text-emerald-600" />
                <span>Agent Execution Deck</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Deploy and watch the selected agent's thought process
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="bg-slate-905 text-slate-200 p-4 rounded-xl font-mono text-[11px] h-[320px] overflow-y-auto border border-slate-950 flex flex-col bg-slate-950">
                <div className="flex-1 space-y-2.5">
                  {auditLogs.length === 0 ? (
                    <div className="text-slate-500 italic h-full flex items-center justify-center">
                      Agent idle. Click "Deploy Agent" below.
                    </div>
                  ) : (
                    auditLogs.map((log, index) => (
                      <div key={index} className="flex gap-2 leading-relaxed">
                        <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                        <span className={`
                          ${log.type === 'success' ? 'text-green-400' : ''}
                          ${log.type === 'warning' ? 'text-amber-400 font-medium' : ''}
                          ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                          ${log.type === 'info' ? 'text-slate-200' : ''}
                        `}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isAuditing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Running Audit...</span>
                    <span>{auditProgress}%</span>
                  </div>
                  <Progress value={auditProgress} className="h-2 bg-slate-100 dark:bg-slate-800" />
                </div>
              )}

              <Button 
                onClick={runAgentAudit} 
                disabled={isAuditing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-5 rounded-xl shadow-sm inline-flex items-center justify-center gap-2"
              >
                {isAuditing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running Audit...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Deploy {selectedAgent.toUpperCase()} Agent
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Console: Live Actionable Results (2/3) */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border shadow-sm h-full">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  {selectedAgent === 'supervisor' && "CO Compliance Audit Report"}
                  {selectedAgent === 'schedule' && "Schedule Lookahead Risk Report"}
                  {selectedAgent === 'budget' && "Budget Variance Leakage Report"}
                  {selectedAgent === 'rfi' && "RFI Technical Drafts"}
                  {selectedAgent === 'leveling' && "Subcontractor Bid Leveling Matrix"}
                </CardTitle>
                <CardDescription className="text-xs">
                  Actionable insights generated by the autonomous AI PM agent
                </CardDescription>
              </div>
              {auditCompleted && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 hover:bg-green-100 inline-flex items-center gap-1 border-none font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  Compiled
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {!auditCompleted ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-16 text-center text-slate-400 h-full flex flex-col justify-center items-center space-y-4"
                  >
                    <div className="p-4 bg-slate-100 rounded-full dark:bg-slate-800">
                      <Sparkles className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Ready to Scan</h3>
                      <p className="text-xs text-slate-500 max-w-sm mt-1 mx-auto leading-relaxed">
                        Deploy the {selectedAgent.toUpperCase()} agent to read the active databases, blueprinted documents, and contract rates.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* SUPERVISOR RESULTS */}
                    {selectedAgent === 'supervisor' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 rounded-xl flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">1 Logic Violation Flagged</h4>
                            <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed mt-0.5">
                              PCO #2 contains an unoperated "Excavator CAT 320" (8 hours). Per Section 4.2, equipment must have labor hours or operating classification linked.
                            </p>
                            <Button size="sm" className="mt-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold">
                              Link Operated Labor
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Rate & Markup Mismatches</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed mt-0.5">
                              - "Laborer Group 3" rate of $48.00/hr exceeds approved rate sheet of $45.00/hr (+3.00/hr variance).<br />
                              - Total markup computed is $785.50 vs stored $850.00.
                            </p>
                            <Button size="sm" className="mt-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold">
                              Auto-Sync Rates & Markups
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SCHEDULE RESULTS */}
                    {selectedAgent === 'schedule' && (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-card">
                              <TableHead className="font-bold text-xs">Lookahead Activity</TableHead>
                              <TableHead className="font-bold text-xs">Responsible Party</TableHead>
                              <TableHead className="font-bold text-xs">Risk Type</TableHead>
                              <TableHead className="font-bold text-xs text-center">Delay Risk</TableHead>
                              <TableHead className="font-bold text-xs text-right">Mitigation Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold text-sm">Concrete Footings</TableCell>
                              <TableCell className="text-xs">Concrete Pros</TableCell>
                              <TableCell className="text-xs">Weather (Precipitation)</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-red-50 text-red-700 hover:bg-red-50 text-[10px] font-bold dark:bg-red-950 dark:text-red-400">72% Risk</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="text-xs border-slate-200 dark:border-slate-800">
                                  Shift Start Date
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-semibold text-sm">Structure Demolition</TableCell>
                              <TableCell className="text-xs">Demolition Sub</TableCell>
                              <TableCell className="text-xs">Resource Overallocation</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px] font-bold dark:bg-amber-950 dark:text-amber-400">64% Risk</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="text-xs border-slate-200 dark:border-slate-800">
                                  Request Labor Backup
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 rounded-xl flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">Milestone Delivery at Risk</h4>
                            <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed mt-0.5">
                              Due to weather and resource compressions, the target "Structure Demolition" milestone completion date is predicted to slip by 6 days, placing overall contractual delivery in jeopardy.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BUDGET RESULTS */}
                    {selectedAgent === 'budget' && (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-card">
                              <TableHead className="font-bold text-xs">Cost Code</TableHead>
                              <TableHead className="font-bold text-xs text-right">Original Budget</TableHead>
                              <TableHead className="font-bold text-xs text-right">Forecasted EAC</TableHead>
                              <TableHead className="font-bold text-xs text-right">EAC Variance</TableHead>
                              <TableHead className="font-bold text-xs text-right">AI Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(reportData?.items || [
                              { code: "05-100", name: "Structural Framing", original: 450000, eac: 495200, variance: -45200 },
                              { code: "03-300", name: "Concrete Reinforcing", original: 125000, eac: 143200, variance: -18200 }
                            ]).map((item: any) => (
                              <TableRow key={item.code}>
                                <TableCell className="font-semibold text-sm">{item.code} {item.name}</TableCell>
                                <TableCell className="text-sm text-right font-medium">${item.original.toLocaleString()}</TableCell>
                                <TableCell className="text-sm text-right font-medium">${item.eac.toLocaleString()}</TableCell>
                                <TableCell className={`text-sm text-right font-bold ${item.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {item.variance < 0 ? '-' : ''}${Math.abs(item.variance).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold">
                                    {item.variance < 0 ? 'Draft SCO' : 'Investigate'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-xl flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">Leakage Recovery Suggestion</h4>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed mt-0.5">
                              The $45,200 overrun in Structural Framing concrete steel is due to subcontractor field changes. The AI has drafted a Potential Change Order to pass this cost to the client.
                            </p>
                            <Button size="sm" className="mt-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold">
                              Review Draft PCO
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RFI RESULTS */}
                    {selectedAgent === 'rfi' && (
                      <div className="space-y-4">
                        <Card className="bg-slate-50 dark:bg-slate-800/20 border shadow-none p-4 space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{reportData?.rfiNumber || "RFI #102"} Reference</span>
                            <h4 className="text-sm font-bold mt-0.5">{reportData?.rfiSubject || "Footing Rebar Clearance Plumbing Sleeve Collision"}</h4>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-900 border border-border p-3 rounded-lg text-xs leading-relaxed space-y-2.5">
                            <p className="font-bold text-slate-800 dark:text-slate-200">AI Proposed Technical Justification:</p>
                            <p className="text-slate-600 dark:text-slate-400">
                              "{reportData?.proposedResponse || "In response to the physical structural rebar and plumbing sleeve clearance collision at footing F-12, we propose shifting the vertical reinforcing bars by 1.5 inches to the north. This maintains the 3-inch clearance parameters required for Cast-in-Place concrete under soil exposure per ACI 318-19, and is compliant with the specifications outlined in contract Section 03300-3.04.B."}"
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold">
                              Apply Proposed Answer
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs border-slate-200 dark:border-slate-800">
                              Refine Draft
                            </Button>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* LEVELING RESULTS */}
                    {selectedAgent === 'leveling' && (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-card">
                              <TableHead className="font-bold text-xs">Concrete Scope Item</TableHead>
                              <TableHead className="font-bold text-xs text-right">Concrete Pros</TableHead>
                              <TableHead className="font-bold text-xs text-right">Titan Concrete</TableHead>
                              <TableHead className="font-bold text-xs text-right">Apex Builders</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {((reportData?.levelingMatrix) || [
                              { bidder: "Concrete Pros", baseBid: 245000, exclusions: "+$10,000 (Pump)", leveledTotal: 255000, status: "warning" },
                              { bidder: "Titan Concrete", baseBid: 228000, exclusions: "+$22,000 (Rebar placement)", leveledTotal: 250000, status: "danger" },
                              { bidder: "Apex Builders", baseBid: 260000, exclusions: "None (Included)", leveledTotal: 260000, status: "success" }
                            ]) && (
                              <>
                                <TableRow>
                                  <TableCell className="font-semibold text-sm">Submitted Bid Amount</TableCell>
                                  <TableCell className="text-sm text-right font-medium">${(reportData?.levelingMatrix?.[0]?.baseBid || 245000).toLocaleString()}</TableCell>
                                  <TableCell className="text-sm text-right font-medium">${(reportData?.levelingMatrix?.[1]?.baseBid || 228000).toLocaleString()}</TableCell>
                                  <TableCell className="text-sm text-right font-medium">${(reportData?.levelingMatrix?.[2]?.baseBid || 260000).toLocaleString()}</TableCell>
                                </TableRow>
                                <TableRow className="bg-red-50/20">
                                  <TableCell className="font-semibold text-sm">Scope Omissions & Exclusions</TableCell>
                                  <TableCell className="text-sm text-right text-amber-600">{(reportData?.levelingMatrix?.[0]?.exclusions || "+$10,000 (Pump)")}</TableCell>
                                  <TableCell className="text-sm text-right text-red-600 font-bold">{(reportData?.levelingMatrix?.[1]?.exclusions || "+$22,000 (Rebar omission)")}</TableCell>
                                  <TableCell className="text-sm text-right text-green-600 font-medium">{(reportData?.levelingMatrix?.[2]?.exclusions || "Included")}</TableCell>
                                </TableRow>
                                <TableRow className="bg-emerald-50/20">
                                  <TableCell className="font-bold text-sm">Leveled Comparison Total</TableCell>
                                  <TableCell className="text-sm text-right font-bold text-emerald-800">${(reportData?.levelingMatrix?.[0]?.leveledTotal || 255000).toLocaleString()}</TableCell>
                                  <TableCell className="text-sm text-right font-bold text-emerald-800">${(reportData?.levelingMatrix?.[1]?.leveledTotal || 250000).toLocaleString()}</TableCell>
                                  <TableCell className="text-sm text-right font-bold text-emerald-800">${(reportData?.levelingMatrix?.[2]?.leveledTotal || 260000).toLocaleString()}</TableCell>
                                </TableRow>
                              </>
                            )}
                          </TableBody>
                        </Table>

                        <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Scope Gap Alert on Titan Concrete</h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium leading-relaxed mt-0.5">
                              Although Titan Concrete submitted the lowest unlevelled bid of $228,000, they completely excluded concrete reinforcement (rebar) placement from their proposal. Adding rebar back raises their leveled cost to $250,000.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
