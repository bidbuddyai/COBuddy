import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, Send, User, Loader2, FileText, DollarSign, Paperclip, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: any[];
}

interface DraftCO {
  projectName?: string;
  scope?: string;
  labor?: any[];
  materials?: any[];
  equipment?: any[];
  subcontractors?: any[];
  totalEstimate?: number;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m CO Buddy AI, your guided change order assistant. I can help you:\n\n• Create change orders with step-by-step guidance\n• Get estimates based on past similar work\n• Answer questions about rates and pricing\n• Navigate the application\n\nWant to create a change order? Just say "Create a change order" and I\'ll guide you through it!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [draftCO, setDraftCO] = useState<DraftCO | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { selectedProjectId } = useProject();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAIAction = async (action: any) => {
    try {
      switch (action.type) {
        case 'navigate':
          if (action.url) {
            navigate(action.url);
            toast({
              title: "Navigated",
              description: `Navigating to ${action.url}`,
            });
          }
          break;
        
        case 'process':
          if (action.endpoint) {
            await apiRequest('POST', action.endpoint);
            if (action.successMessage) {
              toast({
                title: "Success",
                description: action.successMessage,
              });
            }
          }
          break;
        
        case 'generate':
          if (action.endpoint) {
            await apiRequest('GET', action.endpoint);
            if (action.successMessage) {
              toast({
                title: "Success",
                description: action.successMessage,
              });
            }
          }
          break;
        
        case 'refresh':
          window.location.reload();
          break;
      }
    } catch (error) {
      toast({
        title: "Action Error",
        description: "Failed to execute action",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading || isUploading) return;

    // Upload files first if any
    let fileIds: number[] = [];
    if (selectedFiles.length > 0) {
      fileIds = await uploadFiles();
      if (fileIds.length === 0) {
        // Upload failed
        return;
      }
    }

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: input || `📎 Uploaded ${selectedFiles.length} file(s)`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setSelectedFiles([]); // Clear selected files
    setIsLoading(true);

    try {
      const responseRaw = await apiRequest('POST', '/api/ai/chat', {
        message: currentInput,
        conversationId,
        fileIds, // Include uploaded file IDs
        context: {
          currentPage: 'ai-assistant',
          projectId: selectedProjectId
        }
      });

      const response = await responseRaw.json();

      const assistantMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        actions: response.actions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle conversation ID
      if (response.data?.conversationId && !conversationId) {
        setConversationId(response.data.conversationId);
      }

      // Execute actions if any
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          await handleAIAction(action);
        }
      }

      // Update draft CO preview if in metadata
      if (response.data?.draft) {
        setDraftCO(response.data.draft);
      }
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<number[]> => {
    if (selectedFiles.length === 0) return [];
    
    setIsUploading(true);
    const fileIds: number[] = [];
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', selectedProjectId?.toString() || '');
        formData.append('type', 'invoice'); // Default type
        
        // Use fetch directly for FormData (apiRequest doesn't support it)
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
          // No Content-Type header - browser sets it automatically with boundary
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.id) {
          fileIds.push(data.id);
        }
      }
      
      toast({
        title: "Files uploaded",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      });
      
      // Clear the file input so users can reselect the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      return fileIds;
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload files. Please try again.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const calculateDraftTotal = () => {
    if (!draftCO) return 0;
    
    let total = 0;
    
    if (draftCO.labor) {
      total += draftCO.labor.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    if (draftCO.materials) {
      total += draftCO.materials.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    if (draftCO.equipment) {
      total += draftCO.equipment.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    if (draftCO.subcontractors) {
      total += draftCO.subcontractors.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    
    return total;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chat */}
        <Card className={`h-[calc(100vh-10rem)] ${draftCO ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-6 w-6 text-primary" />
              <span>CO Buddy AI Assistant</span>
              {conversationId && (
                <span className="text-sm text-muted-foreground ml-auto">
                  Session #{conversationId}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[calc(100%-5rem)]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    <div className={`flex space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={message.role === 'user' ? 'bg-blue-500' : 'bg-primary'}>
                          {message.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`rounded-lg px-4 py-2 ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start" data-testid="loading-indicator">
                    <div className="flex space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary">
                          <Bot className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-lg px-4 py-2 bg-gray-100">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-gray-400 text-xs">
                          ({Math.round(file.size / 1024)}KB)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* File upload button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  data-testid="button-attach"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading || isUploading}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isLoading || isUploading || (!input.trim() && selectedFiles.length === 0)}
                  data-testid="button-send"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live CO Preview */}
        {draftCO && (
          <Card className="h-[calc(100vh-10rem)] hidden lg:block">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Draft CO Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[calc(100%-2rem)]">
                <div className="space-y-4">
                  {draftCO.projectName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Project</p>
                      <p className="font-medium">{draftCO.projectName}</p>
                    </div>
                  )}

                  {draftCO.scope && (
                    <div>
                      <p className="text-sm text-muted-foreground">Scope</p>
                      <p className="text-sm">{draftCO.scope}</p>
                    </div>
                  )}

                  {draftCO.labor && draftCO.labor.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Labor</p>
                      <div className="space-y-1">
                        {draftCO.labor.map((item, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-muted-foreground">
                              {item.hours} hrs @ ${item.rate}/hr = ${item.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {draftCO.materials && draftCO.materials.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Materials</p>
                      <div className="space-y-1">
                        {draftCO.materials.map((item, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-muted-foreground">
                              {item.quantity} {item.unit} @ ${item.rate} = ${item.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {draftCO.equipment && draftCO.equipment.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Equipment</p>
                      <div className="space-y-1">
                        {draftCO.equipment.map((item, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-muted-foreground">
                              {item.hours} hrs @ ${item.rate}/hr = ${item.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {draftCO.subcontractors && draftCO.subcontractors.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Subcontractors</p>
                      <div className="space-y-1">
                        {draftCO.subcontractors.map((item, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-muted-foreground">
                              {item.scope} - ${item.amount.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Total Estimate</span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        ${calculateDraftTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
