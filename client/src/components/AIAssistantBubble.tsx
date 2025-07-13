import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, User, Loader2, X, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with context-aware message when opened
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      const currentPath = window.location.pathname;
      let initialMessage = "Hi! I'm CO Buddy AI, your intelligent assistant. ";
      
      // Add context-specific greeting based on current page
      switch (currentPath) {
        case '/rate-tables':
          initialMessage += "I see you're viewing rate tables. I can help you edit rates, search for specific items, import new rates, or validate your existing rates. What would you like to do?";
          break;
        case '/projects':
          initialMessage += "I notice you're on the projects page. I can help you create a new project, update project details, or analyze project data. How can I assist?";
          break;
        case '/change-orders':
          initialMessage += "You're working with change orders. I can help create a new change order, process T&M sheets, calculate costs, or edit existing orders. What do you need?";
          break;
        case '/documents':
          initialMessage += "I see you're managing documents. I can help process uploaded files, check extraction status, validate imported data, or re-process failed documents. How can I help?";
          break;
        case '/analytics':
          initialMessage += "You're viewing analytics. I can explain trends, identify anomalies, help generate reports, or provide insights about your data. What would you like to know?";
          break;
        default:
          initialMessage += "I can help you create projects, manage change orders, process T&M sheets, edit rates, and much more. Just tell me what you need!";
      }
      
      setMessages([{
        id: 1,
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date()
      }]);
      setHasInitialized(true);
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
              className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
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
              <CardHeader className="bg-primary text-white rounded-t-lg flex flex-row items-center justify-between p-4">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <CardTitle className="text-base">CO Buddy AI</CardTitle>
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
                            <AvatarFallback className={`text-xs ${message.role === 'user' ? 'bg-blue-500' : 'bg-primary'}`}>
                              {message.role === 'user' ? <User className="h-3 w-3 text-white" /> : <Bot className="h-3 w-3 text-white" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg px-3 py-1.5 ${
                            message.role === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-900'
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
                            <AvatarFallback className="bg-primary text-xs">
                              <Bot className="h-3 w-3 text-white" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="rounded-lg px-3 py-1.5 bg-gray-100">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="border-t">
                  {/* Quick actions/suggestions */}
                  {messages.length === 1 && (
                    <div className="p-2 border-b">
                      <p className="text-xs text-gray-500 mb-2">Try these actions:</p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInput("Create a change order from the latest T&M sheet")}
                        >
                          Create Change Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInput("Generate Excel and PDF for my latest change order")}
                        >
                          Export Files
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInput("Edit the hourly rate for Operating Engineer to $125")}
                        >
                          Edit Rates
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setInput("Validate my recent imports against rate tables")}
                        >
                          Validate Data
                        </Button>
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