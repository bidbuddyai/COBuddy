import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Handle the callback from OAuth providers
    const handleCallback = async () => {
      try {
        // First, exchange the code for a session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // OAuth providers may return data in hash or search params
        const access_token = hashParams.get('access_token') || searchParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const error_description = searchParams.get('error_description');
        
        if (error) {
          console.error("OAuth error:", error, error_description);
          navigate(`/auth?error=${error}`);
          return;
        }

        // If we have tokens in the URL, Supabase should handle them automatically
        if (access_token || code) {
          // Give Supabase a moment to process the tokens
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Now check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          navigate("/auth?error=session_failed");
          return;
        }

        if (session) {
          console.log("Session established, redirecting to home");
          // Session established successfully
          navigate("/");
        } else {
          console.log("No session found after callback");
          // No session found
          navigate("/auth?error=no_session");
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        navigate("/auth?error=unexpected");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}