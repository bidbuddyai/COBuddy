import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Settings,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Rocket
} from 'lucide-react';
import { useLocation } from 'wouter';

interface QuickStartWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    id: 1,
    title: 'Welcome to CO Buddy AI',
    description: 'Let\'s get you set up in just a few minutes',
    icon: Rocket,
    content: `CO Buddy AI helps you create professional change orders from your Time & Materials documents. 
              Our AI extracts data from PDFs and generates Excel and PDF change orders automatically.`,
  },
  {
    id: 2,
    title: 'Upload Your Rate Tables',
    description: 'Add your company\'s labor, equipment, and material rates',
    icon: DollarSign,
    content: `Rate tables are the foundation of accurate change orders. Upload your rate PDFs or CSVs, 
              and our AI will extract and organize them for you.`,
    action: '/rate-tables',
  },
  {
    id: 3,
    title: 'Create Your First Project',
    description: 'Organize your work by project',
    icon: Settings,
    content: `Projects help you keep change orders organized by client and job. 
              Each project can have its own budget, timeline, and team members.`,
    action: '/projects',
  },
  {
    id: 4,
    title: 'Upload T&M Documents',
    description: 'Let AI process your Time & Materials sheets',
    icon: Upload,
    content: `Upload T&M sheets, quotes, or invoices. Our AI will extract labor hours, 
              equipment usage, and materials, then match them to your rates automatically.`,
    action: '/documents',
  },
  {
    id: 5,
    title: 'Generate Change Orders',
    description: 'Create professional Excel and PDF change orders',
    icon: FileText,
    content: `Once your documents are processed, generate change orders with one click. 
              Export to Excel for editing or PDF for client submission.`,
    action: '/change-orders',
  },
];

export default function QuickStartWizard({ isOpen, onClose }: QuickStartWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('quickStartCompleted', 'true');
    onClose();
  };

  const handleComplete = () => {
    localStorage.setItem('quickStartCompleted', 'true');
    onClose();
    setLocation('/documents');
  };

  const handleActionClick = (action: string) => {
    localStorage.setItem('quickStartCompleted', 'true');
    onClose();
    setLocation(action);
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="relative">
          {/* Progress bar */}
          <Progress value={progress} className="h-1 rounded-none" />
          
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                Quick Start Guide
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 border-primary/20">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {step.description}
                        </p>
                        <p className="text-sm leading-relaxed">
                          {step.content}
                        </p>
                      </div>
                    </div>

                    {step.action && (
                      <div className="mt-6 pt-6 border-t">
                        <Button
                          onClick={() => handleActionClick(step.action!)}
                          variant="outline"
                          className="w-full"
                        >
                          Go to {step.title.replace('Your First ', '').replace('Create ', '')}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-600 hover:text-gray-800"
              >
                Skip tutorial
              </Button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
                
                <Button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      Complete
                      <CheckCircle className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}