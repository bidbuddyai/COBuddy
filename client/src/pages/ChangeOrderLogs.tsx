import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  FileText, 
  AlertCircle,
  Phone,
  Mail,
  Building2,
  Briefcase,
  CloudRain,
  CheckSquare,
  ArrowLeft,
  Edit,
  Save,
  X,
  Filter,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ChangeOrderLog, ChangeOrder, Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Log type configurations with icons and colors
const LOG_TYPES = {
  meeting: { icon: Users, label: "Meeting", color: "bg-blue-100 text-blue-800" },
  phone_call: { icon: Phone, label: "Phone Call", color: "bg-green-100 text-green-800" },
  email: { icon: Mail, label: "Email", color: "bg-purple-100 text-purple-800" },
  site_visit: { icon: Building2, label: "Site Visit", color: "bg-yellow-100 text-yellow-800" },
  rfi_response: { icon: FileText, label: "RFI Response", color: "bg-orange-100 text-orange-800" },
  decision: { icon: CheckSquare, label: "Decision", color: "bg-red-100 text-red-800" },
  weather_delay: { icon: CloudRain, label: "Weather Delay", color: "bg-gray-100 text-gray-800" },
  inspection: { icon: Briefcase, label: "Inspection", color: "bg-indigo-100 text-indigo-800" },
};

