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
    console.log('Fetching user data for:', userId);
    try {
      const response = await fetch(`/api/users/${userId}`);
      console.log('User fetch response:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User data found:', userData);
        setUser(userData);
      } else if (response.status === 404) {
        console.log('User not found in database, creating profile...');
        // User doesn't exist in our database yet (OAuth login)
        // Get the Supabase user data
        const { data: { user: supabaseUserData } } = await supabase.auth.getUser();
        console.log('Supabase user data:', supabaseUserData);
        
        if (supabaseUserData) {
          // Create user in our database
          const createPayload = {
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
          };
          
          console.log('Creating user with payload:', createPayload);
          
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload),
          });

          const responseText = await createResponse.text();
          console.log('Create user response:', createResponse.status, responseText);
          
          if (createResponse.ok) {
            const newUser = JSON.parse(responseText);
            console.log('User created successfully:', newUser);
            setUser(newUser);
          } else {
            console.error('Failed to create user:', responseText);
            toast({
              title: "Error",
              description: "Failed to create user profile",
              variant: "destructive",
            });
          }
        }
      } else {
        console.error('Unexpected response status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      console.log('Setting isLoading to false');
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
    // Get the correct redirect URL based on current environment
    let redirectUrl;
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Handle different environments
    if (hostname === 'localhost') {
      redirectUrl = `${window.location.origin}/auth/callback`;
    } else if (hostname.includes('replit.app')) {
      // Replit preview URLs
      redirectUrl = `https://${window.location.host}/auth/callback`;
    } else if (hostname.includes('cobuddy.app')) {
      // Production domain
      redirectUrl = `https://${window.location.host}/auth/callback`;
    } else {
      // Default to current origin for any other domain
      redirectUrl = `${protocol}//${window.location.host}/auth/callback`;
    }
    
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