import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CloudUpload, FileText, Image, Eye, CheckCircle, AlertCircle, Clock, Sparkles, Upload, FileUp, Star } from "lucide-react";
import { FileUploadResponse } from "@/types";
import { DocumentProcessingIndicator, PulsingDot } from "@/components/LoadingIndicators";
import { motion, AnimatePresence } from "framer-motion";
import { PlayfulLoadingAnimation } from "@/components/PlayfulLoadingAnimations";
import { useLocation } from "wouter";

interface FileUploadProps {
  onUploadComplete?: (files: FileUploadResponse[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  documentType?: string;
  projectId?: number;
}

export default function FileUpload({ 
  onUploadComplete, 
  acceptedTypes = ['application/pdf', 'image/*'],
  maxFiles = 10,
  documentType = 'tm_sheet',
  projectId
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [processingStages, setProcessingStages] = useState<Record<string, 'uploading' | 'analyzing' | 'extracting' | 'matching' | 'complete' | 'error'>>({});
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Set initial uploading state for all files
      files.forEach(file => {
        setProcessingStages(prev => ({ ...prev, [file.name]: 'uploading' }));
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
      });

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('type', documentType);
      if (projectId) {
        formData.append('projectId', projectId.toString());
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        files.forEach(file => {
          setUploadProgress(prev => {
            const current = prev[file.name] || 10;
            if (current < 90) {
              return { ...prev, [file.name]: current + 10 };
            }
            return prev;
          });
        });
      }, 500);

      try {
        const response = await apiRequest('POST', '/api/documents/upload', formData);
        clearInterval(progressInterval);

        // Update to analyzing stage
        files.forEach(file => {
          setProcessingStages(prev => ({ ...prev, [file.name]: 'analyzing' }));
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        });

        // Simulate AI processing stages
        setTimeout(() => {
          files.forEach(file => {
            setProcessingStages(prev => ({ ...prev, [file.name]: 'extracting' }));
          });
        }, 2000);

        setTimeout(() => {
          files.forEach(file => {
            setProcessingStages(prev => ({ ...prev, [file.name]: 'matching' }));
          });
        }, 4000);

        setTimeout(() => {
          files.forEach(file => {
            setProcessingStages(prev => ({ ...prev, [file.name]: 'complete' }));
          });
        }, 6000);

        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        files.forEach(file => {
          setProcessingStages(prev => ({ ...prev, [file.name]: 'error' }));
        });
        throw error;
      }
    },
    onSuccess: (data: FileUploadResponse[]) => {
      setUploadedFiles(prev => [...prev, ...data]);
      onUploadComplete?.(data);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/documents', { projectId }] });
      }
      toast({
        title: "Upload successful",
        description: `${data.length} file(s) uploaded and processing started`,
      });
      
      // Redirect to documents page with selected document IDs
      const documentIds = data.map(file => file.id).join(',');
      setLocation(`/documents?selected=${documentIds}`);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = acceptedFiles.filter(file => file.size > 25 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Maximum file size is 25MB. ${oversizedFiles.length} file(s) exceed this limit.`,
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(acceptedFiles);
  }, [maxFiles, toast, uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize: 25 * 1024 * 1024, // 25MB
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
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
        return <Clock className="h-4 w-4 text-blue-600" />;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CloudUpload className="h-5 w-5" />
          <span>Upload & Process Documents</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Drag and drop your T&M sheets, invoices, or reference PDFs
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`
            upload-area border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragActive 
              ? 'border-primary bg-primary/10 drag-over' 
              : 'border-gray-300 hover:border-primary hover:bg-primary/5'
            }
            ${uploadMutation.isPending ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 fieldflo-primary rounded-full flex items-center justify-center mx-auto mb-4 bg-opacity-10">
            <CloudUpload className="h-8 w-8 text-primary" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Drop files here or click to upload
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Supports PDF, PNG, JPG, HEIC. Max 25MB per file.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">T&M Sheets</Badge>
            <Badge variant="secondary">Invoices</Badge>
            <Badge variant="secondary">Rate Tables</Badge>
            <Badge variant="secondary">Photos</Badge>
          </div>
        </div>

        {/* Processing Indicators */}
        <AnimatePresence>
          {Object.keys(processingStages).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {Object.entries(processingStages).map(([fileName, stage]) => (
                <div key={fileName} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</span>
                    <Badge variant="outline" className="text-xs">
                      {stage}
                    </Badge>
                  </div>
                  <PlayfulLoadingAnimation
                    stage={stage}
                    message={`CO Buddy is processing ${fileName}...`}
                    size="sm"
                  />
                  {stage === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={uploadProgress[fileName] || 0} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Processing Queue</h4>
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                    {getFileIcon(file.mimeType || 'application/pdf')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {file.status === 'processed' ? 'Processing complete' : 
                       file.status === 'processing' ? 'Processing...' : 
                       file.status === 'failed' ? 'Processing failed' : 'Uploaded'}
                      {file.confidence && ` • ${Math.round(file.confidence * 100)}% confidence`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {file.status === 'processing' && (
                    <div className="loading-spinner w-4 h-4"></div>
                  )}
                  <Badge className={`status-badge ${getStatusColor(file.status)}`}>
                    {getStatusIcon(file.status)}
                    <span className="ml-1 capitalize">{file.status}</span>
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
