import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Document } from '@shared/schema';

interface DocumentEditorProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
}

interface ExtractedItem {
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  hours?: number;
  total?: number;
  classification?: string;
  [key: string]: any;
}

export default function DocumentEditor({ document, isOpen, onClose }: DocumentEditorProps) {
  const [extractedData, setExtractedData] = useState<any>(document.extractedData || {
    labor: [],
    equipment: [],
    materials: [],
    disposal: []
  });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/documents/${document.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ extractedData: data })
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Updated",
        description: "Extracted data has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update document",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(extractedData);
  };

  const updateCategory = (category: string, index: number, field: string, value: any) => {
    const newData = { ...extractedData };
    if (!newData[category]) newData[category] = [];
    if (!newData[category][index]) newData[category][index] = {};
    
    newData[category][index] = {
      ...newData[category][index],
      [field]: value
    };
    
    // Recalculate total if rate or hours/quantity changed
    if ((field === 'rate' || field === 'hours' || field === 'quantity') && newData[category][index]) {
      const item = newData[category][index];
      if (category === 'labor' && item.rate && item.hours) {
        item.total = item.rate * item.hours;
      } else if (item.rate && item.quantity) {
        item.total = item.rate * item.quantity;
      }
    }
    
    setExtractedData(newData);
  };

  const addItem = (category: string) => {
    const newData = { ...extractedData };
    if (!newData[category]) newData[category] = [];
    
    const newItem: ExtractedItem = category === 'labor' 
      ? { name: '', classification: '', rate: 0, hours: 0, total: 0 }
      : { description: '', quantity: 0, unit: '', rate: 0, total: 0 };
    
    newData[category].push(newItem);
    setExtractedData(newData);
  };

  const removeItem = (category: string, index: number) => {
    const newData = { ...extractedData };
    if (newData[category]) {
      newData[category].splice(index, 1);
      setExtractedData(newData);
    }
  };

  const renderItemEditor = (category: string, item: ExtractedItem, index: number) => {
    if (category === 'labor') {
      return (
        <div className="grid grid-cols-6 gap-2 items-center p-2 border rounded">
          <Input
            value={item.name || ''}
            onChange={(e) => updateCategory(category, index, 'name', e.target.value)}
            placeholder="Name"
          />
          <Input
            value={item.classification || ''}
            onChange={(e) => updateCategory(category, index, 'classification', e.target.value)}
            placeholder="Classification"
          />
          <Input
            type="number"
            value={item.rate || 0}
            onChange={(e) => updateCategory(category, index, 'rate', parseFloat(e.target.value))}
            placeholder="Rate"
          />
          <Input
            type="number"
            value={item.hours || 0}
            onChange={(e) => updateCategory(category, index, 'hours', parseFloat(e.target.value))}
            placeholder="Hours"
          />
          <div className="text-right font-medium">
            ${((item.rate || 0) * (item.hours || 0)).toFixed(2)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeItem(category, index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-6 gap-2 items-center p-2 border rounded">
        <Input
          value={item.description || item.item || ''}
          onChange={(e) => updateCategory(category, index, 'description', e.target.value)}
          placeholder="Description"
          className="col-span-2"
        />
        <Input
          type="number"
          value={item.quantity || 0}
          onChange={(e) => updateCategory(category, index, 'quantity', parseFloat(e.target.value))}
          placeholder="Quantity"
        />
        <Input
          value={item.unit || ''}
          onChange={(e) => updateCategory(category, index, 'unit', e.target.value)}
          placeholder="Unit"
        />
        <Input
          type="number"
          value={item.rate || 0}
          onChange={(e) => updateCategory(category, index, 'rate', parseFloat(e.target.value))}
          placeholder="Rate"
        />
        <div className="flex items-center justify-between">
          <span className="text-right font-medium">
            ${((item.rate || 0) * (item.quantity || 0)).toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeItem(category, index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const calculateCategoryTotal = (category: string) => {
    if (!extractedData[category]) return 0;
    return extractedData[category].reduce((sum: number, item: ExtractedItem) => {
      return sum + (item.total || 0);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document: {document.fileName}</DialogTitle>
        </DialogHeader>

        {document.confidence && document.confidence < 0.8 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Low confidence extraction ({(document.confidence * 100).toFixed(0)}%). Please review carefully.
            </span>
          </div>
        )}

        <Tabs defaultValue="labor" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="labor">
              Labor <Badge className="ml-2">{extractedData.labor?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="equipment">
              Equipment <Badge className="ml-2">{extractedData.equipment?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="materials">
              Materials <Badge className="ml-2">{extractedData.materials?.length || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disposal">
              Disposal <Badge className="ml-2">{extractedData.disposal?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          {['labor', 'equipment', 'materials', 'disposal'].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="capitalize">{category} Items</CardTitle>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">
                      Total: ${calculateCategoryTotal(category).toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => addItem(category)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {extractedData[category]?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No {category} items. Click "Add Item" to create one.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-6 gap-2 text-sm font-medium text-gray-600 px-2">
                        {category === 'labor' ? (
                          <>
                            <span>Name</span>
                            <span>Classification</span>
                            <span>Rate ($/hr)</span>
                            <span>Hours</span>
                            <span>Total</span>
                            <span></span>
                          </>
                        ) : (
                          <>
                            <span className="col-span-2">Description</span>
                            <span>Quantity</span>
                            <span>Unit</span>
                            <span>Rate ($)</span>
                            <span>Total</span>
                          </>
                        )}
                      </div>
                      {extractedData[category]?.map((item: ExtractedItem, index: number) => (
                        <div key={index}>
                          {renderItemEditor(category, item, index)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}