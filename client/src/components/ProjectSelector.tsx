import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building, MapPin, Calendar, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: number;
  name: string;
  description: string;
  clientName: string;
  clientEmail: string;
  projectManager: string;
  pmEmail: string;
  location: string;
  budget: number;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectorProps {
  selectedProjectId?: number;
  onProjectSelect: (projectId: number) => void;
  showCreateButton?: boolean;
}

export default function ProjectSelector({ 
  selectedProjectId, 
  onProjectSelect, 
  showCreateButton = true 
}: ProjectSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onProjectSelect(newProject.id);
      setIsCreateDialogOpen(false);
      reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createProjectMutation.mutate({
      ...data,
      budget: parseFloat(data.budget) || 0,
    });
  };

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="project-select">Select Project</Label>
          <Select 
            value={selectedProjectId?.toString() || ""} 
            onValueChange={(value) => onProjectSelect(parseInt(value))}
          >
            <SelectTrigger id="project-select">
              <SelectValue placeholder="Choose a project..." />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{project.name}</span>
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showCreateButton && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      {...register("name", { required: "Project name is required" })}
                      placeholder="Enter project name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      {...register("location", { required: "Location is required" })}
                      placeholder="Project location"
                    />
                    {errors.location && (
                      <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Brief project description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      {...register("clientName", { required: "Client name is required" })}
                      placeholder="Client company name"
                    />
                    {errors.clientName && (
                      <p className="text-sm text-red-500 mt-1">{errors.clientName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="clientEmail">Client Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      {...register("clientEmail", { 
                        required: "Client email is required",
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: "Invalid email format"
                        }
                      })}
                      placeholder="client@company.com"
                    />
                    {errors.clientEmail && (
                      <p className="text-sm text-red-500 mt-1">{errors.clientEmail.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectManager">Project Manager</Label>
                    <Input
                      id="projectManager"
                      {...register("projectManager", { required: "Project manager is required" })}
                      placeholder="PM name"
                    />
                    {errors.projectManager && (
                      <p className="text-sm text-red-500 mt-1">{errors.projectManager.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pmEmail">PM Email</Label>
                    <Input
                      id="pmEmail"
                      type="email"
                      {...register("pmEmail", { 
                        required: "PM email is required",
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: "Invalid email format"
                        }
                      })}
                      placeholder="pm@company.com"
                    />
                    {errors.pmEmail && (
                      <p className="text-sm text-red-500 mt-1">{errors.pmEmail.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="budget">Budget (Optional)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    {...register("budget")}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedProject.name}
              <Badge className={getStatusColor(selectedProject.status)}>
                {selectedProject.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{selectedProject.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span>${selectedProject.budget?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{new Date(selectedProject.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-500">PM: </span>
                <span>{selectedProject.projectManager}</span>
              </div>
            </div>
            {selectedProject.description && (
              <p className="mt-2 text-gray-600">{selectedProject.description}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}