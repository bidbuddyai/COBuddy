import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/FileUpload";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, Sparkles, MessageSquare, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CompanySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  hasCustomRates: boolean;
}

export default function CompanySetupModal({ 
  isOpen, 
  onClose, 
  companyName, 
  hasCustomRates 
}: CompanySetupModalProps) {
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [processingComplete, setProcessingComplete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setupCompanyMutation = useMutation({
    mutationFn: async (data: { files: any[], skipRates?: boolean }) => {
      return apiRequest("/api/companies/setup", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Company Setup Complete",
        description: "Your company has been set up successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (files: any[]) => {
    setUploadedFiles(files);
    setStep(2);
    
    // Simulate AI processing
    setTimeout(() => {
      setProcessingComplete(true);
      setStep(3);
    }, 3000);
  };

  const handleCompleteSetup = () => {
    setupCompanyMutation.mutate({ files: uploadedFiles });
  };

  const handleSkipRates = () => {
    setupCompanyMutation.mutate({ files: [], skipRates: true });
  };

  // Don't show modal if company already has custom rates
  if (hasCustomRates) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to {companyName}!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
              <span>Step {step} of 3</span>
              <span>{Math.round((step / 3) * 100)}% Complete</span>
            </div>
            <Progress value={(step / 3) * 100} className="h-2" />
          </div>

          {step === 1 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                      Set Up Your Company Rates
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Let our AI assistant help you upload and organize your rate tables
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    What we'll help you with:
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Extract rate data from your PDFs and documents</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Organize rates by category (labor, materials, equipment)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Set up your company's rate database</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Enable AI-powered change order creation</span>
                    </li>
                  </ul>
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8">
                  <div className="text-center space-y-4">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Upload Your Rate Tables
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Drop your PDF rate tables, T&M calculators, or pricing documents here
                      </p>
                    </div>
                    <FileUpload 
                      onUploadComplete={handleFileUpload}
                      acceptedTypes={[".pdf", ".xlsx", ".xls"]}
                      maxFiles={10}
                      documentType="rate_table"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleSkipRates}>
                    Skip for Now
                  </Button>
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>AI assistant will guide you through the process</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                      AI Processing Your Files
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Our AI is extracting and organizing your rate data
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="w-8 h-8 bg-[#03512A] text-white rounded flex items-center justify-center text-sm">
                        📄
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {processingComplete ? "Processing complete" : "Extracting rate data..."}
                        </p>
                      </div>
                      {processingComplete ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-[#03512A] border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  ))}
                </div>

                {!processingComplete && (
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-4 h-4 border-2 border-[#03512A] border-t-transparent rounded-full animate-spin" />
                    <span>AI is analyzing your documents...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 dark:text-slate-100">
                      Setup Complete!
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Your company rates have been successfully processed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    What we've set up for you:
                  </h3>
                  <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Extracted {uploadedFiles.length} rate tables</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Organized rates by category</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Created your company rate database</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>AI assistant is ready to help create change orders</span>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={handleCompleteSetup}
                    disabled={setupCompanyMutation.isPending}
                    className="bg-[#03512A] hover:bg-[#025020] text-white"
                  >
                    {setupCompanyMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Setting Up...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Setup
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}