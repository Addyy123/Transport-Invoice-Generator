import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users, Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/db';
import { customerSchema, type Customer } from '../lib/schema';
import { generateId } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ConfirmModal } from '../components/ui/confirm-modal';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Customer>({
    resolver: zodResolver(customerSchema)
  });

  const loadCustomers = async () => {
    try {
      const keys = await db.customers.keys();
      const loaded: Customer[] = [];
      for (const key of keys) {
        const c = await db.customers.getItem<Customer>(key);
        if (c) loaded.push(c);
      }
      setCustomers(loaded.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load customers', error);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      reset(customer);
    } else {
      setEditingCustomer(null);
      reset({
        id: generateId(),
        customerName: '',
        companyName: '',
        gstNumber: '',
        billingAddress: '',
        shippingAddress: '',
        city: '',
        state: '',
        pinCode: '',
        phone: '',
        email: '',
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const onSubmit = async (data: Customer) => {
    data.updatedAt = Date.now();
    try {
      await db.customers.setItem(data.id, data);
      toast.success(editingCustomer ? 'Customer updated successfully!' : 'Customer added successfully!');
      handleCloseModal();
      loadCustomers();
    } catch (error) {
      console.error('Failed to save customer', error);
      toast.error('Failed to save customer.');
    }
  };

  const handleDeleteClick = async (id: string) => {
    try {
      const invKeys = await db.invoices.keys();
      let hasInvoices = false;
      for (const key of invKeys) {
        const inv = await db.invoices.getItem<any>(key);
        if (inv && inv.customerId === id) {
          hasInvoices = true;
          break;
        }
      }
      
      if (hasInvoices) {
        toast.error("Cannot delete this customer because they have existing invoices. Please delete the invoices first.");
        return;
      }

      setDeleteCustomerId(id);
    } catch (error) {
      console.error('Failed to check customer invoices', error);
      toast.error('Could not verify customer invoices. Please try again.');
    }
  };

  const executeDelete = async () => {
    if (!deleteCustomerId) return;
    try {
      await db.customers.removeItem(deleteCustomerId);
      toast.success("Customer deleted successfully!");
      loadCustomers();
    } catch (error) {
      console.error('Failed to delete customer', error);
      toast.error("Failed to delete customer.");
    } finally {
      setDeleteCustomerId(null);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.customerName.toLowerCase().includes(search.toLowerCase()) || 
    c.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Customers
          </h2>
          <p className="text-muted-foreground">
            Manage your transport parties and customer details.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search customers..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Name</th>
                <th className="px-6 py-4 font-medium">Company/GST</th>
                <th className="px-6 py-4 font-medium">City/State</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="p-4 rounded-full bg-slate-100 text-slate-400 mb-4">
                        <Users className="h-10 w-10" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground mb-1">No customers found</h4>
                      <p className="text-sm text-muted-foreground text-center mb-6">
                        {search ? "We couldn't find any customers matching your search query. Try adjusting your search term." : "Get started by adding your first party or freight customer to quickly generate transport invoices."}
                      </p>
                      {!search && (
                        <Button onClick={() => handleOpenModal()} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Your First Customer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{customer.customerName}</div>
                      <div className="text-slate-500 text-xs">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{customer.companyName || '-'}</div>
                      <div className="text-slate-500 text-xs">{customer.gstNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{customer.city || '-'}</div>
                      <div className="text-slate-500 text-xs">{customer.state}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenModal(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(customer.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input id="customerName" {...register('customerName')} />
                  {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" {...register('companyName')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input id="gstNumber" {...register('gstNumber')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" {...register('phone')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="billingAddress">Billing Address</Label>
                  <Input id="billingAddress" {...register('billingAddress')} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="shippingAddress">Shipping Address</Label>
                  <Input id="shippingAddress" {...register('shippingAddress')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register('state')} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pinCode">PIN Code</Label>
                  <Input id="pinCode" {...register('pinCode')} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" {...register('notes')} />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit">{editingCustomer ? 'Update' : 'Save'} Customer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteCustomerId}
        onClose={() => setDeleteCustomerId(null)}
        onConfirm={executeDelete}
        title="Delete Customer?"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Yes, Delete"
        variant="destructive"
      />
    </div>
  );
}
