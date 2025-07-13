import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Building, Calendar, DollarSign, FileText, Settings, Eye } from 'lucide-react';
import { Link } from 'wouter';
import type { Project } from '@shared/schema';
import { PlayfulLoadingAnimation } from '@/components/PlayfulLoadingAnimations';

export default function Projects() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientName: '',
    clientContact: '',
    status: 'active' as const,
    budget: '',
    markupLabor: '20',
    markupMaterials: '20',
    markupEquipmentOwned: '20',
    markupEquipmentRented: '20',
    markupDisposal: '15',
    markupImport: '15',
    markupSubcontractors: '5'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const createProject = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/projects', {
        ...data,
        budget: data.budget ? parseFloat(data.budget) : null,
        markupLabor: parseFloat(data.markupLabor),
        markupMaterials: parseFloat(data.markupMaterials),
        markupEquipmentOwned: parseFloat(data.markupEquipmentOwned),
        markupEquipmentRented: parseFloat(data.markupEquipmentRented),
        markupDisposal: parseFloat(data.markupDisposal),
        markupImport: parseFloat(data.markupImport),
        markupSubcontractors: parseFloat(data.markupSubcontractors)
      });
    },
    onSuccess: () => {
      toast({
        title: "Project Created",
        description: "New project has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        clientName: '',
        clientContact: '',
        status: 'active',
        budget: '',
        markupLabor: '20',
        markupMaterials: '20',
        markupEquipmentOwned: '20',
        markupEquipmentRented: '20',
        markupDisposal: '15',
        markupImport: '15',
        markupSubcontractors: '5'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your construction projects and track progress
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <PlayfulLoadingAnimation 
            stage="extracting" 
            message="CO Buddy is organizing your projects..."
            size="lg"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your construction projects and track progress
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Downtown Office Complex"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="e.g., ABC Construction Corp"
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientContact">Client Contact</Label>
                <Input
                  id="clientContact"
                  value={formData.clientContact}
                  onChange={(e) => setFormData({ ...formData, clientContact: e.target.value })}
                  placeholder="e.g., john.doe@abccorp.com"
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g., 500000"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Markup Percentages Section */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Markup Percentages</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Set default markup percentages for this project. These will be applied when creating change orders.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="markupLabor" className="text-xs">Labor Markup (%)</Label>
                    <Input
                      id="markupLabor"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupLabor}
                      onChange={(e) => setFormData({ ...formData, markupLabor: e.target.value })}
                      placeholder="20"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="markupMaterials" className="text-xs">Materials Markup (%)</Label>
                    <Input
                      id="markupMaterials"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupMaterials}
                      onChange={(e) => setFormData({ ...formData, markupMaterials: e.target.value })}
                      placeholder="20"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="markupEquipmentOwned" className="text-xs">Equipment (Owned) (%)</Label>
                    <Input
                      id="markupEquipmentOwned"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupEquipmentOwned}
                      onChange={(e) => setFormData({ ...formData, markupEquipmentOwned: e.target.value })}
                      placeholder="20"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="markupEquipmentRented" className="text-xs">Equipment (Rented) (%)</Label>
                    <Input
                      id="markupEquipmentRented"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupEquipmentRented}
                      onChange={(e) => setFormData({ ...formData, markupEquipmentRented: e.target.value })}
                      placeholder="20"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="markupDisposal" className="text-xs">Disposal Markup (%)</Label>
                    <Input
                      id="markupDisposal"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupDisposal}
                      onChange={(e) => setFormData({ ...formData, markupDisposal: e.target.value })}
                      placeholder="15"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="markupImport" className="text-xs">Import Duty Markup (%)</Label>
                    <Input
                      id="markupImport"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupImport}
                      onChange={(e) => setFormData({ ...formData, markupImport: e.target.value })}
                      placeholder="15"
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="markupSubcontractors" className="text-xs">Subcontractors Markup (%)</Label>
                    <Input
                      id="markupSubcontractors"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.markupSubcontractors}
                      onChange={(e) => setFormData({ ...formData, markupSubcontractors: e.target.value })}
                      placeholder="5"
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                </div>
                <Badge className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {project.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Client:</span>
                  <span className="text-gray-600">{project.clientName}</span>
                </div>
                {project.budget && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Budget:</span>
                    <span className="text-gray-600">${project.budget.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Created:</span>
                  <span className="text-gray-600">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Link href={`/projects/${project.id}`}>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
                <Link href={`/analytics?project=${project.id}`}>
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {projects?.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by creating your first project
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  );
}