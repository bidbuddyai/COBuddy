import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Key,
  FileText,
  Save,
  RefreshCw
} from "lucide-react";

export default function Settings() {
  const { user } = useSupabaseAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    role: user?.role || "field",
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    changeOrderUpdates: true,
    processingComplete: true,
    weeklyReports: false,
  });

  const [preferences, setPreferences] = useState({
    defaultDocumentType: "tm_sheet",
    autoProcessing: true,
    confidenceThreshold: 0.8,
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
  });

  const [integrations, setIntegrations] = useState({
    openaiApiKey: "",
    supabaseEnabled: true,
    backupEnabled: true,
    auditLogging: true,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/users/profile', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/test-connection');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection successful",
        description: "All integrations are working correctly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/export-data');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fieldflo-data-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profile);
  };

  const saveNotificationsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/users/settings/notifications', data);
      return response.json();
    }
  });
  
  const savePreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/users/settings/preferences', data);
      return response.json();
    }
  });
  
  const saveIntegrationsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/users/settings/integrations', data);
      return response.json();
    }
  });

  const handleSaveSettings = async () => {
    try {
      // Save all settings in parallel
      const promises = [
        saveNotificationsMutation.mutateAsync(notifications),
        savePreferencesMutation.mutateAsync(preferences),
        saveIntegrationsMutation.mutateAsync(integrations)
      ];
      
      await Promise.all(promises);
      
      toast({
        title: "Settings saved",
        description: "All your preferences have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and application preferences
          </p>
        </div>
        <Button 
          onClick={handleSaveSettings}
          className="fieldflo-primary fieldflo-primary-hover"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={profile.role} onValueChange={(value) => setProfile({ ...profile, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="pm">Project Manager</SelectItem>
                    <SelectItem value="field">Field Worker</SelectItem>
                    <SelectItem value="readonly">Read Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Account Status</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your account is active and verified
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">
                  Active
                </Badge>
              </div>

              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="fieldflo-primary fieldflo-primary-hover"
              >
                {updateProfileMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, pushNotifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Change Order Updates</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Notifications when change orders are approved or rejected
                    </p>
                  </div>
                  <Switch
                    checked={notifications.changeOrderUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, changeOrderUpdates: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Processing Complete</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Notifications when document processing is complete
                    </p>
                  </div>
                  <Switch
                    checked={notifications.processingComplete}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, processingComplete: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive weekly summary reports
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => 
                      setNotifications({ ...notifications, weeklyReports: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Application Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose your preferred theme
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Light</span>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                  <span className="text-sm">Dark</span>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Default Document Type</Label>
                <Select 
                  value={preferences.defaultDocumentType} 
                  onValueChange={(value) => setPreferences({ ...preferences, defaultDocumentType: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tm_sheet">T&M Sheet</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="rate_table">Rate Table</SelectItem>
                    <SelectItem value="supporting_doc">Supporting Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Processing</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically process uploaded documents
                  </p>
                </div>
                <Switch
                  checked={preferences.autoProcessing}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, autoProcessing: checked })
                  }
                />
              </div>

              <div>
                <Label>Confidence Threshold</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Minimum confidence level for automatic processing
                </p>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={preferences.confidenceThreshold}
                  onChange={(e) => setPreferences({ ...preferences, confidenceThreshold: parseFloat(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select 
                    value={preferences.currency} 
                    onValueChange={(value) => setPreferences({ ...preferences, currency: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Format</Label>
                  <Select 
                    value={preferences.dateFormat} 
                    onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Integrations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>OpenAI API Key</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Your OpenAI API key for document processing
                </p>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={integrations.openaiApiKey}
                  onChange={(e) => setIntegrations({ ...integrations, openaiApiKey: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Supabase Integration</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enable Supabase database integration
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={integrations.supabaseEnabled}
                    onCheckedChange={(checked) => 
                      setIntegrations({ ...integrations, supabaseEnabled: checked })
                    }
                  />
                  <Badge className="bg-green-100 text-green-700">
                    Connected
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Automated Backups</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enable automatic daily backups
                  </p>
                </div>
                <Switch
                  checked={integrations.backupEnabled}
                  onCheckedChange={(checked) => 
                    setIntegrations({ ...integrations, backupEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Audit Logging</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Log all system activities for compliance
                  </p>
                </div>
                <Switch
                  checked={integrations.auditLogging}
                  onCheckedChange={(checked) => 
                    setIntegrations({ ...integrations, auditLogging: checked })
                  }
                />
              </div>

              <Button 
                onClick={() => testConnectionMutation.mutate()}
                variant="outline"
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connections
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Change Password</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Update your account password
                </p>
                <div className="space-y-2">
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                </div>
                <Button className="mt-2">Update Password</Button>
              </div>

              <Separator />

              <div>
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Add an extra layer of security to your account
                </p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Not Configured</Badge>
                  <Button variant="outline" size="sm">
                    Setup 2FA
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Active Sessions</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Manage your active login sessions
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-gray-500">Chrome on Windows • Last active: Now</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Export Data</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Download a copy of all your data
                </p>
                <Button 
                  onClick={() => exportDataMutation.mutate()}
                  disabled={exportDataMutation.isPending}
                  variant="outline"
                >
                  {exportDataMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Export All Data
                </Button>
              </div>

              <Separator />

              <div>
                <Label>Data Retention</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Configure how long data is stored
                </p>
                <Select defaultValue="1year">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="5years">5 Years</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label>Storage Usage</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Current storage usage and limits
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Documents</span>
                    <span className="text-sm text-gray-600">2.4 GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <span className="text-sm text-gray-600">156 MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Backups</span>
                    <span className="text-sm text-gray-600">890 MB</span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-sm">Total</span>
                    <span className="text-sm">3.4 GB / 10 GB</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
