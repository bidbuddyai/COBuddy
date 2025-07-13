import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Project, Document } from '@shared/schema';

interface ChangeOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  projectId?: number;
  selectedDocuments?: Document[];
  isSubmitting?: boolean;
}

interface EntryRow {
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function ChangeOrderForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  projectId,
  selectedDocuments,
  isSubmitting 
}: ChangeOrderFormProps) {
  // Fetch project details
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  const currentProject = projects?.find(p => p.id === projectId);
  
  const [formData, setFormData] = useState({
    // Header Information
    title: '',
    description: '',
    projectName: currentProject?.name || '',
    projectNumber: currentProject?.number || '',
    date: new Date().toLocaleDateString(),
    changeOrderNumber: '',
    
    // Contact Information
    toName: currentProject?.clientContact || '',
    toCompany: currentProject?.clientName || '',
    toEmail: '',
    fromName: '',
    fromCompany: 'Resource Environmental, Inc.',
    fromEmail: '',
    
    // Cost Breakdown
    laborEntries: [] as EntryRow[],
    materialEntries: [] as EntryRow[],
    equipmentOwnedEntries: [] as EntryRow[],
    equipmentRentedEntries: [] as EntryRow[],
    disposalEntries: [] as EntryRow[],
    importEntries: [] as EntryRow[],
    subcontractorEntries: [] as EntryRow[],
    
    // Markups (percentages)
    markups: {
      labor: 0,
      materials: 0,
      equipmentOwned: 0,
      equipmentRented: 0,
      disposal: 0,
      import: 0,
      subcontractors: 0
    },
    
    // Contract Info
    previousChangeOrders: 0,
    originalContract: 0,
    scheduleChange: '',
    
    // Status
    status: 'draft' as const
  });

  // Initialize with document data if provided
  useEffect(() => {
    if (selectedDocuments && selectedDocuments.length > 0) {
      let laborEntries: EntryRow[] = [];
      let materialEntries: EntryRow[] = [];
      let equipmentEntries: EntryRow[] = [];
      let disposalEntries: EntryRow[] = [];
      
      selectedDocuments.forEach(doc => {
        const extractedData = doc.extractedData as any;
        
        if (extractedData?.laborEntries) {
          laborEntries.push(...extractedData.laborEntries.map((entry: any) => ({
            description: entry.description || entry.name || '',
            unit: entry.unit || 'HR',
            quantity: entry.hours || entry.quantity || 0,
            rate: entry.rate || 0,
            amount: (entry.hours || entry.quantity || 0) * (entry.rate || 0)
          })));
        }
        
        if (extractedData?.materialEntries) {
          materialEntries.push(...extractedData.materialEntries.map((entry: any) => ({
            description: entry.description || entry.name || '',
            unit: entry.unit || 'EA',
            quantity: entry.quantity || 0,
            rate: entry.rate || 0,
            amount: (entry.quantity || 0) * (entry.rate || 0)
          })));
        }
        
        if (extractedData?.equipmentEntries) {
          equipmentEntries.push(...extractedData.equipmentEntries.map((entry: any) => ({
            description: entry.description || entry.name || '',
            unit: entry.unit || 'HR',
            quantity: entry.hours || entry.quantity || 0,
            rate: entry.rate || 0,
            amount: (entry.hours || entry.quantity || 0) * (entry.rate || 0)
          })));
        }
        
        if (extractedData?.disposalEntries) {
          disposalEntries.push(...extractedData.disposalEntries.map((entry: any) => ({
            description: entry.description || entry.name || '',
            unit: entry.unit || 'TON',
            quantity: entry.quantity || 0,
            rate: entry.rate || 0,
            amount: (entry.quantity || 0) * (entry.rate || 0)
          })));
        }
      });
      
      setFormData(prev => ({
        ...prev,
        title: selectedDocuments.length > 1 
          ? `CO from ${selectedDocuments.length} T&M Sheets`
          : `CO from ${selectedDocuments[0].originalName}`,
        description: `Change order created from documents: ${selectedDocuments.map(d => d.originalName).join(', ')}`,
        laborEntries,
        materialEntries,
        equipmentOwnedEntries: equipmentEntries, // Split equipment if needed
        disposalEntries
      }));
    }
  }, [selectedDocuments]);

  // Update project info when project changes
  useEffect(() => {
    if (currentProject) {
      setFormData(prev => ({
        ...prev,
        projectName: currentProject.name,
        projectNumber: currentProject.number,
        toName: currentProject.clientContact || '',
        toCompany: currentProject.clientName || '',
      }));
    }
  }, [currentProject]);

  const addEntry = (category: string) => {
    const newEntry: EntryRow = {
      description: '',
      unit: '',
      quantity: 0,
      rate: 0,
      amount: 0
    };
    
    setFormData(prev => ({
      ...prev,
      [`${category}Entries`]: [...(prev as any)[`${category}Entries`], newEntry]
    }));
  };

  const updateEntry = (category: string, index: number, field: string, value: any) => {
    setFormData(prev => {
      const entries = [...(prev as any)[`${category}Entries`]];
      entries[index] = {
        ...entries[index],
        [field]: value
      };
      
      // Recalculate amount if quantity or rate changed
      if (field === 'quantity' || field === 'rate') {
        entries[index].amount = entries[index].quantity * entries[index].rate;
      }
      
      return {
        ...prev,
        [`${category}Entries`]: entries
      };
    });
  };

  const removeEntry = (category: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [`${category}Entries`]: (prev as any)[`${category}Entries`].filter((_: any, i: number) => i !== index)
    }));
  };

  const calculateSubtotal = (category: string) => {
    const entries = (formData as any)[`${category}Entries`] || [];
    return entries.reduce((sum: number, entry: EntryRow) => sum + (entry.amount || 0), 0);
  };

  const calculateTotalWithMarkup = () => {
    const laborSubtotal = calculateSubtotal('labor');
    const materialSubtotal = calculateSubtotal('material');
    const equipmentOwnedSubtotal = calculateSubtotal('equipmentOwned');
    const equipmentRentedSubtotal = calculateSubtotal('equipmentRented');
    const disposalSubtotal = calculateSubtotal('disposal');
    const importSubtotal = calculateSubtotal('import');
    const subcontractorSubtotal = calculateSubtotal('subcontractor');
    
    const laborWithMarkup = laborSubtotal * (1 + formData.markups.labor / 100);
    const materialWithMarkup = materialSubtotal * (1 + formData.markups.materials / 100);
    const equipmentOwnedWithMarkup = equipmentOwnedSubtotal * (1 + formData.markups.equipmentOwned / 100);
    const equipmentRentedWithMarkup = equipmentRentedSubtotal * (1 + formData.markups.equipmentRented / 100);
    const disposalWithMarkup = disposalSubtotal * (1 + formData.markups.disposal / 100);
    const importWithMarkup = importSubtotal * (1 + formData.markups.import / 100);
    const subcontractorWithMarkup = subcontractorSubtotal * (1 + formData.markups.subcontractors / 100);
    
    return laborWithMarkup + materialWithMarkup + equipmentOwnedWithMarkup + 
           equipmentRentedWithMarkup + disposalWithMarkup + importWithMarkup + subcontractorWithMarkup;
  };

  const handleSubmit = () => {
    const totalAmount = calculateTotalWithMarkup();
    
    // Prepare data for submission
    const submitData = {
      projectId,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      totalAmount: totalAmount.toFixed(2),
      laborAmount: calculateSubtotal('labor').toFixed(2),
      materialAmount: calculateSubtotal('material').toFixed(2),
      equipmentAmount: (calculateSubtotal('equipmentOwned') + calculateSubtotal('equipmentRented')).toFixed(2),
      disposalAmount: calculateSubtotal('disposal').toFixed(2),
      importAmount: calculateSubtotal('import').toFixed(2),
      subcontractorAmount: calculateSubtotal('subcontractor').toFixed(2),
      data: {
        ...formData,
        documentIds: selectedDocuments?.map(d => d.id) || []
      }
    };
    
    onSubmit(submitData);
  };

  const EntryTable = ({ category, title }: { category: string; title: string }) => {
    const entries = (formData as any)[`${category}Entries`] || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{title}</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addEntry(category)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>
        
        {entries.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase w-20">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase w-24">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase w-24">Rate</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase w-28">Amount</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((entry: EntryRow, index: number) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <Input
                        value={entry.description}
                        onChange={(e) => updateEntry(category, index, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={entry.unit}
                        onChange={(e) => updateEntry(category, index, 'unit', e.target.value)}
                        placeholder="Unit"
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={entry.quantity}
                        onChange={(e) => updateEntry(category, index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={entry.rate}
                        onChange={(e) => updateEntry(category, index, 'rate', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={entry.amount.toFixed(2)}
                        disabled
                        className="h-8 bg-gray-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeEntry(category, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right font-medium">Subtotal:</td>
                  <td className="px-3 py-2 font-medium">${calculateSubtotal(category).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Change Order</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="font-medium">Project Information</h3>
                <div>
                  <Label>Project Name</Label>
                  <Input value={formData.projectName} disabled />
                </div>
                <div>
                  <Label>Project Number</Label>
                  <Input value={formData.projectNumber} disabled />
                </div>
                <div>
                  <Label>Change Order Number</Label>
                  <Input
                    value={formData.changeOrderNumber}
                    onChange={(e) => setFormData({ ...formData, changeOrderNumber: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input value={formData.date} disabled />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>To (Name)</Label>
                    <Input
                      value={formData.toName}
                      onChange={(e) => setFormData({ ...formData, toName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>To (Email)</Label>
                    <Input
                      type="email"
                      value={formData.toEmail}
                      onChange={(e) => setFormData({ ...formData, toEmail: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>To (Company)</Label>
                  <Input
                    value={formData.toCompany}
                    onChange={(e) => setFormData({ ...formData, toCompany: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From (Name)</Label>
                    <Input
                      value={formData.fromName}
                      onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>From (Email)</Label>
                    <Input
                      type="email"
                      value={formData.fromEmail}
                      onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Change Order Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter change order title"
                />
              </div>
              <div>
                <Label>Description of Change</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter detailed description of the change"
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="labor">
            <EntryTable category="labor" title="Labor (Backup: REI Wage Breakdown & DIR/WD Rates)" />
          </TabsContent>
          
          <TabsContent value="materials">
            <EntryTable category="material" title="Materials (Backup: Daily rate VE explanation, itemized summary, or bid sheet)" />
          </TabsContent>
          
          <TabsContent value="equipment" className="space-y-6">
            <EntryTable category="equipmentOwned" title="Equipment (Owned) - Backup: CalTrans Standard Rates" />
            <EntryTable category="equipmentRented" title="Equipment (Rented) - Backup: Quote or Invoice" />
          </TabsContent>
          
          <TabsContent value="other" className="space-y-6">
            <EntryTable category="disposal" title="Disposal (Backup: Quote or invoice)" />
            <EntryTable category="import" title="Import (Backup: Quote or invoice)" />
            <EntryTable category="subcontractor" title="Subcontractor Work (Backup: Subcontractor Quote, RFC/T&M, or Invoice)" />
            
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Markups (%)</h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Labor</Label>
                  <Input
                    type="number"
                    value={formData.markups.labor}
                    onChange={(e) => setFormData({
                      ...formData,
                      markups: { ...formData.markups, labor: parseFloat(e.target.value) || 0 }
                    })}
                    step="0.1"
                  />
                </div>
                <div>
                  <Label>Materials</Label>
                  <Input
                    type="number"
                    value={formData.markups.materials}
                    onChange={(e) => setFormData({
                      ...formData,
                      markups: { ...formData.markups, materials: parseFloat(e.target.value) || 0 }
                    })}
                    step="0.1"
                  />
                </div>
                <div>
                  <Label>Equipment (Owned)</Label>
                  <Input
                    type="number"
                    value={formData.markups.equipmentOwned}
                    onChange={(e) => setFormData({
                      ...formData,
                      markups: { ...formData.markups, equipmentOwned: parseFloat(e.target.value) || 0 }
                    })}
                    step="0.1"
                  />
                </div>
                <div>
                  <Label>Equipment (Rented)</Label>
                  <Input
                    type="number"
                    value={formData.markups.equipmentRented}
                    onChange={(e) => setFormData({
                      ...formData,
                      markups: { ...formData.markups, equipmentRented: parseFloat(e.target.value) || 0 }
                    })}
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between text-lg font-medium">
                <span>Grand Total for this Change Order:</span>
                <span className="text-2xl">${calculateTotalWithMarkup().toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Change Order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}