import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  HelpCircle, 
  ClipboardCheck, 
  Layers, 
  CheckSquare,
  Sparkles,
  ArrowRight,
  Shield,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="border-b border-border bg-white/80 dark:bg-card/85 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-700 dark:bg-emerald-600/20 text-white dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-foreground tracking-tight block leading-tight">
                ProjectBuddy
              </span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                Construction PM Platform
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/auth">
              <Button 
                variant="ghost" 
                className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth">
              <Button 
                className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm font-bold text-sm px-4"
              >
                Enter Workspace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content container */}
      <main className="flex-1 flex flex-col justify-center relative z-10">
        {/* Subtle grid pattern for background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="container mx-auto px-6 py-16">
          
          {/* Hero Section */}
          <div className="text-center mb-16 max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-100/80 dark:border-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Construction Operations Hub</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-tight">
              Construction Project Management, <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-emerald-600 dark:from-emerald-400 dark:to-emerald-300">Simplified.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              Manage budgets, schedules, RFIs, submittals, bid packages, and punch lists in one cohesive platform. Powered by built-in <span className="text-emerald-700 dark:text-emerald-400 font-semibold underline decoration-emerald-500/40 decoration-2 underline-offset-4">CO Buddy AI</span> for automated change order creation.
            </p>

            <div className="flex justify-center pt-4">
              <Link href="/auth">
                <Button 
                  size="lg" 
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-8 py-6 text-base font-bold shadow-lg shadow-emerald-700/10 hover:shadow-emerald-700/25 transition-all duration-200"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Sections */}
          <div className="space-y-6 mb-20">
            <div className="text-center max-w-lg mx-auto mb-12">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Full-Cycle PM Operations</h2>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Every tool needed to build seamlessly from bid to punch list.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Feature 1: Budget */}
              <Card className="border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-emerald-500/25 transition-all duration-200">
                <CardHeader>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">Budget Tracking</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Track original budgets, pending vs. approved changes, committed costs, and project forecasts mapped to standard corporate cost codes.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 2: Schedule */}
              <Card className="border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-emerald-500/25 transition-all duration-200">
                <CardHeader>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">Schedule Management</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Import schedule lines via CSV files, track critical path activities, set milestones, and update activity percentages in real time.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 3: RFIs */}
              <Card className="border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-emerald-500/25 transition-all duration-200">
                <CardHeader>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">RFI Workflow</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Draft, route, and reply to Requests for Information (RFIs) with official responses, drawings, specifications, and inline team discussions.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 4: Submittals */}
              <Card className="border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-emerald-500/25 transition-all duration-200">
                <CardHeader>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">Submittal Tracking</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Manage submittals from subcontractors, track review status with structural reviewers, and record official stamp decisions with attachments.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 5: Bid Packages */}
              <Card className="border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-emerald-500/25 transition-all duration-200">
                <CardHeader>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <Layers className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">Bid Packages & Leveling</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Invite subcontractors to bid through secure links, view external subcontractor bids, and automatically level values side-by-side.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 6: Punch & Tasks */}
              <Card className="border-border bg-white dark:bg-card shadow-sm hover:shadow-md hover:border-emerald-500/25 transition-all duration-200">
                <CardHeader>
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-foreground text-base font-bold">Punch Lists & Tasks</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Log QA/QC field defects, allocate assignees and due dates, set priority tags, and complete punch lists by location with photographic backups.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* AI Feature Callout */}
          <div className="border border-emerald-100 dark:border-emerald-950/50 p-8 sm:p-12 rounded-2xl max-w-5xl mx-auto bg-white dark:bg-card shadow-lg shadow-slate-100 dark:shadow-none relative overflow-hidden mb-20 flex flex-col lg:flex-row items-center gap-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent)] pointer-events-none" />
            
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center space-x-1.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold">
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>INTEGRATED CO BUDDY MODULE</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                AI-Powered Change Order Automation
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                Upload labor T&M sheets, material receipts or subcontractor invoices. Our integrated AI scans drawings, matches contractual rate tables, performs calculations, and drafts complete change packages conversationally.
              </p>
            </div>
            <div className="w-full lg:w-72 flex-shrink-0 bg-slate-50 dark:bg-card border border-slate-100 dark:border-slate-800/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">CO Buddy Assistant</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[11px] bg-white dark:bg-card p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/50 text-slate-600 dark:text-slate-300 italic">
                "I scanned the uploaded Daily Report. Matched 8.5 hours of Labor class II with your GC rate sheet. Generating CO draft now..."
              </div>
              <div className="flex space-x-1.5 justify-end">
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold uppercase">OCR Ready</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold uppercase">Calculated</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center border border-border p-10 sm:p-14 rounded-2xl max-w-4xl mx-auto bg-white dark:bg-card shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.02),transparent)] pointer-events-none" />
            <h2 className="text-3xl font-black text-foreground mb-4 tracking-tight">
              Ready to Supercharge Your Project Workspace?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
              Unite your cost, scheduling, submittals, RFIs, and change orders inside a fast, secure, and collaborative hub built for modern construction operations.
            </p>
            <Link href="/auth">
              <Button 
                size="lg" 
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-10 py-5 text-base font-bold shadow-lg transition-all duration-200"
              >
                Sign In to Your Workspace
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white dark:bg-card/50 py-8 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <span className="font-semibold text-slate-800 dark:text-slate-300">ProjectBuddy</span>
            <p>© 2026 ProjectBuddy. All rights reserved. Built for GCs, PMs, Estimators, and Subcontractors.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
