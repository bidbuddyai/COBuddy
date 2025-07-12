import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ChangeOrderTable from "@/components/ChangeOrderTable";
import { Plus, FileText, Filter, Search, TrendingUp, Clock, CheckCircle, XCircle, Building, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChangeOrder, Project } from "@shared/schema";
import { PaginatedResponse } from "@/types";

export default function ChangeOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newCOOpen, setNewCOOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: changeOrders } = useQuery<PaginatedResponse<ChangeOrder>>({
    queryKey: ["/api/change-orders", { 
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined, 
      search: searchTerm,
      projectId: selectedProject
    }],
    enabled: !!selectedProject, // Only fetch when project is selected
  });

  const stats = [
    {
      label: "Total Change Orders",
      value: changeOrders?.total || 0,
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
      change: "+12%"
    },
    {
      label: "Pending Approval",
      value: changeOrders?.data.filter(co => co.status === 'pending').length || 0,
      icon: Clock,
      color: "bg-yellow-100 text-yellow-600",
      change: "3 urgent"
    },
    {
      label: "Approved This Month",
      value: changeOrders?.data.filter(co => co.status === 'approved').length || 0,
      icon: CheckCircle,
      color: "bg-green-100 text-green-600",
      change: "+18%"
    },
    {
      label: "Rejected",
      value: changeOrders?.data.filter(co => co.status === 'rejected').length || 0,
      icon: XCircle,
      color: "bg-red-100 text-red-600",
      change: "-5%"
    }
  ];

  const totalValue = changeOrders?.data.reduce((sum, co) => {
    return sum + (parseFloat(co.totalAmount?.toString() || '0'));
  }, 0) || 0;

  const selectedProjectData = projects?.find(p => p.id === selectedProject);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Change Orders</h1>
          {selectedProjectData && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Project: {selectedProjectData.name}
            </p>
          )}
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all change orders per project
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProject?.toString() || ''} onValueChange={(value) => setSelectedProject(value ? parseInt(value) : null)}>
            <SelectTrigger className="w-64">
              <Building className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProject && (
            <Dialog open={newCOOpen} onOpenChange={setNewCOOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Change Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Change Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" placeholder="Change order title" />
                    </div>
                    <div>
                      <Label htmlFor="project">Project</Label>
                      <Input value={selectedProjectData?.name || ''} disabled />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Detailed description of the change" rows={4} />
                  </div>
                  <div className="flex items-center justify-end space-x-3">
                    <Button variant="outline" onClick={() => setNewCOOpen(false)}>
                      Cancel
                    </Button>
                    <Button>
                      Create Change Order
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Project Selection Alert */}
      {!selectedProject && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please select a project above to view and manage change orders. Change orders are organized per project.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards - Only show when project is selected */}
      {selectedProject && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="transition-all duration-200 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {stat.change}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {/* Total Value Card - Only show when project is selected */}
      {selectedProject && (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Value (All Change Orders)
              </p>
              <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                ${totalValue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Across {changeOrders?.total || 0} change orders
              </p>
            </div>
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Filters and Search - Only show when project is selected */}
      {selectedProject && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Change Orders</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search change orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="cards">Card View</TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="mt-4">
              <ChangeOrderTable 
                filters={{ status: statusFilter, search: searchTerm }}
                showHeader={false}
              />
            </TabsContent>
            <TabsContent value="cards" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {changeOrders?.data.map((co) => (
                  <Card key={co.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{co.number}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{co.title}</p>
                        </div>
                        <Badge className={
                          co.status === 'approved' ? 'bg-green-100 text-green-700' :
                          co.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          co.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {co.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                          <span className="font-medium">
                            ${parseFloat(co.totalAmount?.toString() || '0').toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <span>{new Date(co.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3">
                          <Link href={`/change-orders/${co.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
