import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, Edit, Download, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Document } from "@shared/schema";
import { ExtractedData } from "@/types";

interface DocumentViewerProps {
  document: Document;
  children?: React.ReactNode;
}

export default function DocumentViewer({ document, children }: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const extractedData = document.extractedData as ExtractedData;
  const confidence = parseFloat(document.confidence || '0');

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Document Preview</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(90vh-120px)]">
          {/* Original Document */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Original Document
              </h4>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(document.status)}>
                  {getStatusIcon(document.status)}
                  <span className="ml-1 capitalize">{document.status}</span>
                </Badge>
                {confidence > 0 && (
                  <Badge variant="outline">
                    {Math.round(confidence * 100)}% confidence
                  </Badge>
                )}
              </div>
            </div>
            
            <Card className="h-full">
              <CardContent className="p-6 h-full">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 h-full flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {document.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {document.mimeType} • {Math.round(document.size / 1024)} KB
                    </p>
                    <Button variant="outline" size="sm" className="mt-4">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Extracted Data */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Extracted Data
            </h4>
            
            <Card className="h-full">
              <CardContent className="p-6 h-full overflow-y-auto">
                {extractedData ? (
                  <div className="space-y-6">
                    {/* Project Information */}
                    {extractedData.projectInfo && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Project Information
                        </h5>
                        <div className="space-y-2">
                          {extractedData.projectInfo.name && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                              <span className="text-sm font-medium">{extractedData.projectInfo.name}</span>
                            </div>
                          )}
                          {extractedData.projectInfo.location && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                              <span className="text-sm font-medium">{extractedData.projectInfo.location}</span>
                            </div>
                          )}
                          {extractedData.date && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                              <span className="text-sm font-medium">{extractedData.date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Labor Entries */}
                    {extractedData.laborEntries && extractedData.laborEntries.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Labor Entries
                        </h5>
                        <div className="space-y-2">
                          {extractedData.laborEntries.map((labor, index) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-medium">{labor.name}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{labor.role}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(labor.confidence * 100)}%
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Hours:</span>
                                  <span className="ml-1 font-medium">{labor.hours}</span>
                                </div>
                                {labor.rate && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                                    <span className="ml-1 font-medium">${labor.rate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Equipment Entries */}
                    {extractedData.equipmentEntries && extractedData.equipmentEntries.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Equipment Entries
                        </h5>
                        <div className="space-y-2">
                          {extractedData.equipmentEntries.map((equipment, index) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-medium">{equipment.type}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{equipment.description}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(equipment.confidence * 100)}%
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Hours:</span>
                                  <span className="ml-1 font-medium">{equipment.hours}</span>
                                </div>
                                {equipment.rate && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                                    <span className="ml-1 font-medium">${equipment.rate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Material Entries */}
                    {extractedData.materialEntries && extractedData.materialEntries.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Material Entries
                        </h5>
                        <div className="space-y-2">
                          {extractedData.materialEntries.map((material, index) => (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-sm font-medium">{material.type}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{material.description}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(material.confidence * 100)}%
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                                  <span className="ml-1 font-medium">{material.quantity} {material.unit}</span>
                                </div>
                                {material.rate && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                                    <span className="ml-1 font-medium">${material.rate}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total Confidence */}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Overall Confidence:
                      </span>
                      <Badge variant="outline" className="text-sm">
                        {Math.round(extractedData.totalConfidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {document.status === 'processing' ? 'Processing document...' : 
                         document.status === 'failed' ? 'Failed to process document' :
                         'No extracted data available'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Data
          </Button>
          <Button className="fieldflo-primary fieldflo-primary-hover">
            Generate Change Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
