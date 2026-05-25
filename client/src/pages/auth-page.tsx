import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, ShieldCheck, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProjectBuddyIcon from "@/assets/projectbuddy_icon.png";
import ThemeToggle from "@/components/ThemeToggle";

const loginSchema = z.object({
  username: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  setupToken: z.string().optional(),
});

const registerSchema = z.object({
  username: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
  const { user, isLoading, login, register } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      setupToken: "",
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
      await login({
        username: data.username,
        password: data.password,
        setupToken: data.setupToken || undefined,
      });
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
      await register({
        email: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      toast({
        title: "Success",
        description: "Your account has been created successfully!",
      });
      // Give time for auth state to update
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground relative">
      {/* Absolute theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-8">
        <Card className="w-full max-w-md border-border bg-white dark:bg-card shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <img 
                src={ProjectBuddyIcon} 
                alt="ProjectBuddy" 
                className="w-14 h-14 rounded-xl object-cover shadow-sm border border-border"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-foreground">ProjectBuddy</CardTitle>
            <CardDescription className="text-center text-muted-foreground font-medium">
              Sign in to manage projects, budgets, RFIs, and bids.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 bg-muted border border-border mb-6">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-muted-foreground"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 text-muted-foreground"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground font-semibold">Email Address</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@resource-env.com"
                      className="bg-white dark:bg-slate-950 border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground font-semibold">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      className="bg-white dark:bg-slate-950 border-input text-foreground focus-visible:ring-primary"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  
                  {/* Optional Setup Token field to claim uninitialized seeded account securely */}
                  <div className="space-y-2 pt-3 border-t border-border mt-3">
                    <Label htmlFor="login-setup-token" className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-xs font-semibold">
                      <Key className="h-3 w-3" />
                      Setup Token <span className="text-[10px] text-muted-foreground font-normal">(Required only for passwordless claim)</span>
                    </Label>
                    <Input
                      id="login-setup-token"
                      type="password"
                      placeholder="e.g. pc_setup_token_..."
                      className="bg-white dark:bg-slate-950 border-input text-foreground placeholder:text-muted-foreground/40 text-xs focus-visible:ring-amber-500 focus-visible:border-amber-500"
                      {...loginForm.register("setupToken")}
                    />
                    {loginForm.formState.errors.setupToken && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.setupToken.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors mt-6" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying Session...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname" className="text-foreground font-semibold">First Name</Label>
                      <Input
                        id="register-firstname"
                        placeholder="Chase"
                        className="bg-white dark:bg-slate-950 border-input text-foreground focus-visible:ring-primary"
                        {...registerForm.register("firstName")}
                      />
                      {registerForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname" className="text-foreground font-semibold">Last Name</Label>
                      <Input
                        id="register-lastname"
                        placeholder="GC"
                        className="bg-white dark:bg-slate-950 border-input text-foreground focus-visible:ring-primary"
                        {...registerForm.register("lastName")}
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">{registerForm.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-foreground font-semibold">Email Address</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="chase@resource-env.com"
                      className="bg-white dark:bg-slate-950 border-input text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                    {detectedCompany && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-50 duration-300 pt-1">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                        <span>Company identified:</span>
                        <Badge variant="outline" className="text-emerald-700 border-emerald-500/35 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/35 dark:bg-emerald-950/20 font-normal">
                          {detectedCompany}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-foreground font-semibold">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      className="bg-white dark:bg-slate-950 border-input text-foreground focus-visible:ring-primary"
                      {...registerForm.register("password")}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors mt-6" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="hidden lg:flex flex-1 bg-slate-50 dark:bg-card/40 items-center justify-center p-8 border-l border-border">
        <div className="max-w-md space-y-6 text-center">
          <img 
            src={ProjectBuddyIcon} 
            alt="ProjectBuddy" 
            className="w-20 h-20 rounded-2xl mx-auto mb-4 border border-border shadow-sm"
          />
          <h2 className="text-3xl font-black text-foreground">ProjectBuddy</h2>
          <p className="text-muted-foreground leading-relaxed font-medium">
            A secure, multi-tenant digital hub for construction management. Fully integrated RFIs, submittals, budgets, schedule imports, and subcontractor bidding packages.
          </p>
          <div className="space-y-3.5 text-left bg-white dark:bg-card p-5 rounded-xl border border-border max-w-sm mx-auto text-sm text-foreground shadow-sm">
            <p className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              <span>Hashed password storage</span>
            </p>
            <p className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              <span>HttpOnly & SameSite secure cookies</span>
            </p>
            <p className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              <span>GC / subcontractor tenant isolation</span>
            </p>
            <p className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              <span>Role-based permission boundaries</span>
            </p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg max-w-sm mx-auto">
            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Enterprise Domain Access
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">
              Users registering with @resource-env.com get administrative and PM access to loaded rate sheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
