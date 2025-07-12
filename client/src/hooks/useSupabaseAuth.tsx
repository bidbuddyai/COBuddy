import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signInWithProvider: (provider: 'azure' | 'linkedin_oidc') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 404) {
        // User doesn't exist in our database yet (OAuth login)
        // Get the Supabase user data
        const { data: { user: supabaseUserData } } = await supabase.auth.getUser();
        
        if (supabaseUserData) {
          // Create user in our database
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: supabaseUserData.id,
              email: supabaseUserData.email,
              firstName: supabaseUserData.user_metadata?.first_name || 
                        supabaseUserData.user_metadata?.given_name ||
                        supabaseUserData.user_metadata?.name?.split(' ')[0] ||
                        '',
              lastName: supabaseUserData.user_metadata?.last_name || 
                       supabaseUserData.user_metadata?.family_name ||
                       supabaseUserData.user_metadata?.name?.split(' ').slice(1).join(' ') ||
                       '',
            }),
          });

          if (createResponse.ok) {
            const newUser = await createResponse.json();
            setUser(newUser);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      // Create user in our database
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.user.id,
          email,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user profile');
      }
    }
  };

  const signInWithProvider = async (provider: 'azure' | 'linkedin_oidc') => {
    // Get the correct redirect URL - use the current host, not localhost
    const redirectUrl = window.location.hostname === 'localhost' 
      ? `${window.location.origin}/auth/callback`
      : `https://${window.location.host}/auth/callback`;
    
    console.log('OAuth redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        scopes: provider === 'azure' ? 'email openid profile' : 'email profile openid',
        queryParams: provider === 'azure' ? {
          prompt: 'select_account',
          // Azure requires tenant configuration
          // 'common' allows users from any Azure AD tenant and personal Microsoft accounts
          domain_hint: 'common',
        } : undefined,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      supabaseUser,
      user,
      isLoading,
      signIn,
      signUp,
      signInWithProvider,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within an AuthProvider');
  }
  return context;
}