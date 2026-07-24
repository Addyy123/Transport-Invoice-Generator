import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/db';
import { companySchema, type CompanyProfile } from '../lib/schema';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function CompanyProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    }
  });

  const logoUrl = useWatch({ control, name: 'logo' });

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await db.company.getItem<CompanyProfile>('profile');
        if (data) {
          reset(data);
        }
      } catch (error) {
        console.error('Failed to load company profile', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [reset]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Logo size must be less than 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setValue('logo', event.target?.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CompanyProfile) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await db.company.setItem('profile', data);
      setSaveSuccess(true);
      // Reset after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      reset(data); // reset to make isDirty false again
    } catch (error) {
      console.error('Failed to save company profile', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
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
              <Label htmlFor="companyName">Company Name *</Label>
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
            <h3 className="font-semibold text-lg">Terms & Conditions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Default Terms & Conditions</Label>
              <textarea id="termsAndConditions" rows={4} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. 1. Payment is due within 15 days.&#10;2. Goods once sold will not be taken back." {...register('termsAndConditions')} />
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
