import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle2, Download, Upload } from 'lucide-react';
import { db } from '../lib/db';
import { settingsSchema, type Settings as SettingsType } from '../lib/schema';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function Settings() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<any>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      currencySymbol: '₹',
      defaultGstPercentage: 18,
      defaultPaymentTerms: 'Due on Receipt',
      invoicePrefix: 'INV-YYYY-',
    }
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await db.settings.getItem<SettingsType>('appSettings');
        if (data) {
          reset(data);
        }
      } catch (error) {
        console.error('Failed to load settings', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [reset]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    // Parse numeric value manually since inputs return strings
    const parsedData = {
      ...data,
      defaultGstPercentage: Number(data.defaultGstPercentage)
    };
    
    try {
      await db.settings.setItem('appSettings', parsedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      reset(parsedData);
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData: any = { company: {}, customers: {}, settings: {}, invoices: {} };
      
      const comp = await db.company.getItem('profile');
      if (comp) exportData.company.profile = comp;
      
      const cKeys = await db.customers.keys();
      for (const k of cKeys) exportData.customers[k] = await db.customers.getItem(k);
      
      const sKeys = await db.settings.keys();
      for (const k of sKeys) exportData.settings[k] = await db.settings.getItem(k);
      
      const iKeys = await db.invoices.keys();
      for (const k of iKeys) exportData.invoices[k] = await db.invoices.getItem(k);

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport-bill-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("WARNING: Importing data will overwrite ALL your current invoices and settings. Are you sure you want to proceed?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        await db.company.clear();
        if (data.company?.profile) await db.company.setItem('profile', data.company.profile);
        
        await db.customers.clear();
        for (const k of Object.keys(data.customers || {})) await db.customers.setItem(k, data.customers[k]);
        
        await db.settings.clear();
        for (const k of Object.keys(data.settings || {})) await db.settings.setItem(k, data.settings[k]);
        
        await db.invoices.clear();
        for (const k of Object.keys(data.invoices || {})) await db.invoices.setItem(k, data.invoices[k]);

        alert("Data imported successfully! The application will now reload.");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to import data. Please ensure the file is a valid backup JSON.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
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
          <SettingsIcon className="h-6 w-6 text-primary" />
          Settings
        </h2>
        <p className="text-muted-foreground">
          Configure application defaults and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border bg-slate-50/50">
            <h3 className="font-semibold text-lg">Invoice Defaults</h3>
          </div>
          <div className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input id="currencySymbol" placeholder="e.g. ₹ or $" {...register('currencySymbol')} />
              {errors.currencySymbol && <p className="text-sm text-destructive">{String(errors.currencySymbol.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultGstPercentage">Default GST Percentage (%)</Label>
              <Input id="defaultGstPercentage" type="number" step="0.01" placeholder="18" {...register('defaultGstPercentage', { valueAsNumber: true })} />
              {errors.defaultGstPercentage && <p className="text-sm text-destructive">{String(errors.defaultGstPercentage.message)}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input id="invoicePrefix" placeholder="e.g. INV-YYYY-" {...register('invoicePrefix')} />
              <p className="text-xs text-muted-foreground">YYYY will automatically be replaced with current year.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
              <Input id="defaultPaymentTerms" placeholder="e.g. 15 Days / Due on Receipt" {...register('defaultPaymentTerms')} />
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
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm mt-8">
        <div className="p-6 border-b border-border bg-slate-50/50">
          <h3 className="font-semibold text-lg">Data Management</h3>
          <p className="text-sm text-muted-foreground mt-1">Backup or restore your local database.</p>
        </div>
        <div className="p-6 flex flex-col sm:flex-row gap-4">
          <Button onClick={handleExport} variant="outline" disabled={isExporting} className="w-full sm:w-auto">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Backup (JSON)
          </Button>
          
          <div className="relative w-full sm:w-auto">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              disabled={isImporting}
            />
            <Button variant="outline" disabled={isImporting} className="w-full sm:w-auto">
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import Backup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
