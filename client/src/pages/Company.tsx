import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  Users, 
  Mail, 
  UserPlus, 
  Shield, 
  Copy,
  Trash2,
  Edit,
  Save,
  X
} from "lucide-react";
import type { User, Company } from "@shared/schema";
import { PlayfulLoadingAnimation } from "@/components/PlayfulLoadingAnimations";

export default function Company() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("field");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ['/api/companies/current'],
    enabled: !!user?.companyId,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/companies/users'],
    enabled: !!user?.companyId,
  });

  const { data: invitations } = useQuery({
    queryKey: ['/api/companies/invitations'],
    enabled: !!user?.companyId && user?.role === 'admin',
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('PUT', '/api/companies/current', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      toast({
        title: "Company updated",
        description: "Company information has been updated successfully.",
      });
      setEditingCompany(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await apiRequest('POST', '/api/companies/invite', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/invitations'] });
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
      setInviteRole("field");
      setShowInviteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Invitation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest('PUT', `/api/companies/users/${userId}/role`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/users'] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('DELETE', `/api/companies/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/users'] });
      toast({
        title: "User removed",
        description: "User has been removed from the company.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Remove failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await apiRequest('DELETE', `/api/companies/invitations/${invitationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/invitations'] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancel failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveCompany = () => {
    if (companyName.trim()) {
      updateCompanyMutation.mutate({ name: companyName });
    }
  };

  const handleInviteUser = () => {
    if (inviteEmail.trim()) {
      inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'pm':
        return 'bg-blue-100 text-blue-700';
      case 'field':
        return 'bg-green-100 text-green-700';
      case 'readonly':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (companyLoading || usersLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Company Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your company information and team members
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <PlayfulLoadingAnimation 
            stage="analyzing" 
            message="CO Buddy is loading your company data..."
            size="lg"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Company Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your company information and team members
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Company Info</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Company Information</span>
                </div>
                {user?.role === 'admin' && !editingCompany && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCompanyName(company?.name || "");
                      setEditingCompany(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingCompany ? (
                <>
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSaveCompany}
                      disabled={updateCompanyMutation.isPending}
                      className="fieldflo-primary fieldflo-primary-hover"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingCompany(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Company Name</Label>
                    <p className="text-lg font-medium">{company?.name}</p>
                  </div>
                  <div>
                    <Label>Domain</Label>
                    <p className="text-lg font-medium">{company?.domain}</p>
                  </div>
                  <div>
                    <Label>Total Team Members</Label>
                    <p className="text-lg font-medium">{users?.length || 0}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className="bg-green-100 text-green-700">
                      Active
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Members</span>
                </div>
                {user?.role === 'admin' && (
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button className="fieldflo-primary fieldflo-primary-hover">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="inviteEmail">Email Address</Label>
                          <Input
                            id="inviteEmail"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inviteRole">Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
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
                        <Button
                          onClick={handleInviteUser}
                          disabled={inviteUserMutation.isPending}
                          className="w-full fieldflo-primary fieldflo-primary-hover"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {user?.role === 'admin' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        {user?.role === 'admin' && member.id !== user.id ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => updateUserRoleMutation.mutate({ userId: member.id, role: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="pm">Project Manager</SelectItem>
                              <SelectItem value="field">Field Worker</SelectItem>
                              <SelectItem value="readonly">Read Only</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell>
                          {member.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove ${member.firstName} ${member.lastName} from the company?`)) {
                                  removeUserMutation.mutate(member.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="invitations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Pending Invitations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitations && invitations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Invited</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation: any) => (
                        <TableRow key={invitation.id}>
                          <TableCell>{invitation.email}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(invitation.role)}>
                              {invitation.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(invitation.inviteLink);
                                  toast({
                                    title: "Link copied",
                                    description: "Invitation link copied to clipboard",
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-gray-500 py-8">No pending invitations</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}