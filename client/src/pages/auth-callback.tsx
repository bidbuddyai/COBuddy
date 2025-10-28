import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState("Processing authentication...");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[OAuth Callback] Started");
        console.log("[OAuth Callback] URL:", window.location.href);
        
        // Check for OAuth errors in URL
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');
        
        if (errorParam) {
          console.error("[OAuth Callback] Error in URL:", errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setStatus("Authentication failed");
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        // Supabase PKCE flow automatically exchanges the code when detectSessionInUrl is enabled
        // We just need to wait for it to complete and verify the session
        setStatus("Completing sign in...");
        
        // Small delay to let Supabase process the URL
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[OAuth Callback] Session error:", sessionError);
          setError(sessionError.message);
          setStatus("Failed to establish session");
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }
        
        if (!session) {
          console.error("[OAuth Callback] No session after callback");
          setError("No session was established. Please try logging in again.");
          setStatus("Authentication incomplete");
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }
        
        console.log("[OAuth Callback] Session established for:", session.user.email);
        setSuccess(true);
        setStatus("Success! Redirecting to dashboard...");
        
        // Navigate to dashboard using client-side routing
        setTimeout(() => {
          navigate("/");
        }, 1500);
        
      } catch (err: any) {
        console.error("[OAuth Callback] Unexpected error:", err);
        setError(err.message || "An unexpected error occurred");
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
          <div className="text-center space-y-4">
            {error ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <div>
                  <p className="text-lg font-semibold mb-2">{status}</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <p className="text-xs text-muted-foreground mt-2">Redirecting back to login...</p>
                </div>
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <p className="text-lg font-semibold">{status}</p>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-lg font-semibold">{status}</p>
                <p className="text-sm text-muted-foreground">Please wait...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
