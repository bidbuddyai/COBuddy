import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, Download, Eye, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock, Brain, Edit, Rocket, Upload } from 'lucide-react';
import { Document } from '@shared/schema';
import { DocumentGridSkeleton, PulsingDot, AIThinkingIndicator } from '@/components/LoadingIndicators';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '@/components/FileUpload';
import ProjectSelector from '@/components/ProjectSelector';
import DocumentEditor from '@/components/DocumentEditor';
import { useDocumentProgress } from '@/hooks/useWebSocket';

export default function Documents() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState('all');
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const documentProgress = useDocumentProgress();

  const { data: documents, isLoading, isRefetching } = useQuery<Document[]>({
    queryKey: ['/api/documents', { projectId: selectedProjectId }],
    enabled: !!selectedProjectId,
  });

  const reprocessMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest('POST', `/api/documents/${documentId}/reprocess`);
    },
    onSuccess: () => {
      toast({
        title: "Document Reprocessing",
        description: "Document has been queued for reprocessing.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reprocess document",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest('DELETE', `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });
  
  const bulkProcessMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const responses = await Promise.all(
        documentIds.map(id => apiRequest('POST', `/api/documents/${id}/reprocess`))
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: 'Bulk processing started',
        description: `${selectedDocuments.size} documents queued for processing.`,
      });
      setSelectedDocuments(new Set());
      setIsBulkProcessing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to process documents',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const bulkDeleteMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const responses = await Promise.all(
        documentIds.map(id => apiRequest('DELETE', `/api/documents/${id}`))
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: 'Documents deleted',
        description: `${selectedDocuments.size} documents deleted successfully.`,
      });
      setSelectedDocuments(new Set());
      setIsBulkProcessing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete documents',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredDocuments = documents?.filter(doc => {
    if (activeTab === 'all') return true;
    if (activeTab === 'processed') return doc.status === 'processed';
    if (activeTab === 'processing') return doc.status === 'processing';
    if (activeTab === 'failed') return doc.status === 'failed';
    return true;
  });
  
  const handleSelectDocument = (documentId: number) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments?.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments?.map(doc => doc.id)));
    }
  };
  
  const handleBulkProcess = () => {
    const ids = Array.from(selectedDocuments);
    bulkProcessMutation.mutate(ids);
  };
  
  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedDocuments.size} documents?`)) {
      const ids = Array.from(selectedDocuments);
      bulkDeleteMutation.mutate(ids);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload and manage your construction documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRefetching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-gray-500"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              Refreshing...
            </motion.div>
          )}
        </div>
      </div>

      {/* Project Selector */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectSelect={setSelectedProjectId}
      />

      {selectedProjectId && (
        <>
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload New Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload projectId={selectedProjectId} />
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="all">
                    All Documents
                    {documents && documents.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {documents.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="processed">
                    Processed
                    {documents && documents.filter(d => d.status === 'processed').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {documents.filter(d => d.status === 'processed').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="processing">
                    Processing
                    {documents && documents.filter(d => d.status === 'processing').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        <PulsingDot color="bg-blue-500" />
                        <span className="ml-1">
                          {documents.filter(d => d.status === 'processing').length}
                        </span>
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="failed">
                    Failed
                    {documents && documents.filter(d => d.status === 'failed').length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {documents.filter(d => d.status === 'failed').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                {/* Bulk Actions Bar */}
                {selectedDocuments.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.size === filteredDocuments?.length && filteredDocuments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">
                        {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkProcess}
                        disabled={bulkProcessMutation.isPending}
                        className="inline-flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${bulkProcessMutation.isPending ? 'animate-spin' : ''}`} />
                        Reprocess Selected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleteMutation.isPending}
                        className="text-red-600 hover:text-red-700 inline-flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Selected
                      </Button>
                    </div>
                  </motion.div>
                )}

                <TabsContent value={activeTab}>
                  {isLoading ? (
                    <DocumentGridSkeleton />
                  ) : filteredDocuments && filteredDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence mode="popLayout">
                        {filteredDocuments.map((document, index) => (
                          <motion.div
                            key={document.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                            className="group"
                          >
                            <Card className="hover:shadow-lg transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedDocuments.has(document.id)}
                                      onChange={() => handleSelectDocument(document.id)}
                                      className="rounded mt-2"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                      <FileText className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {document.originalName}
                                      </h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(document.uploadedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2 mb-3">
                                  <div className="flex items-center justify-between">
                                    <Badge className={`${getStatusColor(document.status)}`}>
                                      {getStatusIcon(document.status)}
                                      <span className="ml-1 capitalize">{document.status}</span>
                                    </Badge>
                                    {document.status === 'processing' && <AIThinkingIndicator />}
                                  </div>
                                  
                                  {/* Real-time progress display */}
                                  {documentProgress[document.id] && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -10 }}
                                      className="space-y-2"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600 dark:text-gray-400">
                                          {documentProgress[document.id].message}
                                        </span>
                                        <span className="font-medium">
                                          {documentProgress[document.id].progress}%
                                        </span>
                                      </div>
                                      <Progress value={documentProgress[document.id].progress} className="h-2" />
                                    </motion.div>
                                  )}
                                  
                                  {document.confidence && (
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500">Confidence:</span>
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <motion.div 
                                          className={`h-2 rounded-full ${
                                            document.confidence > 0.8 ? 'bg-green-500' :
                                            document.confidence > 0.6 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                          }`}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${document.confidence * 100}%` }}
                                          transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium">
                                        {Math.round(document.confidence * 100)}%
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    disabled={document.status === 'processing'}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  {document.status === 'processed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingDocument(document)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {document.status === 'failed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reprocessMutation.mutate(document.id)}
                                      disabled={reprocessMutation.isPending}
                                    >
                                      <RefreshCw className={`h-3 w-3 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate(document.id)}
                                    disabled={deleteMutation.isPending || document.status === 'processing'}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-16"
                    >
                      <div className="mx-auto max-w-md space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                          <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">
                          {activeTab === 'all' 
                            ? 'No documents uploaded yet' 
                            : `No ${activeTab} documents`}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {activeTab === 'all'
                            ? 'Start by uploading T&M sheets, rate tables, quotes, or invoices to process them with AI.'
                            : `You don't have any documents with ${activeTab} status.`}
                        </p>
                        {activeTab === 'all' && (
                          <div className="pt-4">
                            <Button
                              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                              className="inline-flex items-center gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Upload Your First Document
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
      
      {/* Document Editor Modal */}
      {editingDocument && (
        <DocumentEditor
          document={editingDocument}
          isOpen={!!editingDocument}
          onClose={() => setEditingDocument(null)}
        />
      )}
    </div>
  );
}