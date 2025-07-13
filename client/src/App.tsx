import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSupabaseAuth, AuthProvider } from "@/hooks/useSupabaseAuth";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import ChangeOrders from "@/pages/ChangeOrders";
import RateTables from "@/pages/RateTables";
import Analytics from "@/pages/Analytics";
import Projects from "@/pages/Projects";
import Documents from "@/pages/Documents";
import Settings from "@/pages/Settings";
import AIAssistant from "@/pages/AIAssistant";
import Company from "@/pages/Company";
import AuthPage from "@/pages/auth-page";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";
import TermsPage from "@/pages/terms-page";
import PrivacyPage from "@/pages/privacy-page";
import LogoViewer from "@/pages/logo-viewer";

function Router() {
  const { user, isLoading } = useSupabaseAuth();
  const isAuthenticated = !!user;

  return (
    <Switch>
      {/* Auth callback route should always be available */}
      <Route path="/auth/callback" component={AuthCallback} />
      
      {isLoading ? (
        // Show a loading screen while checking auth status
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#03512A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
        </>
      ) : (
        <>
          <Route path="/" component={() => <Layout><Dashboard /></Layout>} />
          <Route path="/dashboard" component={() => <Layout><Dashboard /></Layout>} />
          <Route path="/upload" component={() => <Layout><Upload /></Layout>} />
          <Route path="/change-orders" component={() => <Layout><ChangeOrders /></Layout>} />
          <Route path="/rate-tables" component={() => <Layout><RateTables /></Layout>} />
          <Route path="/analytics" component={() => <Layout><Analytics /></Layout>} />
          <Route path="/projects" component={() => <Layout><Projects /></Layout>} />
          <Route path="/documents" component={() => <Layout><Documents /></Layout>} />
          <Route path="/ai-assistant" component={() => <Layout><AIAssistant /></Layout>} />
          <Route path="/company" component={() => <Layout><Company /></Layout>} />
          <Route path="/settings" component={() => <Layout><Settings /></Layout>} />
        </>
      )}
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/logo" component={LogoViewer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
