import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCards from "@/components/StatsCards";
import FileUpload from "@/components/FileUpload";
import AIChat from "@/components/AIChat";
import ChangeOrderTable from "@/components/ChangeOrderTable";
import DocumentViewer from "@/components/DocumentViewer";
import ProjectSelector from "@/components/ProjectSelector";
import { Plus, Download, Camera, Table, FileSpreadsheet, Settings, Activity, Building } from "lucide-react";
import { Document } from "@shared/schema";

export default function Dashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();

  const { data: recentDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const recentActivities = [
    {
      id: 1,
      type: 'approved',
      message: 'CO-2024-147 approved',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: 'check',
      color: 'text-green-600'
    },
    {
      id: 2,
      type: 'processed',
      message: 'T&M sheet processed',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: 'upload',
      color: 'text-blue-600'
    },
    {
      id: 3,
      type: 'updated',
      message: 'Rate table updated',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: 'alert',
      color: 'text-yellow-600'
    }
  ];

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track change orders with AI-powered automation
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button className="fieldflo-primary fieldflo-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            New Change Order
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Project Selection */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectSelect={setSelectedProjectId}
      />

      {!selectedProjectId && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a project</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a project to view its dashboard and manage change orders.
            </p>
          </div>
        </div>
      )}

      {selectedProjectId && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <StatsCards projectId={selectedProjectId} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload */}
              <FileUpload />

              {/* Recent Change Orders */}
              <ChangeOrderTable maxRows={5} projectId={selectedProjectId} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* AI Assistant */}
              <div className="h-96">
                <AIChat />
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Camera className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Take Photo</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Table className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium">View Rate Tables</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium">Export Report</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Button>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Settings className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium">Settings</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        activity.type === 'approved' ? 'bg-green-100' :
                        activity.type === 'processed' ? 'bg-blue-100' :
                        'bg-yellow-100'
                      }`}>
                        {activity.type === 'approved' && <span className="text-green-600">✓</span>}
                        {activity.type === 'processed' && <span className="text-blue-600">↑</span>}
                        {activity.type === 'updated' && <span className="text-yellow-600">!</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}