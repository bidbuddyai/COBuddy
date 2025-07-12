import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, BarChart3, MessageSquare, Users, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03512A] mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Change Order Creator
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#03512A] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {user?.role}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/documents">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Upload Documents</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Upload T&M sheets and supporting documents
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/change-orders">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Create Change Order</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Generate new change orders from processed data
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/analytics">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">View Analytics</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Track costs and project performance
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/chat">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">AI Assistant</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Get help with rates and change orders
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">Recent Change Orders</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Your latest change order activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">No change orders yet</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Start by uploading your first T&M sheet
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">System Status</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Current system information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">AI Processing</span>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Rate Tables</span>
                  <span className="text-sm font-medium text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">User Role</span>
                  <span className="text-sm font-medium text-[#03512A] capitalize">
                    {user?.role || 'User'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}