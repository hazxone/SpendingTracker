import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/supabase";
import { editTransactionSchema, type EditTransaction, type Transaction } from "@shared/schema";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTransactionDialog({ 
  transaction, 
  isOpen, 
  onClose 
}: EditTransactionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with transaction data
  const form = useForm<EditTransaction>({
    resolver: zodResolver(editTransactionSchema),
    defaultValues: {
      id: transaction?.id || 0,
      price: Number(transaction?.price) || 0,
      items: transaction?.items || "",
      dateTime: transaction ? format(new Date(transaction.dateTime), "yyyy-MM-dd'T'HH:mm") : "",
      dateOnly: transaction ? format(new Date(transaction.dateOnly), "yyyy-MM-dd") : "",
      category: transaction?.category || "Food"
    }
  });
  
  // Update form values when transaction changes
  useEffect(() => {
    if (transaction) {
      form.reset({
        id: transaction.id,
        price: Number(transaction.price),
        items: transaction.items,
        dateTime: format(new Date(transaction.dateTime), "yyyy-MM-dd'T'HH:mm"),
        dateOnly: format(new Date(transaction.dateOnly), "yyyy-MM-dd"),
        category: transaction.category
      });
    }
  }, [transaction, form]);
  
  // Handle date and time changes to keep dateOnly in sync
  const handleDateTimeChange = (value: string) => {
    const dateTime = new Date(value);
    form.setValue("dateTime", value);
    form.setValue("dateOnly", format(dateTime, "yyyy-MM-dd"));
  };
  
  // Mutation for updating transaction
  const updateMutation = useMutation({
    mutationFn: async (data: EditTransaction) => {
      const response = await apiRequest("PUT", `/api/transactions/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction updated",
        description: "The transaction has been updated successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/daily'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update transaction: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Form submission handler
  const onSubmit = (data: EditTransaction) => {
    updateMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">
            Edit Transaction
          </DialogTitle>
          <DialogDescription>
            Make changes to the transaction details below.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Items</FormLabel>
                  <FormControl>
                    <Input placeholder="Item description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field} 
                      onChange={(e) => handleDateTimeChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
