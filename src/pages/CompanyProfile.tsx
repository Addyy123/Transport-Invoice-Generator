import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Save, Loader2, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/db';
import { companySchema, type CompanyProfile } from '../lib/schema';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function CompanyProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [currentId, setCurrentId] = useState<string>('profile');

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CompanyProfile>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: '',
      logo: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      phone: '',
      email: '',
      website: '',
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      termsAndConditions: '',
      authorizedSignature: '',
    },
  });

  const logoUrl = useWatch({ control, name: 'logo' });
  // Bug #24: Watch the signature field so preview updates
  const signatureUrl = useWatch({ control, name: 'authorizedSignature' });

  const loadProfiles = async () => {
    try {
      const keys = await db.company.keys();
      const loaded: CompanyProfile[] = [];
      for (const key of keys) {
        const item = await db.company.getItem<CompanyProfile>(key);
        if (item) loaded.push({ ...item, id: item.id || key });
      }
      if (loaded.length === 0) {
        const def: CompanyProfile = {
          id: 'profile',
          companyName: '',
          logo: '',
          gstNumber: '',
          panNumber: '',
          address: '',
          city: '',
          state: '',
          pinCode: '',
          phone: '',
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
        loaded.push(def);
      }
      setCompanies(loaded);
      const active = loaded.find((c) => (c.id || 'profile') === currentId) || loaded[0];
      setCurrentId(active.id || 'profile');
      reset(active);
    } catch (error) {
      console.error('Failed to load company profiles', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [reset]);

  const onSubmit = async (data: CompanyProfile) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const targetId = data.id || currentId || 'profile';
      const toSave = { ...data, id: targetId };
      await db.company.setItem(targetId, toSave);
      setSaveSuccess(true);
      toast.success('Company profile saved successfully!');
      setTimeout(() => setSaveSuccess(false), 3000);
      reset(toSave);
      await loadProfiles();
    } catch (error) {
      console.error('Failed to save company profile', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCompany = () => {
    const newId = `comp_${Date.now()}`;
    const newComp: CompanyProfile = {
      id: newId,
      companyName: `New Company ${companies.length + 1}`,
      logo: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      phone: '',
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
    setCompanies([...companies, newComp]);
    setCurrentId(newId);
    reset(newComp);
  };

  const handleDeleteCompany = async (idToDelete: string) => {
    if (idToDelete === 'profile' && companies.length === 1) {
      toast.error('Cannot delete the only company profile.');
      return;
    }
    if (confirm('Are you sure you want to delete this company profile?')) {
      await db.company.removeItem(idToDelete);
      toast.success('Company deleted');
      setCurrentId('profile');
      await loadProfiles();
    }
  };

  // Bug #25: Use a ref so the Ctrl+S listener always calls the latest onSubmit
  const onSubmitRef = useRef<typeof onSubmit | null>(null);
  useEffect(() => { onSubmitRef.current = onSubmit; });

  useEffect(() => {
    const handleSave = () => {
      if (isDirty && !isSaving) {
        handleSubmit((data) => onSubmitRef.current?.(data))();
      }
    };
    window.addEventListener('app:save', handleSave);
    return () => window.removeEventListener('app:save', handleSave);
  }, [isDirty, isSaving, handleSubmit]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('Logo size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setValue('logo', event.target?.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  // Bug #24: Handler for authorized signature image upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 512 * 1024) {
        toast.error('Signature image must be less than 512KB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setValue('authorizedSignature', event.target?.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Company Profile
        </h2>
        <p className="text-muted-foreground">
          Manage your transport business information. This data will be used on your invoices.
        </p>
      </div>

      {/* Multi-company switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 px-2">Select Company:</span>
          {companies.map((c) => {
            const cid = c.id || 'profile';
            const isSelected = cid === currentId;
            return (
              <button
                key={cid}
                type="button"
                onClick={() => {
                  setCurrentId(cid);
                  reset(c);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {c.companyName || (cid === 'profile' ? 'Default Company' : 'Unnamed Company')}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {currentId !== 'profile' && companies.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteCompany(currentId)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCompany}
            className="bg-white hover:bg-slate-50 text-primary border-primary/30 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Another Company
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">General Information</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logo">Company Logo (Max 1MB)</Label>
              <div className="flex items-center gap-4">
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="w-full max-w-sm" />
                {logoUrl && <img src={logoUrl} alt="Logo preview" className="h-12 object-contain bg-slate-50 border rounded-md p-1" />}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" placeholder="e.g. Acme Transports" {...register('companyName')} />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input id="gstNumber" placeholder="e.g. 27AADCB2230M1Z2" {...register('gstNumber')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input id="panNumber" placeholder="e.g. AADCB2230M" {...register('panNumber')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="e.g. +91 9876543210" {...register('phone')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="e.g. info@acme.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="e.g. https://www.acme.com" {...register('website')} />
              {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Address Details</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" placeholder="e.g. 123 Transport Nagar" {...register('address')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="e.g. Mumbai" {...register('city')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="e.g. Maharashtra" {...register('state')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinCode">PIN Code</Label>
              <Input id="pinCode" placeholder="e.g. 400001" {...register('pinCode')} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Bank Details</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" placeholder="e.g. HDFC Bank" {...register('bankName')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountHolder">Account Holder Name</Label>
              <Input id="accountHolder" placeholder="e.g. Acme Transports" {...register('accountHolder')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" placeholder="e.g. 50100234567890" {...register('accountNumber')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifscCode">IFSC Code</Label>
              <Input id="ifscCode" placeholder="e.g. HDFC0001234" {...register('ifscCode')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input id="upiId" placeholder="e.g. acme@upi" {...register('upiId')} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Terms &amp; Conditions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Default Terms &amp; Conditions</Label>
              <textarea
                id="termsAndConditions"
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={"e.g. 1. Payment is due within 15 days.\n2. Goods once sold will not be taken back."}
                {...register('termsAndConditions')}
              />
            </div>
          </div>
        </div>

        {/* Bug #24: Authorized Signature upload — was defined in schema but never exposed in UI */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Authorized Signature</h3>
          </div>
          <div className="p-6 space-y-3">
            <Label htmlFor="authorizedSignature">Upload Signature Image (Max 512KB)</Label>
            <p className="text-xs text-muted-foreground">This signature image will appear on printed invoices.</p>
            <div className="flex items-center gap-4">
              <Input
                id="authorizedSignature"
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="w-full max-w-sm"
              />
              {signatureUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={signatureUrl}
                    alt="Signature preview"
                    className="h-14 object-contain bg-slate-50 border rounded-md p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setValue('authorizedSignature', '', { shouldDirty: true })}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4">
          {saveSuccess && (
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Saved successfully
            </span>
          )}
          <Button type="submit" disabled={isSaving || !isDirty}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
