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
    title: 'Welcome to ProjectBuddy',
    description: 'Let\'s get you set up in just a few minutes',
    icon: Rocket,
    content: `ProjectBuddy is a comprehensive construction project management platform. 
              It helps you manage budgets, schedules, RFIs, submittals, bid packages, and punch tasks in a single cohesive workspace.`,
  },
  {
    id: 2,
    title: 'Create Your First Project',
    description: 'Organize your work by project',
    icon: Settings,
    content: `Projects are the foundation of ProjectBuddy. Creating a project opens up a dedicated 
              Project Workspace where you can manage specific budgets, RFIs, submittals, and timelines.`,
    action: '/projects',
  },
  {
    id: 3,
    title: 'Manage Budgets & Timelines',
    description: 'Track project costs and milestones',
    icon: DollarSign,
    content: `Set up cost codes and track original budgets, approved/pending changes, committed costs, and forecasts. 
              Import CSV schedule lines, monitor critical path activities, and assign task owners.`,
    action: '/projects',
  },
  {
    id: 4,
    title: 'RFIs & Submittals',
    description: 'Draft and coordinate clarifications and reviews',
    icon: FileText,
    content: `Create RFIs with drawing links and discipline selectors. 
              Track submittal packages from subcontractors and log reviewer stamp approvals with document attachments.`,
    action: '/projects',
  },
  {
    id: 5,
    title: 'AI Change Orders',
    description: 'Automate change orders with built-in CO Buddy AI',
    icon: Upload,
    content: `Upload daily T&M sheets or subcontractor receipts. Let ProjectBuddy AI automatically 
              extract labor hours or materials, match your project rate sheets, and draft potential change orders (PCOs).`,
    action: '/rate-tables',
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
    setLocation('/projects');
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