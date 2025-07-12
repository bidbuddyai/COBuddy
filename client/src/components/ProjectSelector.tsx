import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Plus } from 'lucide-react';
import { Project } from '@shared/schema';

interface ProjectSelectorProps {
  selectedProjectId?: number;
  onProjectSelect: (projectId: number | undefined) => void;
}

export default function ProjectSelector({ selectedProjectId, onProjectSelect }: ProjectSelectorProps) {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first project to get started.
            </p>
            <Button className="mt-4 fieldflo-primary fieldflo-primary-hover">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5" />
          <span>Select Project</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Select
              value={selectedProjectId?.toString()}
              onValueChange={(value) => onProjectSelect(value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{project.name}</span>
                      <span className="text-xs text-gray-500">
                        ({project.clientName})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
        
        {selectedProjectId && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {projects.find(p => p.id === selectedProjectId)?.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {projects.find(p => p.id === selectedProjectId)?.clientName} • 
                  {projects.find(p => p.id === selectedProjectId)?.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  ${(projects.find(p => p.id === selectedProjectId)?.budget || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Budget</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}