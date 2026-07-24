import { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Save, Plus, Trash2, Calculator, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { invoiceSchema, type Invoice, type Customer, type Settings as AppSettings } from '../lib/schema';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { useNavigate, useParams } from 'react-router-dom';
import { generateId } from '../lib/utils';

export function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { register, control, handleSubmit, setValue, reset, formState: { errors, isDirty } } = useForm<any>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      id: generateId(),
      invoiceNumber: '',
      invoiceDate: Date.now(),
      dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
      status: 'Draft',
      customerId: '',
      fromLocation: '',
      toLocation: '',
      weightUnit: 'KG',
      freightCharge: 0,
      extraCharges: [],
      discount: 0,
      gstOption: 'NONE',
      gstPercentage: 0,
      paidAmount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  });

  const { fields: extraChargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({
    control,
    name: 'extraCharges'
  });

  // Watch fields for live calculation
  const freightCharge = useWatch({ control, name: 'freightCharge' }) || 0;
  const extraCharges = useWatch({ control, name: 'extraCharges' }) || [];
  const discount = useWatch({ control, name: 'discount' }) || 0;
  const gstOption = useWatch({ control, name: 'gstOption' });
  const gstPercentage = useWatch({ control, name: 'gstPercentage' }) || 0;
  const paidAmount = useWatch({ control, name: 'paidAmount' }) || 0;
  
  const invoiceDate = useWatch({ control, name: 'invoiceDate' });
  const dueDate = useWatch({ control, name: 'dueDate' });

  // Auto-calculation logic
  useEffect(() => {
    const extraChargesTotal = extraCharges.reduce((sum: number, charge: any) => sum + (Number(charge.amount) || 0), 0);
    const subtotal = Number(freightCharge) + extraChargesTotal;
    const discountedSubtotal = Math.max(0, subtotal - Number(discount));
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    
    if (gstOption !== 'NONE' && Number(gstPercentage) > 0) {
      const gstAmount = (discountedSubtotal * Number(gstPercentage)) / 100;
      if (gstOption === 'CGST_SGST') {
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
      } else if (gstOption === 'IGST') {
        igst = gstAmount;
      }
    }
    
    const rawTotal = discountedSubtotal + cgst + sgst + igst;
    const roundOff = Math.round(rawTotal) - rawTotal;
    const grandTotal = Math.round(rawTotal);
    const balanceAmount = Math.max(0, grandTotal - Number(paidAmount));

    setValue('subtotal', subtotal);
    setValue('discountedSubtotal', discountedSubtotal);
    setValue('cgstAmount', cgst);
    setValue('sgstAmount', sgst);
    setValue('igstAmount', igst);
    setValue('roundOff', roundOff);
    setValue('grandTotal', grandTotal);
    setValue('balanceAmount', balanceAmount);
    
  }, [freightCharge, extraCharges, discount, gstOption, gstPercentage, paidAmount, setValue]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load customers
        const cKeys = await db.customers.keys();
        const cList: Customer[] = [];
        for (const key of cKeys) {
          const c = await db.customers.getItem<Customer>(key);
          if (c) cList.push(c);
        }
        setCustomers(cList.sort((a, b) => b.createdAt - a.createdAt));

        // Load settings and generate invoice number
        const settings = await db.settings.getItem<AppSettings>('appSettings');
        if (settings) {
          setAppSettings(settings);
          setValue('gstPercentage', settings.defaultGstPercentage);
          if (id) {
            const existingInvoice = await db.invoices.getItem<Invoice>(id);
            if (existingInvoice) {
              reset(existingInvoice);
            }
          } else {
            // Auto generate invoice number based on prefix and max number
            const iKeys = await db.invoices.keys();
            let maxNumber = 0;
            for (const key of iKeys) {
              const inv = await db.invoices.getItem<Invoice>(key);
              if (inv && inv.invoiceNumber) {
                const match = inv.invoiceNumber.match(/\d+$/);
                if (match) {
                  const num = parseInt(match[0], 10);
                  if (num > maxNumber) maxNumber = num;
                }
              }
            }
            const nextNumber = maxNumber + 1;
            const prefix = (settings.invoicePrefix || 'INV-YYYY-').replace('YYYY', new Date().getFullYear().toString());
            setValue('invoiceNumber', `${prefix}${nextNumber.toString().padStart(3, '0')}`);
          }
        }
      } catch (error) {
        console.error('Failed to load initial data', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setValue]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSaving]);

  const formatDateForInput = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleDateChange = (field: 'invoiceDate' | 'dueDate', value: string) => {
    setValue(field, new Date(value).getTime());
  };

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    data.updatedAt = Date.now();
    try {
      await db.invoices.setItem(data.id, data);
      navigate(`/invoice/${data.id}`);
    } catch (error) {
      console.error('Failed to save invoice', error);
      alert('Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  // Live calculated values to display
  const dSubtotal = useWatch({ control, name: 'subtotal' });
  const dGrandTotal = useWatch({ control, name: 'grandTotal' });
  const dBalance = useWatch({ control, name: 'balanceAmount' });
  const dCgst = useWatch({ control, name: 'cgstAmount' });
  const dSgst = useWatch({ control, name: 'sgstAmount' });
  const dIgst = useWatch({ control, name: 'igstAmount' });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 w-full pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {id ? 'Edit Invoice' : 'Create Invoice'}
          </h2>
          <p className="text-muted-foreground">{id ? 'Update your transport invoice.' : 'Generate a new transport invoice.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Invoice Basic Details */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Invoice Details</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input id="invoiceNumber" {...register('invoiceNumber')} />
              {errors.invoiceNumber && <p className="text-sm text-destructive">{String(errors.invoiceNumber.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input 
                id="invoiceDate" 
                type="date" 
                value={formatDateForInput(invoiceDate)}
                onChange={(e) => handleDateChange('invoiceDate', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input 
                id="dueDate" 
                type="date" 
                value={formatDateForInput(dueDate)}
                onChange={(e) => handleDateChange('dueDate', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('status')}
              >
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="customerId">Select Customer *</Label>
                {customers.length === 0 && (
                  <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate('/customers')}>
                    + Add New Customer
                  </Button>
                )}
              </div>
              <select
                id="customerId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('customerId')}
              >
                <option value="">-- Select a Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.customerName})` : c.customerName}
                  </option>
                ))}
              </select>
              {errors.customerId && <p className="text-sm text-destructive">{String(errors.customerId.message)}</p>}
              {customers.length === 0 && (
                <p className="text-sm text-muted-foreground text-amber-600">You must create a customer before generating an invoice.</p>
              )}
            </div>
          </div>
        </div>

        {/* Transport Details */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Transport Details</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fromLocation">From Location *</Label>
              <Input id="fromLocation" {...register('fromLocation')} />
              {errors.fromLocation && <p className="text-sm text-destructive">{String(errors.fromLocation.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="toLocation">To Location *</Label>
              <Input id="toLocation" {...register('toLocation')} />
              {errors.toLocation && <p className="text-sm text-destructive">{String(errors.toLocation.message)}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceKm">Distance (KM)</Label>
              <Input id="distanceKm" type="number" {...register('distanceKm', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input id="vehicleNumber" {...register('vehicleNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input id="driverName" {...register('driverName')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverPhone">Driver Phone</Label>
              <Input id="driverPhone" {...register('driverPhone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lrNumber">LR / Bilty Number</Label>
              <Input id="lrNumber" {...register('lrNumber')} />
            </div>
          </div>
        </div>

        {/* Consignment Details */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Consignment Details</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="goodsDescription">Goods Description</Label>
              <Textarea id="goodsDescription" rows={3} placeholder="Enter details about the goods being transported..." {...register('goodsDescription')} />
            </div>
            <div className="space-y-2 flex gap-2">
              <div className="flex-1">
                <Label htmlFor="weight">Weight</Label>
                <Input id="weight" type="number" step="0.01" {...register('weight', { valueAsNumber: true })} />
              </div>
              <div className="w-24">
                <Label htmlFor="weightUnit">Unit</Label>
                <select id="weightUnit" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register('weightUnit')}>
                  <option value="KG">KG</option>
                  <option value="TON">TON</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numberOfPackages">Number of Packages</Label>
              <Input id="numberOfPackages" type="number" {...register('numberOfPackages', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="remarks">Remarks / Notes</Label>
              <Textarea id="remarks" rows={4} placeholder="Any additional notes or terms for this consignment..." {...register('remarks')} />
            </div>
          </div>
        </div>

        {/* Charges and Calculation */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Charges & Totals
            </h3>
          </div>
          
          <div className="p-6 grid gap-6 md:grid-cols-12">
            {/* Left side: Input charges */}
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="freightCharge" className="text-base">Base Freight Charge ({appSettings?.currencySymbol}) *</Label>
                <Input id="freightCharge" type="number" step="0.01" className="text-lg font-medium" {...register('freightCharge', { valueAsNumber: true })} />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Extra Charges</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendCharge({ id: generateId(), name: '', amount: 0 })}>
                    <Plus className="h-4 w-4 mr-1" /> Add Charge
                  </Button>
                </div>
                {extraChargeFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input placeholder="Charge name (e.g., Loading)" {...register(`extraCharges.${index}.name`)} />
                    </div>
                    <div className="w-32">
                      <Input type="number" step="0.01" placeholder="Amount" {...register(`extraCharges.${index}.amount`, { valueAsNumber: true })} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeCharge(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount Amount</Label>
                  <Input id="discount" type="number" step="0.01" {...register('discount', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Advance / Paid Amount</Label>
                  <Input id="paidAmount" type="number" step="0.01" {...register('paidAmount', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="gstOption">GST Type</Label>
                  <select id="gstOption" className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm" {...register('gstOption')}>
                    <option value="NONE">No GST</option>
                    <option value="CGST_SGST">CGST + SGST (Same State)</option>
                    <option value="IGST">IGST (Inter-State)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
                  <Input id="gstPercentage" type="number" step="0.1" disabled={gstOption === 'NONE'} {...register('gstPercentage', { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            {/* Right side: Live Summary */}
            <div className="md:col-span-5 bg-slate-50 p-6 rounded-lg border flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-semibold border-b pb-2">Summary</h4>
                
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{appSettings?.currencySymbol}{dSubtotal?.toFixed(2)}</span>
                </div>
                
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>-{appSettings?.currencySymbol}{Number(discount).toFixed(2)}</span>
                  </div>
                )}
                
                {gstOption === 'CGST_SGST' && (
                  <>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>CGST ({(Number(gstPercentage)/2).toFixed(1)}%)</span>
                      <span>{appSettings?.currencySymbol}{dCgst?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>SGST ({(Number(gstPercentage)/2).toFixed(1)}%)</span>
                      <span>{appSettings?.currencySymbol}{dSgst?.toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                {gstOption === 'IGST' && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>IGST ({gstPercentage}%)</span>
                    <span>{appSettings?.currencySymbol}{dIgst?.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">Grand Total</span>
                    <span className="font-bold text-2xl text-primary">{appSettings?.currencySymbol}{dGrandTotal?.toFixed(2)}</span>
                  </div>
                  
                  {Number(paidAmount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 mt-2">
                      <span>Paid Amount</span>
                      <span>-{appSettings?.currencySymbol}{Number(paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-dashed">
                    <span className="font-medium text-slate-700">Balance Due</span>
                    <span className="font-bold text-xl text-amber-600">{appSettings?.currencySymbol}{dBalance?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-4">
                <Button type="submit" className="w-full text-lg h-12" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
