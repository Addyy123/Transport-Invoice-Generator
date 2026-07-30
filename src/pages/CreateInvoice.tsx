import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Save, Plus, Trash2, Calculator, Loader2, History, RotateCcw, Truck, Package, ArrowRight, ArrowLeft, Check, Layers, LayoutList } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/db';
import { invoiceSchema, type Invoice, type Customer, type CompanyProfile, type Settings as AppSettings } from '../lib/schema';
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
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewMode, setViewMode] = useState<'wizard' | 'all'>('wizard');
  const [companyVehicles, setCompanyVehicles] = useState<Record<string, string[]>>({});
  
  const [isQuickCompanyOpen, setIsQuickCompanyOpen] = useState(false);
  const [quickCompanyData, setQuickCompanyData] = useState({ companyName: '', gstNumber: '', city: '', phone: '' });
  
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [quickClientData, setQuickClientData] = useState({ customerName: '', companyName: '', gstNumber: '', city: '', phone: '' });

  // Bug #9: Typed properly using z.input to match the resolver's expected form value type
  const { register, control, handleSubmit, setValue, reset, trigger, formState: { errors, isDirty } } = useForm<z.input<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      id: generateId(),
      invoiceNumber: '',
      invoiceDate: Date.now(),
      dueDate: Date.now() + 15 * 24 * 60 * 60 * 1000,
      status: 'Draft',
      customerId: '',
      companyId: 'profile',
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
  const selectedCompanyId = useWatch({ control, name: 'companyId' });
  const freightCharge = useWatch({ control, name: 'freightCharge' }) || 0;
  const extraCharges = useWatch({ control, name: 'extraCharges' }) || [];
  const discount = useWatch({ control, name: 'discount' }) || 0;
  const gstOption = useWatch({ control, name: 'gstOption' });
  const gstPercentage = useWatch({ control, name: 'gstPercentage' }) || 0;
  const paidAmount = useWatch({ control, name: 'paidAmount' }) || 0;
  
  const invoiceDate = useWatch({ control, name: 'invoiceDate' });
  const dueDate = useWatch({ control, name: 'dueDate' });

  // Monthly KM Billing watches
  const billingType = useWatch({ control, name: 'billingType' });
  const startKm = useWatch({ control, name: 'startKm' }) || 0;
  const endKm = useWatch({ control, name: 'endKm' }) || 0;
  const baseKm = useWatch({ control, name: 'baseKm' }) || 0;
  const baseRate = useWatch({ control, name: 'baseRate' }) || 0;
  const extraKmRate = useWatch({ control, name: 'extraKmRate' }) || 0;
  const periodStart = useWatch({ control, name: 'periodStart' });
  const periodEnd = useWatch({ control, name: 'periodEnd' });

  // Auto-calculation logic
  useEffect(() => {
    let currentFreightCharge = Number(freightCharge);

    if (billingType === 'MONTHLY_KM') {
      const chargeableKm = Math.max(0, Number(endKm) - Number(startKm));
      const baseAmount = Number(baseKm) * Number(baseRate);
      const extraKm = Math.max(0, chargeableKm - Number(baseKm));
      const extraAmount = extraKm * Number(extraKmRate);
      currentFreightCharge = baseAmount + extraAmount;
      // We don't setValue('freightCharge') here to avoid dependency loops, 
      // instead we just use the calculated value for subtotal. We'll set freightCharge on submit or let the user see the subtotal.
      // Wait, actually setting freightCharge is fine if we don't include it in the dependency array for this specific calculation.
      // But to be safe, we'll just calculate subtotal directly.
    }

    const extraChargesTotal = extraCharges.reduce((sum: number, charge: any) => sum + (Number(charge.amount) || 0), 0);
    const subtotal = currentFreightCharge + extraChargesTotal;
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
    
    if (billingType === 'MONTHLY_KM' && currentFreightCharge !== Number(freightCharge)) {
      setValue('freightCharge', currentFreightCharge);
    }
    
  }, [freightCharge, extraCharges, discount, gstOption, gstPercentage, paidAmount, billingType, startKm, endKm, baseKm, baseRate, extraKmRate, setValue]);

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

        // Load companies
        const compKeys = await db.company.keys();
        const compList: CompanyProfile[] = [];
        for (const key of compKeys) {
          const c = await db.company.getItem<CompanyProfile>(key);
          if (c) compList.push({ ...c, id: c.id || key });
        }
        if (compList.length === 0) {
          const def = await db.company.getItem<CompanyProfile>('profile');
          if (def) compList.push({ ...def, id: 'profile' });
        }
        if (compList.length === 0) {
          compList.push({ id: 'profile', companyName: 'Default Transport Co' } as any);
        }
        setCompanies(compList);
        if (!id) {
          setValue('companyId', compList[0].id || 'profile');
        }

        // Load settings and generate invoice number
        const settings = await db.settings.getItem<AppSettings>('appSettings');
        if (settings) {
          setAppSettings(settings);
        }

        // Convert company vehicles for state
        const convertedVehiclesMap: Record<string, string[]> = {};
        for (const comp of compList) {
          convertedVehiclesMap[comp.id || 'profile'] = comp.vehicles || [];
        }
        setCompanyVehicles(convertedVehiclesMap);

        if (id) {
          const existingInvoice = await db.invoices.getItem<Invoice>(id);
          if (existingInvoice) {
            reset(existingInvoice);
          }
        } else {
          if (settings) {
            setValue('gstPercentage', settings.defaultGstPercentage);
          }
          
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
          const prefix = (settings?.invoicePrefix || 'INV-YYYY-').replace('YYYY', new Date().getFullYear().toString());
          setValue('invoiceNumber', `${prefix}${nextNumber.toString().padStart(3, '0')}`);

          // Bug #23: Removed duplicate toast — the hasDraft banner (below) already shows restore/discard UI
          const savedDraft = localStorage.getItem('invoice_form_draft');
          if (savedDraft) {
            try {
              const parsedDraft = JSON.parse(savedDraft);
              if (parsedDraft && typeof parsedDraft === 'object' && Object.keys(parsedDraft).length > 0) {
                setHasDraft(true);
              }
            } catch (e) {
              console.error('Failed to parse saved draft', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load initial data', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setValue, id, reset]);

  const allValues = useWatch({ control });

  // Auto-save draft to localStorage periodically when dirty
  useEffect(() => {
    if (!id && isDirty && !isSaving && !isLoading && allValues) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem('invoice_form_draft', JSON.stringify(allValues));
        } catch (e) {
          console.error('Failed to auto-save draft', e);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allValues, isDirty, isSaving, isLoading, id]);

  // Bug #2/#22: Use a ref so the Ctrl+S listener always calls the latest onSubmit
  const onSubmitRef = useRef<typeof onSubmit | null>(null);
  useEffect(() => { onSubmitRef.current = onSubmit; });

  // Listen for Ctrl+S global save event
  useEffect(() => {
    const handleSave = () => {
      if (isDirty && !isSaving) {
        handleSubmit((data) => onSubmitRef.current?.(data))();
      }
    };
    window.addEventListener('app:save', handleSave);
    return () => window.removeEventListener('app:save', handleSave);
  }, [isDirty, isSaving, handleSubmit]);

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

  const handleSaveQuickCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCompanyData.companyName.trim()) {
      toast.error('Company Name is required');
      return;
    }
    try {
      const newId = companies.filter(c => c.companyName).length === 0 ? 'profile' : `comp_${Date.now()}`;
      const newComp: CompanyProfile = {
        id: newId,
        companyName: quickCompanyData.companyName.trim(),
        gstNumber: quickCompanyData.gstNumber.trim(),
        city: quickCompanyData.city.trim(),
        phone: quickCompanyData.phone.trim(),
        logo: '',
        panNumber: '',
        address: '',
        state: '',
        pinCode: '',
        email: '',
        website: '',
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        termsAndConditions: '',
        authorizedSignature: '',
      };
      await db.company.setItem(newId, newComp);
      setCompanies((prev) => [newComp, ...prev.filter(c => (c.id || 'profile') !== newId)]);
      setValue('companyId', newId);
      setIsQuickCompanyOpen(false);
      setQuickCompanyData({ companyName: '', gstNumber: '', city: '', phone: '' });
      toast.success('Company profile saved & selected!');
    } catch (err) {
      toast.error('Failed to save company profile');
    }
  };

  const handleSaveQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientData.customerName.trim()) {
      toast.error('Client Name is required');
      return;
    }
    try {
      const newCust: Customer = {
        id: generateId(),
        customerName: quickClientData.customerName.trim(),
        companyName: quickClientData.companyName.trim() || quickClientData.customerName.trim(),
        gstNumber: quickClientData.gstNumber.trim(),
        city: quickClientData.city.trim(),
        phone: quickClientData.phone.trim(),
        billingAddress: '',
        shippingAddress: '',
        state: '',
        pinCode: '',
        email: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.customers.setItem(newCust.id, newCust);
      setCustomers((prev) => [newCust, ...prev]);
      setValue('customerId', newCust.id);
      setIsQuickClientOpen(false);
      setQuickClientData({ customerName: '', companyName: '', gstNumber: '', city: '', phone: '' });
      toast.success('Client saved & selected!');
    } catch (err) {
      toast.error('Failed to save client');
    }
  };

  const formatDateForInput = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const handleDateChange = (field: 'invoiceDate' | 'dueDate' | 'periodStart' | 'periodEnd', value: string) => {
    // Parse as local midnight, not UTC midnight (avoids off-by-one day in IST)
    if (value) {
      setValue(field as any, new Date(value + 'T00:00:00').getTime());
    } else {
      setValue(field as any, undefined);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    data.updatedAt = Date.now();
    try {
      await db.invoices.setItem(data.id, data);
      if (!id) {
        localStorage.removeItem('invoice_form_draft');
        setHasDraft(false);
      }
      toast.success(id ? 'Invoice updated successfully!' : 'Invoice generated successfully!');
      navigate(`/invoice/${data.id}`);
    } catch (error) {
      console.error('Failed to save invoice', error);
      toast.error('Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const onError = (errors: any) => {
    if (errors.invoiceNumber || errors.customerId) {
      setCurrentStep(1);
      toast.error('Please check Step 1: Invoice Details (Required fields missing)');
    } else if (errors.fromLocation || errors.toLocation) {
      setCurrentStep(2);
      toast.error('Please check Step 2: Transport Details (Required fields missing)');
    } else {
      const errorMessages = Object.keys(errors).map(key => `${key}: ${errors[key].message}`).join(', ');
      toast.error(`Please check the form for errors: ${errorMessages}`);
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
      {/* View Mode & Stepper Header */}
      <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {id ? 'Edit Invoice' : 'Create Invoice'}
            </h2>
            <p className="text-sm text-muted-foreground">{id ? 'Update your transport invoice section by section.' : 'Generate a new transport invoice section by section.'}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('wizard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'wizard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Layers className="h-3.5 w-3.5" /> Step-by-Step
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <LayoutList className="h-3.5 w-3.5" /> View All
            </button>
          </div>
        </div>

        {viewMode === 'wizard' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {[
              { step: 1, title: 'Invoice Details', icon: FileText, desc: 'Basic info & customer' },
              { step: 2, title: 'Transport Details', icon: Truck, desc: 'Route & vehicle' },
              { step: 3, title: 'Consignment', icon: Package, desc: 'Goods & weight' },
              { step: 4, title: 'Charges & Totals', icon: Calculator, desc: 'Freight & taxes' },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isPassed = currentStep > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    setCurrentStep(item.step);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all border ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                      : isPassed
                      ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                      : 'border-border hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isPassed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPassed ? <Check className="h-4 w-4" /> : item.step}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : isPassed ? 'text-emerald-950' : 'text-slate-700'}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hasDraft && !id && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full text-amber-700">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Unsaved Draft Available</p>
              <p className="text-xs text-amber-700">You have an unsaved invoice draft from a previous session. Would you like to restore it?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
              onClick={() => {
                try {
                  const draft = JSON.parse(localStorage.getItem('invoice_form_draft') || '{}');
                  reset(draft);
                  setHasDraft(false);
                  toast.success('Draft restored successfully!');
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Restore Draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:bg-amber-100"
              onClick={() => {
                localStorage.removeItem('invoice_form_draft');
                setHasDraft(false);
                toast.info('Draft discarded.');
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
        {/* Invoice Basic Details */}
        {(viewMode === 'all' || currentStep === 1) && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm animate-in fade-in-50 duration-200">
            <div className="p-6 border-b border-border bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {viewMode === 'wizard' ? 'Step 1: Invoice Details' : 'Invoice Details'}
              </h3>
              {viewMode === 'wizard' && <span className="text-xs text-muted-foreground font-semibold">Step 1 of 4</span>}
            </div>
            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
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
                  <option value="Cancelled">Cancelled</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="companyId" className="font-bold text-slate-800">From Company (Biller)</Label>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-primary font-bold" onClick={() => setIsQuickCompanyOpen(true)}>
                    + Quick Save Company
                  </Button>
                </div>
                <select
                  id="companyId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-medium text-slate-900"
                  {...register('companyId')}
                >
                  {companies.filter(c => c.companyName).length === 0 && <option value="profile">-- No Company Saved Yet (Click + Quick Save Above) --</option>}
                  {companies.map((comp) => (
                    <option key={comp.id || 'profile'} value={comp.id || 'profile'}>
                      {comp.companyName ? `${comp.companyName}${comp.city ? ` (${comp.city})` : ''}` : 'Default Company'}
                    </option>
                  ))}
                </select>
                {companies.filter(c => c.companyName).length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">⚠️ No company profile saved yet. Click "+ Quick Save Company" above to save one!</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="customerId" className="font-bold text-slate-800">To Client (Customer)</Label>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-primary font-bold" onClick={() => setIsQuickClientOpen(true)}>
                    + Quick Save Client
                  </Button>
                </div>
                <select
                  id="customerId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium text-slate-900"
                  {...register('customerId')}
                  onChange={(e) => {
                    // Bug #8: Removed dead code referencing non-existent defaultPaymentTerms field
                    register('customerId').onChange(e);
                  }}
                >
                  <option value="">-- Select Customer / Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.companyName} (${c.customerName})` : c.customerName}
                    </option>
                  ))}
                </select>
                {errors.customerId && <p className="text-sm text-destructive">{String(errors.customerId.message)}</p>}
                {customers.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">⚠️ No client saved yet. Click "+ Quick Save Client" above to save one!</p>
                )}
              </div>
            </div>
            {viewMode === 'wizard' && (
              <div className="p-4 sm:p-6 bg-slate-50/50 border-t flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    const valid = await trigger(['invoiceNumber', 'customerId']);
                    if (!valid) {
                      toast.error('Please fill required fields (Invoice Number & Customer)');
                      return;
                    }
                    setCurrentStep(2);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="gap-2 px-6 shadow-sm"
                >
                  Next: Transport Details <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Transport Details */}
        {(viewMode === 'all' || currentStep === 2) && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm animate-in fade-in-50 duration-200">
            <div className="p-6 border-b border-border bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                {viewMode === 'wizard' ? 'Step 2: Transport Details' : 'Transport Details'}
              </h3>
              {viewMode === 'wizard' && <span className="text-xs text-muted-foreground font-semibold">Step 2 of 4</span>}
            </div>
            {/* Bug #1: Fixed JSX indentation — content div is now correctly inside the outer card div */}
            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fromLocation">From Location</Label>
                <Input id="fromLocation" {...register('fromLocation')} />
                {errors.fromLocation && <p className="text-sm text-destructive">{String(errors.fromLocation.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="toLocation">To Location</Label>
                <Input id="toLocation" {...register('toLocation')} />
                {errors.toLocation && <p className="text-sm text-destructive">{String(errors.toLocation.message)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceKm">Distance (KM)</Label>
                <Input id="distanceKm" type="number" {...register('distanceKm', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input id="vehicleNumber" list="vehicleList" autoComplete="off" {...register('vehicleNumber')} />
                <datalist id="vehicleList">
                  {(companyVehicles[selectedCompanyId || 'profile'] || []).map(v => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
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
            {viewMode === 'wizard' && (
              <div className="p-4 sm:p-6 bg-slate-50/50 border-t flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="gap-2 shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous: Invoice Details
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    const valid = await trigger(['fromLocation', 'toLocation']);
                    if (!valid) {
                      toast.error('Please fill required fields (From & To Location)');
                      return;
                    }
                    setCurrentStep(3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="gap-2 px-6 shadow-sm"
                >
                  Next: Consignment Details <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

      {/* Consignment Details */}
      {(viewMode === 'all' || currentStep === 3) && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm animate-in fade-in-50 duration-200">
          <div className="p-6 border-b border-border bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {viewMode === 'wizard' ? 'Step 3: Consignment Details' : 'Consignment Details'}
            </h3>
            {viewMode === 'wizard' && <span className="text-xs text-muted-foreground font-semibold">Step 3 of 4</span>}
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
          {viewMode === 'wizard' && (
            <div className="p-4 sm:p-6 bg-slate-50/50 border-t flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="gap-2 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Previous: Transport Details
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setCurrentStep(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="gap-2 px-6 shadow-sm"
              >
                Next: Charges & Totals <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Charges and Calculation */}
      {(viewMode === 'all' || currentStep === 4) && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
          <div className="p-6 border-b border-border bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {viewMode === 'wizard' ? 'Step 4: Charges & Totals' : 'Charges & Totals'}
            </h3>
            {viewMode === 'wizard' && <span className="text-xs text-muted-foreground font-semibold">Step 4 of 4</span>}
          </div>
          
          <div className="p-6 grid gap-6 md:grid-cols-12">
            {/* Left side: Input charges */}
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-4 mb-6 border p-4 rounded-lg bg-slate-50/50">
                <div className="space-y-2">
                  <Label htmlFor="billingType" className="font-bold">Billing Mode</Label>
                  <select id="billingType" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm" {...register('billingType')}>
                    <option value="STANDARD">Standard Billing (Manual Freight)</option>
                    <option value="MONTHLY_KM">Monthly KM Contract</option>
                  </select>
                </div>

                {billingType === 'MONTHLY_KM' && (
                  <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in zoom-in-95">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <Label>Vehicle Capacity (e.g. Up to 8 Ton)</Label>
                      <Input {...register('vehicleCapacity')} placeholder="Up to 8 Ton" />
                    </div>
                    <div className="space-y-2">
                      <Label>Period Start Date</Label>
                      <Input type="date" value={formatDateForInput(periodStart)} onChange={(e) => handleDateChange('periodStart' as any, e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End Date</Label>
                      <Input type="date" value={formatDateForInput(periodEnd)} onChange={(e) => handleDateChange('periodEnd' as any, e.target.value)} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Start KM Reading</Label>
                      <Input type="number" {...register('startKm', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>End KM Reading</Label>
                      <Input type="number" {...register('endKm', { valueAsNumber: true })} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Base KM Limit</Label>
                      <Input type="number" {...register('baseKm', { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Base Rate (Per KM)</Label>
                      <Input type="number" step="0.01" {...register('baseRate', { valueAsNumber: true })} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Extra KM Rate</Label>
                      <Input type="number" step="0.01" {...register('extraKmRate', { valueAsNumber: true })} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="freightCharge" className="text-base">Base Freight Charge ({appSettings?.currencySymbol}) {billingType === 'MONTHLY_KM' ? '(Auto-calculated)' : ''}</Label>
                <Input id="freightCharge" type="number" step="0.01" className="text-lg font-medium" disabled={billingType === 'MONTHLY_KM'} {...register('freightCharge', { valueAsNumber: true })} />
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
                  <span className="font-medium">{appSettings?.currencySymbol}{(Number(dSubtotal) || 0).toFixed(2)}</span>
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
                      <span>{appSettings?.currencySymbol}{(Number(dCgst) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>SGST ({(Number(gstPercentage)/2).toFixed(1)}%)</span>
                      <span>{appSettings?.currencySymbol}{(Number(dSgst) || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                {gstOption === 'IGST' && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>IGST ({Number(gstPercentage)}%)</span>
                    <span>{appSettings?.currencySymbol}{(Number(dIgst) || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">Grand Total</span>
                    <span className="font-bold text-2xl text-primary">{appSettings?.currencySymbol}{(Number(dGrandTotal) || 0).toFixed(2)}</span>
                  </div>
                  
                  {Number(paidAmount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 mt-2">
                      <span>Paid Amount</span>
                      <span>-{appSettings?.currencySymbol}{Number(paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-dashed">
                    <span className="font-medium text-slate-700">Balance Due</span>
                    <span className="font-bold text-xl text-amber-600">{appSettings?.currencySymbol}{(Number(dBalance) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50/50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            {viewMode === 'wizard' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="gap-2 w-full sm:w-auto order-2 sm:order-1 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Previous: Consignment Details
              </Button>
            ) : <div className="hidden sm:block" />}
            <Button type="submit" className="w-full sm:w-64 text-lg h-12 gap-2 order-1 sm:order-2 shadow-md" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              Save Invoice
            </Button>
          </div>
        </div>
      )}
      {/* Quick Add Company Modal */}
      {isQuickCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
          <div className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border animate-in zoom-in-95 text-card-foreground">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="font-bold text-lg text-slate-900">Quick Save Company Profile</h3>
              <button type="button" onClick={() => setIsQuickCompanyOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label htmlFor="qc-name">Company Name</Label>
                <Input id="qc-name" placeholder="e.g. Alex Logistics Pvt Ltd" value={quickCompanyData.companyName} onChange={(e) => setQuickCompanyData({ ...quickCompanyData, companyName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="qc-gst">GSTIN</Label>
                  <Input id="qc-gst" placeholder="27AADCB..." value={quickCompanyData.gstNumber} onChange={(e) => setQuickCompanyData({ ...quickCompanyData, gstNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qc-city">City</Label>
                  <Input id="qc-city" placeholder="Mumbai" value={quickCompanyData.city} onChange={(e) => setQuickCompanyData({ ...quickCompanyData, city: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="qc-phone">Phone Number</Label>
                <Input id="qc-phone" placeholder="+91 9876543210" value={quickCompanyData.phone} onChange={(e) => setQuickCompanyData({ ...quickCompanyData, phone: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsQuickCompanyOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleSaveQuickCompany} className="gap-1 bg-primary text-primary-foreground"><Save className="w-4 h-4" /> Save & Select</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Client Modal */}
      {isQuickClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in-50">
          <div className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border animate-in zoom-in-95 text-card-foreground">
            <div className="flex justify-between items-center pb-4 border-b">
              <h3 className="font-bold text-lg text-slate-900">Quick Save Client (Customer)</h3>
              <button type="button" onClick={() => setIsQuickClientOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label htmlFor="qcl-name">Client Name (or Company)</Label>
                <Input id="qcl-name" placeholder="e.g. Reliance Retail Ltd" value={quickClientData.customerName} onChange={(e) => setQuickClientData({ ...quickClientData, customerName: e.target.value, companyName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="qcl-gst">GSTIN</Label>
                  <Input id="qcl-gst" placeholder="27AAACR..." value={quickClientData.gstNumber} onChange={(e) => setQuickClientData({ ...quickClientData, gstNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qcl-city">City</Label>
                  <Input id="qcl-city" placeholder="Pune" value={quickClientData.city} onChange={(e) => setQuickClientData({ ...quickClientData, city: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="qcl-phone">Phone Number</Label>
                <Input id="qcl-phone" placeholder="+91 9876543210" value={quickClientData.phone} onChange={(e) => setQuickClientData({ ...quickClientData, phone: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsQuickClientOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleSaveQuickClient} className="gap-1 bg-primary text-primary-foreground"><Save className="w-4 h-4" /> Save & Select</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </form>
    </div>
  );
}
