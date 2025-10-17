import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SubcontractorChangeOrder, Subcontractor } from '@shared/schema';

// Form schema
const scoFormSchema = z.object({
  subcontractorId: z.number().min(1, 'Subcontractor is required'),
  gcChangeOrderId: z.number().optional(),
  scoNumber: z.string().optional(),
  amountSubmitted: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid dollar amount'),
  amountApproved: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid dollar amount').optional(),
  submittedDate: z.date().optional(),
  approvedDate: z.date().optional().nullable(),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected']),
  notes: z.string().optional(),
});

type SCOFormValues = z.infer<typeof scoFormSchema>;

interface SubcontractorCOFormProps {
  projectId: number;
  gcChangeOrderId?: number;
  sco?: SubcontractorChangeOrder;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubcontractorCOForm({
  projectId,
  gcChangeOrderId,
  sco,
  onSuccess,
  onCancel
}: SubcontractorCOFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch subcontractors
  const { data: subcontractors, isLoading: subcontractorsLoading } = useQuery<Subcontractor[]>({
    queryKey: ['/api/subcontractors'],
    queryFn: async () => {
      const response = await fetch('/api/subcontractors', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch subcontractors');
      return response.json();
    }
  });

  // Form setup
  const form = useForm<SCOFormValues>({
    resolver: zodResolver(scoFormSchema),
    defaultValues: sco ? {
      subcontractorId: sco.subcontractorId,
      gcChangeOrderId: sco.gcChangeOrderId || undefined,
      scoNumber: sco.scoNumber || undefined,
      amountSubmitted: sco.amountSubmitted || '0',
      amountApproved: sco.amountApproved || '0',
      submittedDate: sco.submittedDate ? new Date(sco.submittedDate) : undefined,
      approvedDate: sco.approvedDate ? new Date(sco.approvedDate) : null,
      status: sco.status as any,
      notes: sco.notes || undefined,
    } : {
      gcChangeOrderId: gcChangeOrderId,
      status: 'pending',
      amountSubmitted: '0',
      amountApproved: '0',
    }
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: SCOFormValues) => {
      const payload = {
        ...data,
        projectId,
        gcChangeOrderId: gcChangeOrderId || data.gcChangeOrderId,
      };

      const url = sco ? `/api/subcontractor-change-orders/${sco.id}` : '/api/subcontractor-change-orders';
      const method = sco ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save SCO');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Subcontractor change order ${sco ? 'updated' : 'created'} successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subcontractor-change-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/co-logs/summary'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: SCOFormValues) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{sco ? 'Edit' : 'New'} Subcontractor Change Order</CardTitle>
        <CardDescription>
          {sco ? 'Update the details of this subcontractor change order' : 'Create a new subcontractor change order'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Subcontractor Selection */}
            <FormField
              control={form.control}
              name="subcontractorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcontractor</FormLabel>
                  <Select
                    disabled={subcontractorsLoading}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-subcontractor">
                        <SelectValue placeholder="Select a subcontractor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcontractors?.map((sub) => (
                        <SelectItem 
                          key={sub.id} 
                          value={sub.id.toString()}
                          data-testid={`subcontractor-${sub.id}`}
                        >
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SCO Number (optional, auto-generated if not provided) */}
            <FormField
              control={form.control}
              name="scoNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SCO Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Leave blank to auto-generate" 
                      {...field}
                      data-testid="input-sco-number" 
                    />
                  </FormControl>
                  <FormDescription>
                    If left blank, a number will be automatically generated
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount Submitted */}
            <FormField
              control={form.control}
              name="amountSubmitted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Submitted</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">$</span>
                      <Input 
                        type="text" 
                        placeholder="0.00" 
                        className="pl-7"
                        {...field}
                        data-testid="input-amount-submitted" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount Approved */}
            <FormField
              control={form.control}
              name="amountApproved"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Approved</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">$</span>
                      <Input 
                        type="text" 
                        placeholder="0.00" 
                        className="pl-7"
                        {...field}
                        data-testid="input-amount-approved" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submitted Date */}
            <FormField
              control={form.control}
              name="submittedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Submitted Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-submitted-date"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Approved Date */}
            <FormField
              control={form.control}
              name="approvedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Approved Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-approved-date"
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any additional notes..."
                      className="resize-none"
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit"
              >
                {isSubmitting ? 'Saving...' : (sco ? 'Update' : 'Create')} SCO
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}