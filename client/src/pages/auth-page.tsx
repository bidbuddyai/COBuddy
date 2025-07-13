import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";
import { FaLinkedin, FaMicrosoft } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const loginSchema = z.object({
  username: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedCompany, setDetectedCompany] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isLoading, signIn, signUp, signInWithProvider } = useSupabaseAuth();

  // Redirect if already logged in
  if (!isLoading && user) {
    navigate("/");
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  // Function to detect company from email domain
  const detectCompanyFromEmail = (email: string) => {
    if (!email || !email.includes('@')) {
      setDetectedCompany(null);
      return;
    }
    
    const domain = email.split('@')[1];
    if (domain && domain.includes('.')) {
      const parts = domain.split('.');
      // Skip common email providers
      const commonProviders = ['gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud', 'mail', 'proton', 'protonmail'];
      const domainName = parts[0].toLowerCase();
      
      if (!commonProviders.includes(domainName) && parts.length >= 2) {
        // Format company name from domain
        const companyName = domainName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setDetectedCompany(companyName);
      } else {
        setDetectedCompany(null);
      }
    } else {
      setDetectedCompany(null);
    }
  };

  // Watch email field for changes
  const watchedEmail = registerForm.watch('username');
  useEffect(() => {
    detectCompanyFromEmail(watchedEmail);
  }, [watchedEmail]);

  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await signIn(data.username, data.password);
      toast({
        title: "Success",
        description: "You have been logged in successfully",
      });
      // Give time for auth state to update
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await signUp(data.username, data.password, data.firstName, data.lastName);
      toast({
        title: "Success",
        description: "Your account has been created successfully!",
      });
      // Give time for auth state to update
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'azure' | 'linkedin_oidc') => {
    try {
      await signInWithProvider(provider);
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      
      let errorMessage = error.message;
      if (provider === 'azure' && error.message?.includes('tenant')) {
        errorMessage = "Azure authentication is not properly configured. Please contact your administrator to set up the Azure tenant URL in Supabase.";
      }
      
      toast({
        title: "Login failed",
        description: errorMessage || `Failed to sign in with ${provider === 'azure' ? 'Microsoft' : 'LinkedIn'}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Change Order Creator</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('azure')}
                    className="w-full"
                  >
                    <FaMicrosoft className="mr-2 h-4 w-4" />
                    Microsoft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('linkedin_oidc')}
                    className="w-full"
                  >
                    <FaLinkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name</Label>
                      <Input
                        id="register-firstname"
                        {...registerForm.register("firstName")}
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name</Label>
                      <Input
                        id="register-lastname"
                        {...registerForm.register("lastName")}
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@company.com"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                    {detectedCompany && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in-50 duration-300">
                        <Building2 className="h-4 w-4" />
                        <span>Joining as part of</span>
                        <Badge variant="secondary" className="font-normal">
                          {detectedCompany}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('azure')}
                    className="w-full"
                  >
                    <FaMicrosoft className="mr-2 h-4 w-4" />
                    Microsoft
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSocialLogin('linkedin_oidc')}
                    className="w-full"
                  >
                    <FaLinkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <h2 className="text-3xl font-bold text-primary">AI-Powered Change Order Creator</h2>
          <p className="text-muted-foreground">
            Transform your Time & Materials data into professional change orders with our advanced AI processing.
          </p>
          <div className="space-y-2 text-left">
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span> Automatic data extraction from PDFs
            </p>
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span> Smart rate matching
            </p>
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span> Professional Excel and PDF output
            </p>
            <p className="flex items-center gap-2">
              <span className="text-primary">✓</span> Company-specific rate management
            </p>
          </div>
          {activeTab === "register" && (
            <div className="mt-6 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">Special Access</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users with @resource-env.com email addresses get access to pre-loaded rates with 539 entries across all categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}