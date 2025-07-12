import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import FileUpload from "@/components/FileUpload";
import DocumentViewer from "@/components/DocumentViewer";
import { Upload as UploadIcon, FileText, Image, CheckCircle, AlertCircle, Clock, Eye, Trash2 } from "lucide-react";
import { Document } from "@shared/schema";
import { FileUploadResponse } from "@/types";

export default function Upload() {
  const [selectedType, setSelectedType] = useState("tm_sheet");
  const [processingFiles, setProcessingFiles] = useState<FileUploadResponse[]>([]);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const handleUploadComplete = (files: FileUploadResponse[]) => {
    setProcessingFiles(prev => [...prev, ...files]);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-600" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-600" />;
    }
    return <FileText className="h-5 w-5 text-gray-600" />;
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
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProcessingProgress = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 25;
      case 'processing':
        return 50;
      case 'processed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  const documentTypes = [
    { value: 'tm_sheet', label: 'T&M Sheet' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'rate_table', label: 'Rate Table' },
    { value: 'supporting_doc', label: 'Supporting Document' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Upload & Process</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload and process T&M sheets, invoices, and rate tables with AI
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <FileUpload
            documentType={selectedType}
            onUploadComplete={handleUploadComplete}
            acceptedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']}
            maxFiles={10}
          />

          {/* Processing Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Processing Queue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processingFiles.length > 0 ? (
                <div className="space-y-4">
                  {processingFiles.map((file) => (
                    <div key={file.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                            {getFileIcon(file.mimeType || 'application/pdf')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {file.originalName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {file.filename}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(file.status)}>
                            {getStatusIcon(file.status)}
                            <span className="ml-1 capitalize">{file.status}</span>
                          </Badge>
                          {file.confidence && (
                            <Badge variant="outline">
                              {Math.round(file.confidence * 100)}% confidence
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Processing Progress</span>
                          <span>{getProcessingProgress(file.status)}%</span>
                        </div>
                        <Progress value={getProcessingProgress(file.status)} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No files in processing queue
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Document Library */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Document Library</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {documents.slice(0, 10).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {doc.originalName}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(doc.status)}>
                          {getStatusIcon(doc.status)}
                        </Badge>
                        <DocumentViewer document={doc}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DocumentViewer>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No documents uploaded yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
