import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }

    setCustomers(data as Customer[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customer: { name: string; phone: string; address?: string; notes?: string }) => {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customer.name,
        phone: customer.phone,
        address: customer.address || null,
        notes: customer.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      toast.error('حدث خطأ في إضافة الزبون');
      return null;
    }

    fetchCustomers();
    return data as Customer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating customer:', error);
      toast.error('حدث خطأ في تحديث بيانات الزبون');
      return false;
    }

    toast.success('تم تحديث بيانات الزبون');
    fetchCustomers();
    return true;
  };

  const findCustomerByPhone = (phone: string) => {
    return customers.find(c => c.phone === phone);
  };

  const searchCustomers = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return customers.filter(
      c => c.name.toLowerCase().includes(lowerQuery) || 
           c.phone.includes(query)
    );
  };

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    findCustomerByPhone,
    searchCustomers,
    refetch: fetchCustomers,
  };
}
