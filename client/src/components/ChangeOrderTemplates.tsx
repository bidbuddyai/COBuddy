import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Copy, 
  FileText, 
  Save, 
  Trash2, 
  Edit,
  Plus,
  CheckCircle,
  Folder
} from 'lucide-react';

interface ChangeOrderTemplate {
  id: number;
  name: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultNotes: string;
  includeLabor: boolean;
  includeEquipment: boolean;
  includeMaterials: boolean;
  includeDisposal: boolean;
  markupPercentage: number;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

interface ChangeOrderTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: ChangeOrderTemplate) => void;
}

export default function ChangeOrderTemplates({ isOpen, onClose, onSelectTemplate }: ChangeOrderTemplatesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChangeOrderTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultTitle: '',
    defaultDescription: '',
    defaultNotes: '',
    includeLabor: true,
    includeEquipment: true,
    includeMaterials: true,
    includeDisposal: false,
    markupPercentage: 15
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for now - in production this would come from the API
  const templates: ChangeOrderTemplate[] = [
    {
      id: 1,
      name: 'Standard T&M Change Order',
      description: 'Standard template for time and materials change orders',
      defaultTitle: 'Change Order - T&M Work',
      defaultDescription: 'Additional time and materials work as requested',
      defaultNotes: 'Work performed as per attached T&M sheets',
      includeLabor: true,
      includeEquipment: true,
      includeMaterials: true,
      includeDisposal: false,
      markupPercentage: 15,
      createdAt: new Date('2025-01-01'),
      lastUsed: new Date('2025-01-10'),
      useCount: 24
    },
    {
      id: 2,
      name: 'Emergency Response',
      description: 'Template for emergency response work',
      defaultTitle: 'Emergency Response Change Order',
      defaultDescription: 'Emergency response and remediation work',
      defaultNotes: 'Emergency response performed at client request',
      includeLabor: true,
      includeEquipment: true,
      includeMaterials: true,
      includeDisposal: true,
      markupPercentage: 25,
      createdAt: new Date('2025-01-05'),
      lastUsed: new Date('2025-01-12'),
      useCount: 8
    },
    {
      id: 3,
      name: 'Equipment Only',
      description: 'Template for equipment rental charges only',
      defaultTitle: 'Equipment Rental Change Order',
      defaultDescription: 'Equipment rental charges',
      defaultNotes: 'Equipment provided as requested',
      includeLabor: false,
      includeEquipment: true,
      includeMaterials: false,
      includeDisposal: false,
      markupPercentage: 10,
      createdAt: new Date('2025-01-07'),
      useCount: 5
    }
  ];

  const handleCreateTemplate = () => {
    // In production, this would save to the database
    toast({
      title: 'Template created',
      description: `"${formData.name}" template has been created successfully.`
    });
    setIsCreating(false);
    resetForm();
  };

  const handleUpdateTemplate = () => {
    // In production, this would update the database
    toast({
      title: 'Template updated',
      description: `"${formData.name}" template has been updated successfully.`
    });
    setEditingTemplate(null);
    resetForm();
  };

  const handleDeleteTemplate = (template: ChangeOrderTemplate) => {
    // In production, this would delete from the database
    toast({
      title: 'Template deleted',
      description: `"${template.name}" template has been deleted.`
    });
  };

  const handleSelectTemplate = (template: ChangeOrderTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      defaultTitle: '',
      defaultDescription: '',
      defaultNotes: '',
      includeLabor: true,
      includeEquipment: true,
      includeMaterials: true,
      includeDisposal: false,
      markupPercentage: 15
    });
  };

  const handleEditTemplate = (template: ChangeOrderTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      defaultTitle: template.defaultTitle,
      defaultDescription: template.defaultDescription,
      defaultNotes: template.defaultNotes,
      includeLabor: template.includeLabor,
      includeEquipment: template.includeEquipment,
      includeMaterials: template.includeMaterials,
      includeDisposal: template.includeDisposal,
      markupPercentage: template.markupPercentage
    });
    setEditingTemplate(template);
    setIsCreating(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Change Order Templates
          </DialogTitle>
          <DialogDescription>
            Save time by using templates for frequently created change orders
          </DialogDescription>
        </DialogHeader>

        {!isCreating ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Template
              </Button>
            </div>

            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            Used {template.useCount} times
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {template.includeLabor && (
                            <Badge variant="outline" className="text-xs">Labor</Badge>
                          )}
                          {template.includeEquipment && (
                            <Badge variant="outline" className="text-xs">Equipment</Badge>
                          )}
                          {template.includeMaterials && (
                            <Badge variant="outline" className="text-xs">Materials</Badge>
                          )}
                          {template.includeDisposal && (
                            <Badge variant="outline" className="text-xs">Disposal</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {template.markupPercentage}% Markup
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.lastUsed ? (
                            <span>Last used: {new Date(template.lastUsed).toLocaleDateString()}</span>
                          ) : (
                            <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSelectTemplate(template)}
                          className="inline-flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No templates created yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first template to speed up change order creation
                </p>
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard T&M Change Order"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of when to use this template"
                />
              </div>

              <div>
                <Label htmlFor="defaultTitle">Default Change Order Title</Label>
                <Input
                  id="defaultTitle"
                  value={formData.defaultTitle}
                  onChange={(e) => setFormData({ ...formData, defaultTitle: e.target.value })}
                  placeholder="e.g., Change Order - Additional Work"
                />
              </div>

              <div>
                <Label htmlFor="defaultDescription">Default Description</Label>
                <Textarea
                  id="defaultDescription"
                  value={formData.defaultDescription}
                  onChange={(e) => setFormData({ ...formData, defaultDescription: e.target.value })}
                  placeholder="Default description for change orders using this template"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="defaultNotes">Default Notes</Label>
                <Textarea
                  id="defaultNotes"
                  value={formData.defaultNotes}
                  onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                  placeholder="Default notes to include in change orders"
                  rows={2}
                />
              </div>

              <div>
                <Label>Include Sections</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.includeLabor}
                      onChange={(e) => setFormData({ ...formData, includeLabor: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Labor</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.includeEquipment}
                      onChange={(e) => setFormData({ ...formData, includeEquipment: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Equipment</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.includeMaterials}
                      onChange={(e) => setFormData({ ...formData, includeMaterials: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Materials</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.includeDisposal}
                      onChange={(e) => setFormData({ ...formData, includeDisposal: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Disposal</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="markup">Default Markup Percentage</Label>
                <Input
                  id="markup"
                  type="number"
                  value={formData.markupPercentage}
                  onChange={(e) => setFormData({ ...formData, markupPercentage: parseInt(e.target.value) || 0 })}
                  placeholder="15"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                className="inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}