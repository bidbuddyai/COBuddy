import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Save, Plus, Trash2, AlertCircle, MoveHorizontal, ArrowRight } from 'lucide-react';
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
    disposal: [],
    subcontractors: []
  });
  const [selectedItems, setSelectedItems] = useState<{[key: string]: number[]}>({});
  const [bulkMoveSource, setBulkMoveSource] = useState<string>('');
  const [bulkMoveTarget, setBulkMoveTarget] = useState<string>('');
  const [isReusable, setIsReusable] = useState(document.isReusable || false);
  const [isBackup, setIsBackup] = useState(document.isBackup || false);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/documents/${document.id}`, 'PATCH', { 
        extractedData: data.extractedData,
        isReusable: data.isReusable,
        isBackup: data.isBackup 
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Updated",
        description: "Document has been saved successfully."
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
    updateMutation.mutate({
      extractedData,
      isReusable,
      isBackup
    });
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
    
    let newItem: ExtractedItem;
    if (category === 'labor') {
      newItem = { name: '', classification: '', rate: 0, hours: 0, total: 0 };
    } else if (category === 'subcontractors') {
      newItem = { company: '', description: '', amount: 0, invoiceNumber: '' };
    } else {
      newItem = { description: '', quantity: 0, unit: '', rate: 0, total: 0 };
    }
    
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

  const moveItem = (sourceCategory: string, targetCategory: string, sourceIndex: number) => {
    const newData = { ...extractedData };
    if (!newData[sourceCategory] || !newData[targetCategory]) return;
    
    const item = newData[sourceCategory][sourceIndex];
    if (!item) return;
    
    // Remove from source
    newData[sourceCategory].splice(sourceIndex, 1);
    
    // Transform item based on target category
    let transformedItem;
    if (targetCategory === 'labor') {
      transformedItem = { 
        name: item.company || item.name || 'Worker', 
        classification: item.description || item.classification || 'General', 
        rate: item.rate || 50, 
        hours: item.hours || item.quantity || 8, 
        total: 0 
      };
    } else if (targetCategory === 'subcontractors') {
      transformedItem = { 
        company: item.company || item.name || 'Company', 
        description: item.description || 'Service', 
        amount: item.total || item.amount || 0, 
        invoiceNumber: item.invoiceNumber || '' 
      };
    } else {
      transformedItem = { 
        description: item.description || item.name || 'Item', 
        quantity: item.quantity || item.hours || 1, 
        unit: item.unit || 'each', 
        rate: item.rate || 0, 
        total: 0 
      };
    }
    
    // Add to target
    newData[targetCategory].push(transformedItem);
    setExtractedData(newData);
    
    toast({
      title: "Item Moved",
      description: `Item moved from ${sourceCategory} to ${targetCategory}`
    });
  };

  const toggleItemSelection = (category: string, index: number) => {
    const newSelection = { ...selectedItems };
    if (!newSelection[category]) newSelection[category] = [];
    
    const itemIndex = newSelection[category].indexOf(index);
    if (itemIndex > -1) {
      newSelection[category].splice(itemIndex, 1);
    } else {
      newSelection[category].push(index);
    }
    
    setSelectedItems(newSelection);
  };

  const bulkMoveItems = () => {
    if (!bulkMoveSource || !bulkMoveTarget || !selectedItems[bulkMoveSource]?.length) return;
    
    const newData = { ...extractedData };
    const itemsToMove = selectedItems[bulkMoveSource].sort((a, b) => b - a); // Sort descending to avoid index issues
    
    itemsToMove.forEach(index => {
      const item = newData[bulkMoveSource][index];
      if (!item) return;
      
      // Remove from source
      newData[bulkMoveSource].splice(index, 1);
      
      // Transform and add to target (same logic as single move)
      let transformedItem;
      if (bulkMoveTarget === 'labor') {
        transformedItem = { 
          name: item.company || item.name || 'Worker', 
          classification: item.description || item.classification || 'General', 
          rate: item.rate || 50, 
          hours: item.hours || item.quantity || 8, 
          total: 0 
        };
      } else if (bulkMoveTarget === 'subcontractors') {
        transformedItem = { 
          company: item.company || item.name || 'Company', 
          description: item.description || 'Service', 
          amount: item.total || item.amount || 0, 
          invoiceNumber: item.invoiceNumber || '' 
        };
      } else {
        transformedItem = { 
          description: item.description || item.name || 'Item', 
          quantity: item.quantity || item.hours || 1, 
          unit: item.unit || 'each', 
          rate: item.rate || 0, 
          total: 0 
        };
      }
      
      newData[bulkMoveTarget].push(transformedItem);
    });
    
    setExtractedData(newData);
    setSelectedItems({});
    setBulkMoveSource('');
    setBulkMoveTarget('');
    
    toast({
      title: "Items Moved",
      description: `${itemsToMove.length} items moved from ${bulkMoveSource} to ${bulkMoveTarget}`
    });
  };

  const renderItemEditor = (category: string, item: ExtractedItem, index: number) => {
    const categories = ['labor', 'equipment', 'materials', 'disposal', 'subcontractors'];
    const isSelected = selectedItems[category]?.includes(index) || false;
    
    if (category === 'labor') {
      return (
        <div className="grid grid-cols-8 gap-2 items-center p-2 border rounded">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleItemSelection(category, index)}
          />
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
          <Select value={category} onValueChange={(value) => moveItem(category, value, index)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    
    if (category === 'subcontractors') {
      return (
        <div className="grid grid-cols-7 gap-2 items-center p-2 border rounded">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleItemSelection(category, index)}
          />
          <Input
            value={item.company || ''}
            onChange={(e) => updateCategory(category, index, 'company', e.target.value)}
            placeholder="Company Name"
          />
          <Input
            value={item.description || ''}
            onChange={(e) => updateCategory(category, index, 'description', e.target.value)}
            placeholder="Description"
            className="col-span-2"
          />
          <Input
            type="number"
            value={item.amount || 0}
            onChange={(e) => updateCategory(category, index, 'amount', parseFloat(e.target.value))}
            placeholder="Amount"
          />
          <div className="flex items-center gap-1">
            <Input
              value={item.invoiceNumber || ''}
              onChange={(e) => updateCategory(category, index, 'invoiceNumber', e.target.value)}
              placeholder="Invoice #"
              className="text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Select value={category} onValueChange={(value) => moveItem(category, value, index)}>
              <SelectTrigger className="w-24">
                <MoveHorizontal className="h-3 w-3" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    }

    return (
      <div className="grid grid-cols-8 gap-2 items-center p-2 border rounded">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleItemSelection(category, index)}
        />
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
        <div className="text-right font-medium">
          ${((item.rate || 0) * (item.quantity || 0)).toFixed(2)}
        </div>
        <div className="flex items-center gap-1">
          <Select value={category} onValueChange={(value) => moveItem(category, value, index)}>
            <SelectTrigger className="w-24">
              <MoveHorizontal className="h-3 w-3" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat} className="capitalize text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      if (category === 'subcontractors') {
        return sum + (item.amount || 0);
      }
      return sum + (item.total || 0);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document: {document.originalName}</DialogTitle>
        </DialogHeader>

        {/* Document Settings */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reusable"
                  checked={isReusable}
                  onCheckedChange={setIsReusable}
                />
                <Label htmlFor="reusable" className="cursor-pointer">
                  Mark as Reusable Template
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="backup"
                  checked={isBackup}
                  onCheckedChange={setIsBackup}
                />
                <Label htmlFor="backup" className="cursor-pointer">
                  Mark as Backup Document
                </Label>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>Reusable templates can be used across projects</p>
              <p>Backup documents are linked to change orders</p>
            </div>
          </div>
        </Card>

        {document.confidence && parseFloat(document.confidence) < 0.8 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Low confidence extraction ({(parseFloat(document.confidence) * 100).toFixed(0)}%). Please review carefully.
            </span>
          </div>
        )}

        {/* Bulk Operations */}
        {Object.values(selectedItems).some(items => items.length > 0) && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {Object.values(selectedItems).flat().length} items selected
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Move from:</Label>
                  <Select value={bulkMoveSource} onValueChange={setBulkMoveSource}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(selectedItems).filter(cat => selectedItems[cat]?.length > 0).map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat} ({selectedItems[cat].length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <Label className="text-sm">to:</Label>
                  <Select value={bulkMoveTarget} onValueChange={setBulkMoveTarget}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Target" />
                    </SelectTrigger>
                    <SelectContent>
                      {['labor', 'equipment', 'materials', 'disposal', 'subcontractors'].map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={bulkMoveItems}
                    disabled={!bulkMoveSource || !bulkMoveTarget || bulkMoveSource === bulkMoveTarget}
                  >
                    Move Items
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems({})}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="labor" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="subcontractors">
              Subcontractors <Badge className="ml-2">{extractedData.subcontractors?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          {['labor', 'equipment', 'materials', 'disposal', 'subcontractors'].map((category) => (
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
                      <div className={`grid gap-2 text-sm font-medium text-gray-600 px-2 ${category === 'subcontractors' ? 'grid-cols-7' : 'grid-cols-8'}`}>
                        {category === 'labor' ? (
                          <>
                            <span>☑</span>
                            <span>Name</span>
                            <span>Classification</span>
                            <span>Rate ($/hr)</span>
                            <span>Hours</span>
                            <span>Total</span>
                            <span>Move</span>
                            <span></span>
                          </>
                        ) : category === 'subcontractors' ? (
                          <>
                            <span>☑</span>
                            <span>Company</span>
                            <span className="col-span-2">Description</span>
                            <span>Amount</span>
                            <span>Invoice #</span>
                            <span>Move</span>
                          </>
                        ) : (
                          <>
                            <span>☑</span>
                            <span className="col-span-2">Description</span>
                            <span>Quantity</span>
                            <span>Unit</span>
                            <span>Rate ($)</span>
                            <span>Total</span>
                            <span>Move</span>
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