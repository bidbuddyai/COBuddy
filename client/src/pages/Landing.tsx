import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Zap, BarChart3, MessageSquare, Shield, Users } from "lucide-react";
import { Link } from "wouter";
import COBuddyIcon from "@assets/icon_1752387185212.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <img 
              src={COBuddyIcon} 
              alt="CO Buddy AI" 
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            CO Buddy AI
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Transform your T&M sheets into professional change orders with AI-powered document processing and intelligent rate matching.
          </p>
          <Link href="/auth">
            <Button 
              size="lg" 
              className="bg-[#03512A] hover:bg-[#024020] text-white px-8 py-3 text-lg"
            >
              Get Started
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <CardTitle className="text-slate-900 dark:text-slate-100">Smart Document Processing</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Upload T&M sheets, invoices, and supporting documents. Our AI extracts all relevant data automatically.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <CardTitle className="text-slate-900 dark:text-slate-100">Intelligent Rate Matching</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Automatically match labor, equipment, and material entries to your company's approved rate tables.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6" />
              </div>
              <CardTitle className="text-slate-900 dark:text-slate-100">Advanced Analytics</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Track costs, identify anomalies, and get predictive insights on your change order patterns.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <CardTitle className="text-slate-900 dark:text-slate-100">AI Assistant</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Get instant answers about rates, generate change orders through conversation, and streamline your workflow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <CardTitle className="text-slate-900 dark:text-slate-100">Compliance Ready</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Full audit trail, secure data handling, and approval workflows to meet industry requirements.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <div className="w-12 h-12 bg-[#03512A] text-white rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle className="text-slate-900 dark:text-slate-100">Role-Based Access</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Support for Admin, PM, Field, and Read-Only roles with appropriate permissions and workflows.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Ready to Transform Your Change Order Process?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Join professionals who are already saving time and reducing errors with our AI-powered solution.
          </p>
          <Link href="/auth">
            <Button 
              size="lg" 
              className="bg-[#03512A] hover:bg-[#024020] text-white px-8 py-3 text-lg"
            >
              Sign In to Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}