import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Receipt, FileCheck, Files } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import FileUpload from '@/components/FileUpload';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Document {
  id: number;
  filename: string;
  originalName: string;
  type: string;
  status: string;
  confidence?: string;
  extractedData?: any;
  uploadedAt: string;
  processedAt?: string;
  projectId?: number;
}

export default function DocumentsPage() {
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const getDocumentsByType = (type: string) => {
    if (!documents) return [];
    if (type === 'all') return documents;
    return documents.filter(doc => doc.type === type);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'tm_sheet':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'invoice':
        return <Receipt className="h-5 w-5 text-green-600" />;
      case 'quote':
        return <FileCheck className="h-5 w-5 text-purple-600" />;
      default:
        return <Files className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      processed: 'default',
      processing: 'secondary',
      failed: 'destructive',
      uploaded: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tm_sheet: 'T&M Sheet',
      invoice: 'Invoice',
      quote: 'Quote',
      rate_table: 'Rate Table',
      supporting_doc: 'Supporting Document'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Upload and manage T&M sheets, quotes, invoices, and other project documents
        </p>
      </div>

      {/* File Upload */}
      <FileUpload />

      {/* Document Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">
                <Files className="h-4 w-4 mr-2" />
                All Documents
              </TabsTrigger>
              <TabsTrigger value="tm_sheet">
                <FileText className="h-4 w-4 mr-2" />
                T&M Sheets
              </TabsTrigger>
              <TabsTrigger value="quote">
                <FileCheck className="h-4 w-4 mr-2" />
                Quotes
              </TabsTrigger>
              <TabsTrigger value="invoice">
                <Receipt className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="rate_table">
                <FileText className="h-4 w-4 mr-2" />
                Rate Tables
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="mt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {getDocumentsByType(selectedType).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No {selectedType === 'all' ? 'documents' : getDocumentTypeLabel(selectedType).toLowerCase() + 's'} found.
                    </div>
                  ) : (
                    getDocumentsByType(selectedType).map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getDocumentIcon(document.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{document.originalName}</h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {getDocumentTypeLabel(document.type)}
                              </span>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(document.uploadedAt), 'MMM d, yyyy')}
                              </span>
                              {document.confidence && (
                                <>
                                  <span className="text-sm text-muted-foreground">•</span>
                                  <span className="text-sm text-muted-foreground">
                                    {Math.round(parseFloat(document.confidence) * 100)}% confidence
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(document.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // View extracted data or download file
                              if (document.extractedData) {
                                console.log('Extracted data:', document.extractedData);
                              }
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}