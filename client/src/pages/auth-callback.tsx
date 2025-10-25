import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState("Processing authentication...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle the callback from OAuth providers
    const handleCallback = async () => {
      try {
        console.log("Auth callback started");
        console.log("Current URL:", window.location.href);
        console.log("URL params:", window.location.search);
        console.log("Hash params:", window.location.hash);
        
        // Supabase may return data in the URL hash for implicit flow
        // or in query params for code flow
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error in params
        const errorDesc = queryParams.get('error_description') || hashParams.get('error_description');
        if (errorDesc) {
          console.error("OAuth error:", errorDesc);
          setError(errorDesc);
          setStatus("Authentication failed");
          setTimeout(() => navigate(`/auth`), 3000);
          return;
        }
        
        // For OAuth callbacks, Supabase automatically handles the exchange
        // We just need to wait for it to complete
        setStatus("Verifying credentials...");
        
        // Give Supabase auth client time to process the callback
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          setStatus("Authentication failed");
          setTimeout(() => navigate(`/auth`), 3000);
          return;
        }
        
        if (session) {
          console.log("Session established:", session.user?.email);
          setStatus("Success! Redirecting to dashboard...");
          
          // Give the auth provider a moment to sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Force a page reload to ensure auth state is properly synced
          window.location.href = "/";
        } else {
          console.log("No session found");
          setError("Unable to establish session. Please try logging in again.");
          setStatus("Session not established");
          setTimeout(() => navigate("/auth"), 3000);
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        setError("An unexpected error occurred");
        setStatus("Authentication failed");
        setTimeout(() => navigate("/auth"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            {error ? (
              <>
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">{status}</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-lg font-semibold">{status}</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}