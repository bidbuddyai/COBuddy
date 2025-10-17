import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { Subcontractor } from '@shared/schema';

// Form schema
const subcontractorFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  contactName: z.string().min(1, 'Contact name is required').max(100),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  insuranceInfo: z.string().optional(),
  notes: z.string().optional(),
});

type SubcontractorFormValues = z.infer<typeof subcontractorFormSchema>;

interface SubcontractorFormProps {
  subcontractor?: Subcontractor;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubcontractorForm({
  subcontractor,
  onSuccess,
  onCancel
}: SubcontractorFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const form = useForm<SubcontractorFormValues>({
    resolver: zodResolver(subcontractorFormSchema),
    defaultValues: subcontractor ? {
      name: subcontractor.name,
      contactName: subcontractor.contactName,
      contactEmail: subcontractor.contactEmail || '',
      contactPhone: subcontractor.contactPhone || '',
      address: subcontractor.address || '',
      licenseNumber: subcontractor.licenseNumber || '',
      insuranceInfo: subcontractor.insuranceInfo || '',
      notes: subcontractor.notes || '',
    } : {
      name: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      licenseNumber: '',
      insuranceInfo: '',
      notes: '',
    }
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: SubcontractorFormValues) => {
      const url = subcontractor ? `/api/subcontractors/${subcontractor.id}` : '/api/subcontractors';
      const method = subcontractor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save subcontractor');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Subcontractor ${subcontractor ? 'updated' : 'created'} successfully`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subcontractors'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      setIsSubmitting(false);
    }
  });

  const onSubmit = (data: SubcontractorFormValues) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{subcontractor ? 'Edit' : 'Add'} Subcontractor</CardTitle>
        <CardDescription>
          {subcontractor ? 'Update the details of this subcontractor' : 'Add a new subcontractor to your company'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC Construction Inc." 
                      {...field}
                      data-testid="input-company-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Name */}
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Contact Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Smith" 
                      {...field}
                      data-testid="input-contact-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Email */}
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="john@example.com" 
                        {...field}
                        data-testid="input-contact-email" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Phone */}
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        {...field}
                        data-testid="input-contact-phone" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="123 Main St, Suite 100&#10;San Francisco, CA 94105"
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* License Number */}
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="CA-123456" 
                        {...field}
                        data-testid="input-license-number" 
                      />
                    </FormControl>
                    <FormDescription>
                      State contractor license number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Insurance Info */}
              <FormField
                control={form.control}
                name="insuranceInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Policy</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Policy #12345" 
                        {...field}
                        data-testid="input-insurance-info" 
                      />
                    </FormControl>
                    <FormDescription>
                      Liability insurance policy number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or special requirements..."
                      className="resize-none"
                      rows={3}
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
                {isSubmitting ? 'Saving...' : (subcontractor ? 'Update' : 'Add')} Subcontractor
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}