import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ProjectProvider } from "@/contexts/ProjectContext";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ChangeOrders from "@/pages/ChangeOrders";
import ChangeOrderLogs from "@/pages/ChangeOrderLogs";
import RateTables from "@/pages/RateTables";
import Analytics from "@/pages/Analytics";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import Company from "@/pages/Company";
import RFIs from "@/pages/RFIs";
import RFIDetails from "@/pages/RFIDetails";
import Submittals from "@/pages/Submittals";
import SubmittalDetails from "@/pages/SubmittalDetails";
import Budget from "@/pages/Budget";
import Schedule from "@/pages/Schedule";
import BidPackages from "@/pages/BidPackages";
import BidPackageDetails from "@/pages/BidPackageDetails";
import BidComparison from "@/pages/BidComparison";
import BiddingPortal from "@/pages/BiddingPortal";
import Tasks from "@/pages/Tasks";
import NotFound from "@/pages/not-found";
import TermsPage from "@/pages/terms-page";
import PrivacyPage from "@/pages/privacy-page";
import AuthPage from "@/pages/auth-page";
import AICopilot from "@/pages/AICopilot";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold">Loading Session...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public Pages */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/bidding-portal/:token" component={BiddingPortal} />

      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/:rest*">
            {() => <Redirect to="/auth" />}
          </Route>
        </>
      ) : (
        <>
          <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
          <Route path="/dashboard" component={() => <Layout><Dashboard /></Layout>} />
          
          {/* Change Orders Module */}
          <Route path="/projects/:projectId/change-orders" component={() => <Layout><ChangeOrderLogs /></Layout>} />
          <Route path="/projects/:projectId/change-orders/:changeOrderId" component={() => <Layout><ChangeOrderLogs /></Layout>} />
          <Route path="/change-orders" component={() => <Layout><ChangeOrders /></Layout>} />
          <Route path="/change-orders/:id" component={() => <Layout><ChangeOrders /></Layout>} />
          <Route path="/rate-tables" component={() => <Layout><RateTables /></Layout>} />
          
          {/* Project Management Modules */}
          <Route path="/projects" component={() => <Layout><Projects /></Layout>} />
          <Route path="/projects/:id" component={() => <Layout><ProjectDetails /></Layout>} />
          <Route path="/projects/:projectId/ai-copilot" component={() => <Layout><AICopilot /></Layout>} />
          <Route path="/projects/:projectId/documents" component={() => <Layout><Documents /></Layout>} />
          <Route path="/projects/:projectId/rfis" component={() => <Layout><RFIs /></Layout>} />
          <Route path="/projects/:projectId/rfis/:id" component={() => <Layout><RFIDetails /></Layout>} />
          <Route path="/projects/:projectId/submittals" component={() => <Layout><Submittals /></Layout>} />
          <Route path="/projects/:projectId/submittals/:id" component={() => <Layout><SubmittalDetails /></Layout>} />
          <Route path="/projects/:projectId/budget" component={() => <Layout><Budget /></Layout>} />
          <Route path="/projects/:projectId/schedule" component={() => <Layout><Schedule /></Layout>} />
          <Route path="/projects/:projectId/bid-packages" component={() => <Layout><BidPackages /></Layout>} />
          <Route path="/projects/:projectId/bid-packages/:id" component={() => <Layout><BidPackageDetails /></Layout>} />
          <Route path="/projects/:projectId/bid-packages/:id/leveling" component={() => <Layout><BidComparison /></Layout>} />
          <Route path="/projects/:projectId/tasks" component={() => <Layout><Tasks /></Layout>} />
          
          {/* General Platform pages */}
          <Route path="/company" component={() => <Layout><Company /></Layout>} />
          <Route path="/settings" component={() => <Layout><Settings /></Layout>} />
          <Route path="/analytics" component={() => <Layout><Analytics /></Layout>} />
          
          {/* Fallback */}
          <Route path="/:rest*" component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ProjectProvider>
    </QueryClientProvider>
  );
}

export default App;