export default function ChangeOrderLogs() {
  const [, params] = useLocation();
  const projectId = parseInt(params.projectId!);
  const changeOrderId = params.changeOrderId ? parseInt(params.changeOrderId) : undefined;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [selectedLogType, setSelectedLogType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [formData, setFormData] = useState({
    logType: "meeting",
    subject: "",
    description: "",
    attendees: "",
    location: "",
    meetingDate: new Date().toISOString().split('T')[0],
    decisionRequired: false,
    decisionMade: "",
    costImpact: "",
    scheduleImpact: "",
    weatherConditions: "",
    rfiNumber: "",
    sharedWithOwner: false,
  });

  // Fetch project data
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch change order data if specified
  const { data: changeOrder } = useQuery<ChangeOrder>({
    queryKey: [`/api/change-orders/${changeOrderId}`],
    enabled: !!changeOrderId,
  });

  // Fetch logs
  const { data: logs = [], isLoading } = useQuery<ChangeOrderLog[]>({
    queryKey: changeOrderId 
      ? [`/api/projects/${projectId}/co-logs?changeOrderId=${changeOrderId}`]
      : [`/api/projects/${projectId}/co-logs`],
    enabled: !!projectId,
  });

  // Filter logs by type and search
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesType = !selectedLogType || log.logType === selectedLogType;
      const matchesSearch = !searchTerm || 
        log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.attendees && log.attendees.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesType && matchesSearch;
    });
  }, [logs, selectedLogType, searchTerm]);

  // Create log mutation
  const createLogMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const logData = {
        changeOrderId: changeOrderId || changeOrder?.id,
        projectId,
        ...data,
        costImpact: data.costImpact ? parseFloat(data.costImpact) : null,
        scheduleImpact: data.scheduleImpact ? parseInt(data.scheduleImpact) : null,
        meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
      };
      
      return apiRequest("/api/co-logs", {
        method: "POST",
        body: JSON.stringify(logData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/co-logs`] });
      toast({ title: "Log created successfully" });
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create log", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update log mutation
  const updateLogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ChangeOrderLog> }) => {
      return apiRequest(`/api/co-logs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/co-logs`] });
      toast({ title: "Log updated successfully" });
      setEditingLogId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update log", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      logType: "meeting",
      subject: "",
      description: "",
      attendees: "",
      location: "",
      meetingDate: new Date().toISOString().split('T')[0],
      decisionRequired: false,
      decisionMade: "",
      costImpact: "",
      scheduleImpact: "",
      weatherConditions: "",
      rfiNumber: "",
      sharedWithOwner: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLogMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setLocation(changeOrderId ? `/change-orders/${changeOrderId}` : `/projects/${projectId}`)}
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Change Order Logs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {project?.name} {changeOrder && `• ${changeOrder.number}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Log Entry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedLogType || "all"} onValueChange={(value) => setSelectedLogType(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(LOG_TYPES).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center">
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {(isCreating || editingLogId) && (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? "Create New Log Entry" : "Edit Log Entry"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logType">Log Type</Label>
                  <Select 
                    value={formData.logType} 
                    onValueChange={(value) => setFormData({ ...formData, logType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LOG_TYPES).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center">
                            <config.icon className="h-4 w-4 mr-2" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="meetingDate">Date</Label>
                  <Input
                    id="meetingDate"
                    type="date"
                    value={formData.meetingDate}
                    onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief subject of the log entry"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed notes about the meeting, call, or event..."
                  rows={4}
                  required
                />
              </div>

              {(formData.logType === "meeting" || formData.logType === "phone_call") && (
                <div>
                  <Label htmlFor="attendees">Attendees/Participants</Label>
                  <Textarea
                    id="attendees"
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    placeholder="List all attendees or participants"
                    rows={2}
                  />
                </div>
              )}

              {formData.logType === "meeting" && (
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Meeting location (job site, office, virtual)"
                  />
                </div>
              )}

              {formData.logType === "rfi_response" && (
                <div>
                  <Label htmlFor="rfiNumber">RFI Number</Label>
                  <Input
                    id="rfiNumber"
                    value={formData.rfiNumber}
                    onChange={(e) => setFormData({ ...formData, rfiNumber: e.target.value })}
                    placeholder="RFI-001"
                  />
                </div>
              )}

              {formData.logType === "weather_delay" && (
                <div>
                  <Label htmlFor="weatherConditions">Weather Conditions</Label>
                  <Input
                    id="weatherConditions"
                    value={formData.weatherConditions}
                    onChange={(e) => setFormData({ ...formData, weatherConditions: e.target.value })}
                    placeholder="Heavy rain, high winds, etc."
                  />
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Impact Assessment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="costImpact">Cost Impact ($)</Label>
                    <Input
                      id="costImpact"
                      type="number"
                      step="0.01"
                      value={formData.costImpact}
                      onChange={(e) => setFormData({ ...formData, costImpact: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scheduleImpact">Schedule Impact (days)</Label>
                    <Input
                      id="scheduleImpact"
                      type="number"
                      value={formData.scheduleImpact}
                      onChange={(e) => setFormData({ ...formData, scheduleImpact: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="decisionRequired"
                    checked={formData.decisionRequired}
                    onCheckedChange={(checked) => setFormData({ ...formData, decisionRequired: checked as boolean })}
                  />
                  <Label htmlFor="decisionRequired">Decision Required</Label>
                </div>
                
                {formData.decisionRequired && (
                  <div>
                    <Label htmlFor="decisionMade">Decision Made</Label>
                    <Textarea
                      id="decisionMade"
                      value={formData.decisionMade}
                      onChange={(e) => setFormData({ ...formData, decisionMade: e.target.value })}
                      placeholder="Document the decision made..."
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 border-t pt-4">
                <Checkbox
                  id="sharedWithOwner"
                  checked={formData.sharedWithOwner}
                  onCheckedChange={(checked) => setFormData({ ...formData, sharedWithOwner: checked as boolean })}
                />
                <Label htmlFor="sharedWithOwner">Share with Owner</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingLogId(null);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button type="submit" disabled={createLogMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {isCreating ? "Create Log" : "Update Log"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Logs List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading logs...</p>
            </CardContent>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No logs found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedLogType 
                  ? "Try adjusting your filters" 
                  : "Create your first log entry to start tracking change order activities"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const logConfig = LOG_TYPES[log.logType as keyof typeof LOG_TYPES];
            const Icon = logConfig?.icon || FileText;
            
            return (
              <Card key={log.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${logConfig?.color || 'bg-gray-100 text-gray-800'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {log.subject}
                          </h3>
                          {log.sharedWithOwner && (
                            <Badge variant="secondary" className="text-xs">
                              Shared with Owner
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {log.meetingDate 
                              ? format(new Date(log.meetingDate), 'MMM dd, yyyy')
                              : format(new Date(log.createdAt), 'MMM dd, yyyy')
                            }
                          </span>
                          {log.location && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {log.location}
                            </span>
                          )}
                          {log.rfiNumber && (
                            <span className="flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              {log.rfiNumber}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                          {log.description}
                        </p>
                        
                        {log.attendees && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Attendees: 
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 ml-1">
                              {log.attendees}
                            </span>
                          </div>
                        )}
                        
                        {(log.costImpact || log.scheduleImpact) && (
                          <div className="flex items-center gap-4 mt-2">
                            {log.costImpact && (
                              <Badge variant="outline" className="text-xs">
                                Cost: {formatCurrency(Number(log.costImpact))}
                              </Badge>
                            )}
                            {log.scheduleImpact && (
                              <Badge variant="outline" className="text-xs">
                                Schedule: {log.scheduleImpact} days
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {log.decisionRequired && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                            <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span className="text-sm font-medium">Decision Required</span>
                            </div>
                            {log.decisionMade && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                <span className="font-medium">Decision: </span>
                                {log.decisionMade}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">
                            Created by {log.createdByName} • {format(new Date(log.createdAt), 'MMM dd, yyyy h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}