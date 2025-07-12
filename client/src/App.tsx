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
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/auth/callback" component={AuthCallback} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={() => <Layout><Dashboard /></Layout>} />
          <Route path="/upload" component={() => <Layout><Upload /></Layout>} />
          <Route path="/change-orders" component={() => <Layout><ChangeOrders /></Layout>} />
          <Route path="/rate-tables" component={() => <Layout><RateTables /></Layout>} />
          <Route path="/analytics" component={() => <Layout><Analytics /></Layout>} />
          <Route path="/projects" component={() => <Layout><Projects /></Layout>} />
          <Route path="/documents" component={() => <Layout><Documents /></Layout>} />
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
