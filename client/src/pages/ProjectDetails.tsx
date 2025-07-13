import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building, 
  Calendar, 
  DollarSign, 
  FileText, 
  Mail, 
  Phone, 
  ArrowLeft, 
  Clock,
  Activity
} from 'lucide-react';
import type { Project, ChangeOrder, Document } from '@shared/schema';
import ChangeOrderTable from '@/components/ChangeOrderTable';
import DocumentViewer from '@/components/DocumentViewer';
import { PlayfulLoadingAnimation } from '@/components/PlayfulLoadingAnimations';

export default function ProjectDetails() {
  const { id } = useParams();
  const projectId = parseInt(id || '0');

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents?projectId=${projectId}`],
    enabled: !!projectId,
  });

  const { data: changeOrders, isLoading: changeOrdersLoading } = useQuery<{ data: ChangeOrder[]; total: number }>({
    queryKey: [`/api/change-orders?projectId=${projectId}`],
    enabled: !!projectId,
  });

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <PlayfulLoadingAnimation 
            stage="processing" 
            message="Loading project details..."
            size="lg"
          />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Project not found
          </h3>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {project.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Project #{project.number}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(project.status)}>
          {project.status}
        </Badge>
      </div>

      {/* Project Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
              <p className="mt-1">{project.description || 'No description provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</p>
              <p className="mt-1">{project.clientName}</p>
            </div>
            {project.clientContact && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Client Contact</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${project.clientContact}`} className="text-blue-600 hover:underline">
                    {project.clientContact}
                  </a>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</p>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <p className="text-lg font-semibold">
                  {project.budget ? `$${project.budget.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <p>{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <p>{new Date(project.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Change Orders and Documents */}
      <Tabs defaultValue="change-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="change-orders">
            <FileText className="h-4 w-4 mr-2" />
            Change Orders ({changeOrders?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents ({documents?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Activity className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="change-orders" className="space-y-4">
          {changeOrdersLoading ? (
            <div className="flex items-center justify-center h-64">
              <PlayfulLoadingAnimation 
                stage="processing" 
                message="Loading change orders..."
                size="md"
              />
            </div>
          ) : (
            <ChangeOrderTable projectId={projectId} />
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documentsLoading ? (
            <div className="flex items-center justify-center h-64">
              <PlayfulLoadingAnimation 
                stage="processing" 
                message="Loading documents..."
                size="md"
              />
            </div>
          ) : documents?.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No documents yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Upload documents to get started
                  </p>
                  <Link href="/upload">
                    <Button>Upload Documents</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents?.map((doc) => (
                <DocumentViewer key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Project Analytics
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  View detailed analytics for this project
                </p>
                <Link href={`/analytics?project=${projectId}`}>
                  <Button>View Analytics</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}