import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, isBefore, startOfDay } from 'date-fns';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Calendar, 
  User as UserIcon, 
  MoreHorizontal, 
  MapPin, 
  AlertCircle,
  Clock,
  ListTodo,
  CheckCircle,
  FileEdit,
  UserCheck
} from 'lucide-react';
import type { Task, Project, User } from '@shared/schema';

export default function Tasks() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = parseInt(projectId || '0', 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  
  // Sheet Drawer States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    location: '',
    assigneeId: '',
    assigneeName: '',
    dueDate: '',
  });

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [`/api/projects/${parsedProjectId}/tasks`],
    enabled: !!parsedProjectId,
  });

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${parsedProjectId}`],
    enabled: !!parsedProjectId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/companies/users'],
  });

  // Mutations
  const createTask = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        projectId: parsedProjectId,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      const response = await apiRequest('POST', `/api/projects/${parsedProjectId}/tasks`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Punch List Item Created",
        description: "The task has been successfully added to the punch list.",
      });
      setIsSheetOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/tasks`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Task",
        description: error.message || "Failed to create punch list task.",
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Task> }) => {
      const response = await apiRequest('PUT', `/api/tasks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Punch List Item Updated",
        description: "The task has been successfully updated.",
      });
      setIsSheetOpen(false);
      setEditingTask(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${parsedProjectId}/tasks`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Task",
        description: error.message || "Failed to update task details.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'open',
      priority: 'medium',
      location: '',
      assigneeId: '',
      assigneeName: '',
      dueDate: '',
    });
  };

  const handleOpenCreateSheet = () => {
    setEditingTask(null);
    resetForm();
    setIsSheetOpen(true);
  };

  const handleOpenEditSheet = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status || 'open',
      priority: task.priority || 'medium',
      location: task.location || '',
      assigneeId: task.assigneeId || '',
      assigneeName: task.assigneeName || '',
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    });
    setIsSheetOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the task.",
        variant: "destructive",
      });
      return;
    }

    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        data: {
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          location: formData.location,
          assigneeId: formData.assigneeId || null,
          assigneeName: formData.assigneeName || null,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        },
      });
    } else {
      createTask.mutate(formData);
    }
  };

  // Quick Status/Priority/Assignee Mutation Functions
  const handleQuickStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate({ id: taskId, data: { status: newStatus } });
  };

  const handleQuickPriorityChange = (taskId: number, newPriority: string) => {
    updateTask.mutate({ id: taskId, data: { priority: newPriority } });
  };

  const handleQuickAssigneeChange = (taskId: number, user: User | null) => {
    updateTask.mutate({
      id: taskId,
      data: {
        assigneeId: user ? user.id : null,
        assigneeName: user ? `${user.firstName} ${user.lastName}` : null
      }
    });
  };

  // Color Mapping Helpers
  const getStatusBadgeStyles = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': 
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'in_progress': 
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'completed': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'verified': 
        return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60';
      case 'closed': 
        return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': 
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60';
      case 'medium': 
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'low': 
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default: 
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'verified' || task.status === 'closed') {
      return false;
    }
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(task.dueDate));
    return isBefore(due, today);
  };

  // Filtering Logic
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assigneeName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || task.priority?.toLowerCase() === priorityFilter.toLowerCase();
    const matchesLocation = !locationFilter || (task.location || '').toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPriority && matchesLocation;
  });

  // Task metrics calculation
  const totalCount = tasks.length;
  const openCount = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'verified').length;
  const overdueCount = tasks.filter(isOverdue).length;

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumbs and Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Projects</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{project?.name || 'Project Details'}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400">Tasks</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            Punch List & Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Field quality control, punch items, work assignments, and action-item coordination.
          </p>
        </div>
        <div>
          <Button 
            onClick={handleOpenCreateSheet}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Punch Item
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Tasks</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center dark:bg-slate-800">
              <ListTodo className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Open</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{openCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center dark:bg-blue-950/40">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completed / Verified</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center dark:bg-emerald-950/40">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overdue</p>
              <p className={`text-3xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{overdueCount}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <AlertCircle className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-card/50 dark:border-slate-800">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search title, assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          {/* Location Search */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-10 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || locationFilter) && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPriorityFilter('all');
              setLocationFilter('');
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Task Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400 border-collapse">
            <thead className="text-xs text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-card border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Task Title</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Priority</th>
                <th className="px-6 py-4 font-semibold">Assignee</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <CheckSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No Tasks Found</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust filters or create a new punch item to get started.</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span 
                          onClick={() => handleOpenEditSheet(task)} 
                          className="font-semibold text-slate-900 dark:text-slate-50 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer hover:underline"
                        >
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1 font-normal">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{task.location || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Interactive Priority Badge */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className={`capitalize cursor-pointer font-semibold border px-2 py-0.5 rounded ${getPriorityBadgeStyles(task.priority || 'medium')}`}>
                            {task.priority || 'medium'}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleQuickPriorityChange(task.id, 'low')}>Low</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickPriorityChange(task.id, 'medium')}>Medium</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickPriorityChange(task.id, 'high')}>High</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {/* Interactive Assignee Selection */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded transition w-fit">
                            <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              {task.assigneeName?.split(' ').map(n => n[0]).join('') || <UserIcon className="h-3.5 w-3.5" />}
                            </div>
                            <span className="truncate max-w-[120px] text-slate-700 dark:text-slate-300">
                              {task.assigneeName || 'Unassigned'}
                            </span>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                          <DropdownMenuLabel>Assign Task</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleQuickAssigneeChange(task.id, null)}>
                            <span className="text-red-500">Unassign</span>
                          </DropdownMenuItem>
                          {users.map((user) => (
                            <DropdownMenuItem key={user.id} onClick={() => handleQuickAssigneeChange(task.id, user)}>
                              {user.firstName} {user.lastName}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className={isOverdue(task) ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-700 dark:text-slate-300"}>
                          {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : '—'}
                        </span>
                        {isOverdue(task) && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 text-[10px] px-1 py-0 rounded">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* Interactive Status Badge */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Badge variant="outline" className={`capitalize cursor-pointer font-semibold border px-2 py-0.5 rounded ${getStatusBadgeStyles(task.status || 'open')}`}>
                            {task.status?.replace('_', ' ') || 'open'}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'open')}>Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'in_progress')}>In Progress</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'completed')}>Completed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'verified')}>Verified</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'closed')}>Closed</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Check Complete */}
                        {task.status !== 'completed' && task.status !== 'verified' && task.status !== 'closed' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleQuickStatusChange(task.id, 'completed')}
                            title="Mark Completed"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/20"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditSheet(task)}>
                              <FileEdit className="mr-2 h-4 w-4 text-blue-500" />
                              <span>Edit Details</span>
                            </DropdownMenuItem>
                            {task.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'completed')}>
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                <span>Mark Completed</span>
                              </DropdownMenuItem>
                            )}
                            {task.status === 'completed' && (
                              <DropdownMenuItem onClick={() => handleQuickStatusChange(task.id, 'verified')}>
                                <UserCheck className="mr-2 h-4 w-4 text-teal-500" />
                                <span>Verify Task</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Task Creation & Modification Sheet Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTask ? 'Edit Punch Item' : 'Create Punch Item'}</SheetTitle>
            <SheetDescription>
              {editingTask 
                ? 'Update the details and assignments for this punch list task.' 
                : 'Add a new quality control or work assignment task to this project.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-5">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title / Subject</Label>
              <Input 
                id="title" 
                required 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Paint touch-ups in lobby ceiling"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea 
                id="description" 
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Provide detailed instructions or specs for the subcontractor/team..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(val) => setFormData({...formData, status: val})}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(val) => setFormData({...formData, priority: val})}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location / Area</Label>
                <Input 
                  id="location" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g. Room 204, Grid B-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input 
                  id="dueDate" 
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To (Company Member)</Label>
              <Select 
                value={formData.assigneeId} 
                onValueChange={(val) => {
                  if (val === 'unassigned') {
                    setFormData({...formData, assigneeId: '', assigneeName: ''});
                  } else {
                    const selectedUser = users.find(u => u.id === val);
                    setFormData({
                      ...formData, 
                      assigneeId: val, 
                      assigneeName: selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : ''
                    });
                  }
                }}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={() => setIsSheetOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm dark:bg-emerald-700 dark:hover:bg-emerald-600"
                disabled={createTask.isPending || updateTask.isPending}
              >
                {editingTask ? 'Save Changes' : 'Create Punch Item'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
