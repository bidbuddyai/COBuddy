import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Upload, 
  Download, 
  Users, 
  Clock, 
  AlertTriangle,
  Play,
  CheckCircle,
  FileSpreadsheet,
  Edit,
  MoreHorizontal,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import type { ScheduleActivity, Project } from '@shared/schema';

export default function Schedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ScheduleActivity | null>(null);

  // CSV Import States
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    finishDate: '',
    duration: 1,
    percentComplete: 0,
    predecessors: '',
    successors: '',
    responsibleParty: '',
    phase: '',
    location: '',
    criticalPath: false,
  });

  // Queries
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ScheduleActivity[]>({
    queryKey: [`/api/projects/${parsedProjectId}/schedule`],
    enabled: !!parsedProjectId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  // Mutations
  const createActivity = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        projectId: parsedProjectId,
        startDate: new Date(data.startDate).toISOString(),
        finishDate: new Date(data.finishDate).toISOString(),
        predecessors: data.predecessors ? data.predecessors.split(',').map((s: string) => s.trim()) : [],
        successors: data.successors ? data.successors.split(',').map((s: string) => s.trim()) : [],
      };
      const response = await apiRequest('POST', `/api/projects/${parsedProjectId}/schedule`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Activity Added",
        description: "The schedule activity has been created successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/schedule`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create activity",
        variant: "destructive",
      });
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        finishDate: new Date(data.finishDate).toISOString(),
        predecessors: data.predecessors ? data.predecessors.split(',').map((s: string) => s.trim()) : [],
        successors: data.successors ? data.successors.split(',').map((s: string) => s.trim()) : [],
      };
      const response = await apiRequest('PUT', `/api/schedule-activities/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Activity Updated",
        description: "The activity details have been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingActivity(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/schedule`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update activity",
        variant: "destructive",
      });
    },
  });

  const importSchedule = useMutation({
    mutationFn: async (activitiesToImport: any[]) => {
      const response = await apiRequest('POST', `/api/projects/${parsedProjectId}/schedule/import`, {
        activities: activitiesToImport,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.count} schedule activities.`,
      });
      setCsvPreview([]);
      setIsImportPreviewOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/schedule`] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import schedule items.",
        variant: "destructive",
      });
    },
  });

  // Helpers
  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      finishDate: '',
      duration: 1,
      percentComplete: 0,
      predecessors: '',
      successors: '',
      responsibleParty: '',
      phase: '',
      location: '',
      criticalPath: false,
    });
  };

  const handleOpenCreateDialog = () => {
    setEditingActivity(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (activity: ScheduleActivity) => {
    setEditingActivity(activity);
    
    // Format dates to YYYY-MM-DD
    const startStr = activity.startDate ? format(new Date(activity.startDate), 'yyyy-MM-dd') : '';
    const finishStr = activity.finishDate ? format(new Date(activity.finishDate), 'yyyy-MM-dd') : '';
    
    // Format JSON fields back to strings
    const predStr = Array.isArray(activity.predecessors) ? activity.predecessors.join(', ') : '';
    const succStr = Array.isArray(activity.successors) ? activity.successors.join(', ') : '';

    setFormData({
      name: activity.name,
      startDate: startStr,
      finishDate: finishStr,
      duration: activity.duration,
      percentComplete: activity.percentComplete || 0,
      predecessors: predStr,
      successors: succStr,
      responsibleParty: activity.responsibleParty || '',
      phase: activity.phase || '',
      location: activity.location || '',
      criticalPath: !!activity.criticalPath,
    });
    setIsDialogOpen(true);
  };

  // Automatically calculate duration or finish date
  const handleDateChange = (field: 'startDate' | 'finishDate', value: string) => {
    const updated = { ...formData, [field]: value };
    
    if (updated.startDate && updated.finishDate) {
      const start = parseISO(updated.startDate);
      const finish = parseISO(updated.finishDate);
      const days = differenceInCalendarDays(finish, start);
      updated.duration = days >= 0 ? days + 1 : 1;
    }
    
    setFormData(updated);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startDate || !formData.finishDate) {
      toast({
        title: "Required Fields Missing",
        description: "Name, Start Date, and Finish Date are required.",
        variant: "destructive",
      });
      return;
    }

    if (editingActivity) {
      updateActivity.mutate({ id: editingActivity.id, data: formData });
    } else {
      createActivity.mutate(formData);
    }
  };

  const handleQuickPercentUpdate = (activity: ScheduleActivity, newPercent: number) => {
    updateActivity.mutate({
      id: activity.id,
      data: {
        name: activity.name,
        startDate: activity.startDate,
        finishDate: activity.finishDate,
        duration: activity.duration,
        percentComplete: newPercent,
        predecessors: Array.isArray(activity.predecessors) ? activity.predecessors.join(',') : '',
        successors: Array.isArray(activity.successors) ? activity.successors.join(',') : '',
        responsibleParty: activity.responsibleParty || '',
        phase: activity.phase || '',
        location: activity.location || '',
        criticalPath: activity.criticalPath || false,
      }
    });
  };

  // CSV Parsing
  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast({
            title: "Empty or Invalid CSV",
            description: "No activities could be parsed. Check headers.",
            variant: "destructive",
          });
          return;
        }
        setCsvPreview(parsed);
        setIsImportPreviewOpen(true);
      } catch (err) {
        toast({
          title: "Error Parsing CSV",
          description: "There was a formatting error in the CSV file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset file input value
    if (e.target) e.target.value = '';
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return [];
    
    // Parse headers (simple comma split, trimming quotes)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      const line = lines[i];
      
      for (let cIdx = 0; cIdx < line.length; cIdx++) {
        const char = line[cIdx];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
      
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      
      // Match properties
      const name = row.Name || row.name || row.Activity || row.activity || '';
      const start = row['Start Date'] || row['StartDate'] || row.start || row.Start || '';
      const finish = row['Finish Date'] || row['FinishDate'] || row.finish || row.Finish || '';
      const durationVal = row.Duration || row.duration;
      const percentVal = row['% Complete'] || row['%Complete'] || row.percentComplete || row.progress || 0;
      const responsible = row['Responsible Party'] || row.responsibleParty || row.responsible || row.Responsible || '';
      
      const mapped = {
        name,
        startDate: start,
        finishDate: finish,
        duration: durationVal ? parseInt(durationVal, 10) : 1,
        percentComplete: percentVal ? parseInt(percentVal, 10) : 0,
        responsibleParty: responsible,
        phase: row.Phase || row.phase || '',
        location: row.Location || row.location || '',
        criticalPath: row['Critical Path'] === 'true' || row['Critical Path'] === 'TRUE' || !!row.criticalPath,
      };
      
      if (mapped.name) {
        result.push(mapped);
      }
    }
    return result;
  };

  const handleDownloadSample = () => {
    const headers = "Name,Start Date,Finish Date,Duration,Predecessors,Successors,% Complete,Responsible Party,Phase,Location,Critical Path\n";
    const row1 = "Structure Demolition,2026-06-01,2026-06-10,8,,,0,Demolition Sub,Phase 1,North Wing,true\n";
    const row2 = "Concrete Footings,2026-06-11,2026-06-20,9,1,,0,Concrete Pros,Phase 1,North Wing,false\n";
    const csvContent = headers + row1 + row2;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "PMBuddy_Schedule_Sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering Logic
  const filteredActivities = activities.filter((act) => {
    const matchesSearch = 
      act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (act.responsibleParty || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPhase = phaseFilter === 'all' || act.phase?.toLowerCase() === phaseFilter.toLowerCase();
    const matchesCritical = !onlyCritical || !!act.criticalPath;

    return matchesSearch && matchesPhase && matchesCritical;
  });

  // Phases unique list
  const uniquePhases = Array.from(new Set(activities.map(a => a.phase).filter((p): p is string => !!p)));

  // Metrics
  const totalActCount = activities.length;
  const criticalCount = activities.filter(a => a.criticalPath).length;
  const avgProgress = activities.length > 0 
    ? Math.round(activities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / activities.length) 
    : 0;
  const completedCount = activities.filter(a => a.percentComplete === 100).length;

  if (activitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header and Import Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">Schedule</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Schedule Lookahead & Activities
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build and monitor the construction lookahead, milestones, logical links, and subcontractor task progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleCSVSelect}
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="border-slate-200 hover:border-slate-300 shadow-sm"
          >
            <Upload className="mr-2 h-4 w-4 text-emerald-600" />
            Import CSV Schedule
          </Button>
          <Button 
            onClick={handleOpenCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Activities</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">{totalActCount}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <CalendarDays className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overall Progress</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{avgProgress}%</p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center dark:bg-emerald-950/40">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Milestones Completed</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{completedCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center dark:bg-blue-950/40">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Critical Path items</p>
              <p className={`text-3xl font-extrabold mt-1 ${criticalCount > 0 ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>{criticalCount}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${criticalCount > 0 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-card/50 dark:border-slate-800">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search activity name, responsible party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm"
            />
          </div>

          {/* Phase Filter */}
          <select 
            value={phaseFilter} 
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="w-full bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Phases</option>
            {uniquePhases.map((phase) => (
              <option key={phase} value={phase}>{phase}</option>
            ))}
          </select>

          {/* Critical Path Checkbox */}
          <div className="flex items-center space-x-2 bg-white dark:bg-card px-3 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm h-10">
            <Checkbox 
              id="critical" 
              checked={onlyCritical} 
              onCheckedChange={(checked) => setOnlyCritical(checked === true)}
            />
            <label 
              htmlFor="critical" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-75 cursor-pointer text-slate-700 dark:text-slate-300"
            >
              Only Critical Path Activities
            </label>
          </div>
        </div>
      </div>

      {/* Schedule Log Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-center w-16">ID</th>
                <th className="px-6 py-4 font-semibold">Activity Name</th>
                <th className="px-6 py-4 font-semibold">Start Date</th>
                <th className="px-6 py-4 font-semibold">Finish Date</th>
                <th className="px-6 py-4 font-semibold text-center">Duration</th>
                <th className="px-6 py-4 font-semibold text-center">Predecessors</th>
                <th className="px-6 py-4 font-semibold text-center">Successors</th>
                <th className="px-6 py-4 font-semibold min-w-[150px]">% Complete</th>
                <th className="px-6 py-4 font-semibold">Responsible Party</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <CalendarDays className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No Activities Found</p>
                    <p className="text-xs text-slate-400 mt-1">Import a CSV lookahead schedule or create individual tasks.</p>
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => (
                  <tr 
                    key={act.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      act.criticalPath ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-center font-bold text-slate-400">
                      {act.id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span 
                          onClick={() => handleOpenEditDialog(act)} 
                          className="font-semibold text-slate-900 dark:text-slate-50 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer hover:underline"
                        >
                          {act.name}
                        </span>
                        <div className="flex gap-1.5 mt-1">
                          {act.criticalPath && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 text-[10px] px-1.5 py-0">
                              Critical Path
                            </Badge>
                          )}
                          {act.phase && (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px] px-1.5 py-0">
                              {act.phase}
                            </Badge>
                          )}
                          {act.location && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 text-[10px] px-1.5 py-0">
                              {act.location}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {act.startDate ? format(new Date(act.startDate), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {act.finishDate ? format(new Date(act.finishDate), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-slate-900 dark:text-slate-50">
                      {act.duration} {act.duration === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {Array.isArray(act.predecessors) && act.predecessors.length > 0 
                        ? act.predecessors.join(', ') 
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {Array.isArray(act.successors) && act.successors.length > 0 
                        ? act.successors.join(', ') 
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 max-w-[140px]">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span>{act.percentComplete}%</span>
                        </div>
                        <Progress 
                          value={act.percentComplete || 0} 
                          className="h-2 bg-slate-100 dark:bg-slate-800"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{act.responsibleParty || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEditDialog(act)}
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Dialog>
                          <DialogContent className="max-w-[200px]">
                            <DialogHeader>
                              <DialogTitle className="text-xs">Quick Progress Update</DialogTitle>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>

                        <button 
                          onClick={() => {
                            const newProgress = act.percentComplete === 100 ? 0 : 100;
                            handleQuickPercentUpdate(act, newProgress);
                          }}
                          title={act.percentComplete === 100 ? "Mark Incomplete" : "Mark 100% Completed"}
                          className={`p-1.5 rounded transition ${
                            act.percentComplete === 100 
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400' 
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Activity Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Lookahead Activity' : 'Add Lookahead Activity'}</DialogTitle>
            <DialogDescription>
              Provide activity details, durations, schedule sequences, and critical status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Activity Name</Label>
              <Input 
                id="name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Structure Demolition, Asbestos Remediation"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input 
                  id="startDate" 
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finishDate">Finish Date</Label>
                <Input 
                  id="finishDate" 
                  type="date"
                  required
                  value={formData.finishDate}
                  onChange={(e) => handleDateChange('finishDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input 
                  id="duration" 
                  type="number"
                  required
                  min={1}
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentComplete">% Complete</Label>
                <Input 
                  id="percentComplete" 
                  type="number"
                  min={0}
                  max={100}
                  value={formData.percentComplete}
                  onChange={(e) => setFormData({...formData, percentComplete: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2 flex items-center space-x-2 pt-6">
                <Checkbox 
                  id="criticalPath" 
                  checked={formData.criticalPath} 
                  onCheckedChange={(checked) => setFormData({...formData, criticalPath: checked === true})}
                />
                <label 
                  htmlFor="criticalPath" 
                  className="text-sm font-semibold text-red-600 dark:text-red-400 cursor-pointer"
                >
                  Critical Path?
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="predecessors">Predecessors (IDs, comma-separated)</Label>
                <Input 
                  id="predecessors" 
                  value={formData.predecessors}
                  onChange={(e) => setFormData({...formData, predecessors: e.target.value})}
                  placeholder="e.g. 1, 4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="successors">Successors (IDs, comma-separated)</Label>
                <Input 
                  id="successors" 
                  value={formData.successors}
                  onChange={(e) => setFormData({...formData, successors: e.target.value})}
                  placeholder="e.g. 3, 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsibleParty">Responsible Party</Label>
                <Input 
                  id="responsibleParty" 
                  value={formData.responsibleParty}
                  onChange={(e) => setFormData({...formData, responsibleParty: e.target.value})}
                  placeholder="e.g. Abatement Sub"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase">Phase</Label>
                <Input 
                  id="phase" 
                  value={formData.phase}
                  onChange={(e) => setFormData({...formData, phase: e.target.value})}
                  placeholder="e.g. Demolition, Earthwork"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location / Area</Label>
                <Input 
                  id="location" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Building A - Level 1"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                disabled={createActivity.isPending || updateActivity.isPending}
              >
                {editingActivity ? 'Save Changes' : 'Create Activity'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Preview Dialog */}
      <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Preview Schedule Import
            </DialogTitle>
            <DialogDescription>
              We successfully parsed {csvPreview.length} items from your CSV. Review them before importing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 border rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-card border-b font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Activity Name</th>
                  <th className="px-4 py-2">Start</th>
                  <th className="px-4 py-2">Finish</th>
                  <th className="px-4 py-2 text-center">Duration</th>
                  <th className="px-4 py-2 text-center">% Comp</th>
                  <th className="px-4 py-2">Responsible Party</th>
                  <th className="px-4 py-2 text-center">Critical</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {csvPreview.map((item, idx) => (
                  <tr key={idx} className={item.criticalPath ? 'bg-red-50/20 dark:bg-red-950/10' : ''}>
                    <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-200">{item.name}</td>
                    <td className="px-4 py-2 font-medium">{item.startDate}</td>
                    <td className="px-4 py-2 font-medium">{item.finishDate}</td>
                    <td className="px-4 py-2 text-center font-bold">{item.duration}</td>
                    <td className="px-4 py-2 text-center font-semibold">{item.percentComplete}%</td>
                    <td className="px-4 py-2 font-medium">{item.responsibleParty || '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={item.criticalPath ? 'text-red-600 font-bold' : 'text-slate-400'}>
                        {item.criticalPath ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-card rounded-lg">
            <button 
              onClick={handleDownloadSample} 
              type="button" 
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download Sample CSV
            </button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setCsvPreview([]); setIsImportPreviewOpen(false); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => importSchedule.mutate(csvPreview)}
                disabled={importSchedule.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Import All ({csvPreview.length} Items)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
