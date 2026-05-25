import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, User, Loader2, X, MessageCircle, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ActionChip {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

export default function AIAssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionChips, setActionChips] = useState<ActionChip[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate predictive action chips based on current page
  const generateActionChips = (path: string): ActionChip[] => {
    if (path.includes('/rate-tables')) {
      return [
        { label: 'Search equipment rates', action: () => setInput('Show me all equipment rates') },
        { label: 'Edit labor rates', action: () => setInput('I want to edit labor rates') },
        { label: 'Import new rates', action: () => setInput('Help me import new rate tables') },
        { label: 'View Caltrans rates', action: () => setInput('Show me the public Caltrans rates') }
      ];
    }
    if (path.includes('/budget')) {
      return [
        { label: 'Add budget line', action: () => setInput('Help me add a new budget line item') },
        { label: 'Check EAC variance', action: () => setInput('Show me budget items with negative variance') },
        { label: 'Sync change orders', action: () => setInput('Update budget with approved change orders') }
      ];
    }
    if (path.includes('/schedule')) {
      return [
        { label: 'Show critical path', action: () => setInput('Show me schedule activities on the critical path') },
        { label: 'Import CSV schedule', action: () => setInput('How do I import schedule from CSV?') },
        { label: 'List responsible parties', action: () => setInput('Who is responsible for upcoming schedule milestones?') }
      ];
    }
    if (path.includes('/rfis')) {
      return [
        { label: 'Create new RFI', action: () => setInput('Create a new RFI') },
        { label: 'Show overdue RFIs', action: () => setInput('Show me all overdue RFIs') },
        { label: 'Assign ball-in-court', action: () => setInput('Help me update ball-in-court for my RFIs') }
      ];
    }
    if (path.includes('/submittals')) {
      return [
        { label: 'New submittal draft', action: () => setInput('Draft a new submittal package') },
        { label: 'Check pending reviews', action: () => setInput('Show me submittals pending structural review') },
        { label: 'List overdue reviews', action: () => setInput('Which submittal reviews are overdue?') }
      ];
    }
    if (path.includes('/tasks')) {
      return [
        { label: 'Create punch item', action: () => setInput('Add a new punch list task') },
        { label: 'Show overdue tasks', action: () => setInput('Show me all overdue tasks') },
        { label: 'Filter by location', action: () => setInput('Filter tasks by field location') }
      ];
    }
    if (path.includes('/change-orders')) {
      return [
        { label: 'Create from T&M', action: () => setInput('Create a change order from my T&M sheets') },
        { label: 'Generate Excel export', action: () => setInput('Generate an Excel file for change order') },
        { label: 'View pending COs', action: () => setInput('Show me all pending change orders') },
        { label: 'Calculate totals', action: () => setInput('Help me calculate change order totals') }
      ];
    }
    if (path.includes('/documents')) {
      return [
        { label: 'Process pending docs', action: () => setInput('Process all my pending documents') },
        { label: 'Check failed extractions', action: () => setInput('Show me documents that failed processing') },
        { label: 'Create CO from docs', action: () => setInput('Create a change order from selected documents') },
        { label: 'Validate imports', action: () => setInput('Validate the imported data against rate tables') }
      ];
    }
    if (path.includes('/analytics')) {
      return [
        { label: 'Explain cost trends', action: () => setInput('Explain the cost trends in my analytics') },
        { label: 'Find anomalies', action: () => setInput('Are there any anomalies in my project data?') },
        { label: 'Generate report', action: () => setInput('Generate a summary report') }
      ];
    }
    if (path.includes('/projects')) {
      return [
        { label: 'Create new project', action: () => setInput('Create a new project') },
        { label: 'View project analytics', action: () => setInput('Show me analytics for my current project') },
        { label: 'Update project status', action: () => setInput('Help me update project status') }
      ];
    }
    return [
      { label: 'View project list', action: () => setInput('Show me my projects') },
      { label: 'Create change order', action: () => setInput('Help me create a change order') },
      { label: 'Process documents', action: () => setInput('I need to process T&M sheets') },
      { label: 'Explain project health', action: () => setInput('Analyze my project health KPIs') }
    ];
  };

  // Initialize with context-aware message when opened
  useEffect(() => {
    if (isOpen) {
      const currentPath = window.location.pathname;
      
      // Always update action chips when opening
      setActionChips(generateActionChips(currentPath));
      
      if (!hasInitialized) {
        let initialMessage = "Hi! I'm ProjectBuddy AI, your intelligent construction operations assistant. ";
      
        // Add context-specific greeting based on current page
        if (currentPath.includes('/rate-tables')) {
          initialMessage += "I see you're viewing rate tables. I can help you edit rates, search for specific items, import new rates, or validate your existing rates. What would you like to do?";
        } else if (currentPath.includes('/budget')) {
          initialMessage += "You're viewing the project budget. I can help you analyze variances, add budget line items, or sync approved change orders. How can I assist?";
        } else if (currentPath.includes('/schedule')) {
          initialMessage += "I see you're checking the project schedule. I can help you analyze critical path activities, import CSV lines, or check who owns upcoming milestones. What do you need?";
        } else if (currentPath.includes('/rfis')) {
          initialMessage += "You're working with RFIs. I can help you draft a new RFI, list open issues, or update ball-in-court assignees. What would you like to do?";
        } else if (currentPath.includes('/submittals')) {
          initialMessage += "I notice you're in the Submittals area. I can help you check review statuses, track structural reviewer approvals, or log a new submittal package. How can I help?";
        } else if (currentPath.includes('/tasks')) {
          initialMessage += "You're managing tasks and punch lists. I can help create new punch items, list overdue items, or filter tasks by site location. What's on your mind?";
        } else if (currentPath.includes('/change-orders')) {
          initialMessage += "You're working with change orders. I can help create a new change order, process T&M sheets, calculate costs, or edit existing orders. What do you need?";
        } else if (currentPath.includes('/documents')) {
          initialMessage += "I see you're managing documents. I can help process uploaded files, check extraction status, validate imported data, or re-process failed documents. How can I help?";
        } else if (currentPath.includes('/analytics')) {
          initialMessage += "You're viewing analytics. I can explain trends, identify cost anomalies, help generate reports, or provide insights about your data. What would you like to know?";
        } else if (currentPath.includes('/projects')) {
          initialMessage += "I notice you're on the projects page. I can help you create a new project, update project details, or analyze project data. How can I assist?";
        } else {
          initialMessage += "I can help you manage budgets, schedules, RFIs, submittals, bid packages, change orders, and punch lists. Just tell me what you need!";
        }
      
        setMessages([{
          id: 1,
          role: 'assistant',
          content: initialMessage,
          timestamp: new Date()
        }]);
        setHasInitialized(true);
      }
    }
  }, [isOpen, hasInitialized]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get current page context
      const currentPath = window.location.pathname;
      const pageContext = {
        currentPage: currentPath,
        pageTitle: document.title,
        url: window.location.href
      };

      const response = await apiRequest('POST', '/api/ai/chat', { 
        message: input,
        context: pageContext,
        requestActions: true // Enable AI to perform actions
      });

      const responseData = await response.json();

      // Handle AI actions if any
      if (responseData.actions && responseData.actions.length > 0) {
        for (const action of responseData.actions) {
          await handleAIAction(action);
        }
      }

      const assistantMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: responseData.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update action chips after assistant responds
      setActionChips(generateActionChips(window.location.pathname));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIAction = async (action: any) => {
    try {
      switch (action.type) {
        case 'navigate':
          window.location.href = action.url;
          break;
        case 'create':
          await apiRequest('POST', action.endpoint, action.data);
          toast({
            title: "Success",
            description: action.successMessage || "Action completed successfully"
          });
          break;
        case 'update':
          await apiRequest('PATCH', action.endpoint, action.data);
          toast({
            title: "Success",
            description: action.successMessage || "Updated successfully"
          });
          break;
        case 'refresh':
          window.location.reload();
          break;
      }
    } catch (error) {
      console.error('Failed to execute AI action:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating bubble button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
          >
            <Card className="shadow-xl">
              <CardHeader className="bg-emerald-700 text-white rounded-t-lg flex flex-row items-center justify-between p-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <CardTitle className="text-base font-bold">ProjectBuddy AI</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 h-96 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className={`text-xs ${message.role === 'user' ? 'bg-emerald-600 dark:bg-emerald-500 text-white font-semibold' : 'bg-emerald-700 text-white font-semibold'}`}>
                              {message.role === 'user' ? <User className="h-3 w-3 text-white" /> : <Bot className="h-3 w-3" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg px-3 py-1.5 ${
                            message.role === 'user' 
                              ? 'bg-emerald-600 dark:bg-emerald-500 text-white' 
                              : 'bg-muted text-foreground'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-emerald-700 text-white text-xs">
                              <Bot className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="rounded-lg px-3 py-1.5 bg-muted">
                            <Loader2 className="h-3 w-3 animate-spin text-emerald-700" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="border-t">
                  {/* Predictive Action Chips */}
                  {actionChips.length > 0 && (
                    <div className="p-2 border-b">
                      <p className="text-xs text-muted-foreground mb-2">Suggested actions:</p>
                      <div className="flex flex-wrap gap-1">
                        {actionChips.map((chip, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 hover:bg-emerald-600 hover:text-white transition-colors border-slate-200"
                            onClick={() => {
                              chip.action();
                              // Auto-send the message after a short delay
                              setTimeout(() => handleSendMessage(), 100);
                            }}
                          >
                            {chip.icon && <span className="mr-1">{chip.icon}</span>}
                            {chip.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex space-x-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="flex-1 text-sm"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={isLoading || !input.trim()}
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}