import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    // Handle the callback from OAuth providers
    const handleCallback = async () => {
      try {
        console.log("Auth callback started");
        console.log("Current URL:", window.location.href);
        
        // Use Supabase's built-in method to handle the OAuth callback
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error("Error exchanging code for session:", error);
          setStatus("Authentication failed");
          setTimeout(() => navigate(`/auth?error=${error.message}`), 2000);
          return;
        }

        console.log("Code exchanged successfully:", data);
        
        // Double-check we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error verifying session:", sessionError);
          setStatus("Session verification failed");
          setTimeout(() => navigate("/auth?error=session_failed"), 2000);
          return;
        }

        if (session) {
          console.log("Session verified successfully:", session.user?.email);
          setStatus("Success! Redirecting...");
          
          // Give the auth provider a moment to sync
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Force a page reload to ensure auth state is properly synced
          window.location.href = "/";
        } else {
          console.log("No session found after exchange");
          setStatus("No session established");
          setTimeout(() => navigate("/auth?error=no_session"), 2000);
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        setStatus("An unexpected error occurred");
        setTimeout(() => navigate("/auth?error=unexpected"), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}