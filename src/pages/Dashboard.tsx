import { useEffect, useState } from 'react';
import { FileText, IndianRupee, Clock, CheckCircle, Search, Trash2, Eye, Loader2, CreditCard, Share2, Plus, FolderOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../lib/db';
import type { Invoice, Customer, Settings } from '../lib/schema';
// generateId import removed
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ConfirmModal } from '../components/ui/confirm-modal';

export function Dashboard() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<(Invoice & { customerName?: string })[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Draft' | 'Pending' | 'Paid' | 'Overdue'>('All');
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);

  const loadData = async () => {
    try {
      const invKeys = await db.invoices.keys();
      const loadedInvoices: Invoice[] = [];
      for (const key of invKeys) {
        const inv = await db.invoices.getItem<Invoice>(key);
        if (inv) loadedInvoices.push(inv);
      }

      const custKeys = await db.customers.keys();
      const customerMap = new Map<string, string>();
      for (const key of custKeys) {
        const c = await db.customers.getItem<Customer>(key);
        if (c) customerMap.set(c.id, c.companyName || c.customerName);
      }

      const enrichedInvoices = loadedInvoices.map(inv => ({
        ...inv,
        customerName: customerMap.get(inv.customerId) || 'Unknown Customer'
      }));

      enrichedInvoices.sort((a, b) => b.createdAt - a.createdAt);
      setInvoices(enrichedInvoices);

      const set = await db.settings.getItem<Settings>('appSettings');
      if (set) setSettings(set);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteClick = (id: string) => {
    setDeleteInvoiceId(id);
  };

  const executeDelete = async () => {
    if (!deleteInvoiceId) return;
    await db.invoices.removeItem(deleteInvoiceId);
    toast.success('Invoice deleted successfully!');
    setDeleteInvoiceId(null);
    loadData();
  };

  const handleMarkPaidClick = (invoice: Invoice) => {
    setMarkPaidInvoice(invoice);
  };

  const executeMarkPaid = async () => {
    if (!markPaidInvoice) return;
    const updated = {
      ...markPaidInvoice,
      status: 'Paid' as const,
      paidAmount: markPaidInvoice.grandTotal,
      balanceAmount: 0,
      updatedAt: Date.now()
    };
    await db.invoices.setItem(markPaidInvoice.id, updated);
    toast.success(`Invoice ${markPaidInvoice.invoiceNumber} marked as fully paid!`);
    setMarkPaidInvoice(null);
    loadData();
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Calculate Stats
  const totalInvoices = invoices.length;
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const pendingPayments = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);
  const paidInvoices = invoices.filter(i => i.status === 'Paid').length;

  const currency = settings?.currencySymbol || '₹';

  const stats = [
    { name: 'Total Invoices', value: totalInvoices.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Total Billed', value: `${currency}${totalBilled.toFixed(2)}`, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Pending Payments', value: `${currency}${pendingPayments.toFixed(2)}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Paid Invoices', value: paidInvoices.toString(), icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.fromLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.toLocation.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filter === 'All') return true;
    if (filter === 'Draft' && inv.status === 'Draft') return true;
    if (filter === 'Pending' && (inv.status === 'Pending' || inv.status === 'Partially Paid')) return true;
    if (filter === 'Paid' && inv.status === 'Paid') return true;
    if (filter === 'Overdue' && inv.status === 'Overdue') return true;
    return false;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft': return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700">Draft</span>;
      case 'Pending': return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700">Pending</span>;
      case 'Partially Paid': return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">Partially Paid</span>;
      case 'Paid': return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">Paid</span>;
      case 'Cancelled': return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">Cancelled</span>;
      case 'Overdue': return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-rose-100 text-rose-700">Overdue</span>;
      default: return <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your transport business invoices and payments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/customers')} variant="outline">Add Customer</Button>
          <Button onClick={() => navigate('/create-invoice')}>Create Invoice</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-row items-center gap-4">
            <div className={`p-3 rounded-full ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
              <h3 className="text-2xl font-bold truncate max-w-[150px]">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 border-b flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h3 className="font-semibold leading-none tracking-tight">Invoice History</h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search invoices..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
            {['All', 'Draft', 'Pending', 'Paid', 'Overdue'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                  filter === tab 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-600 whitespace-nowrap">Invoice No</th>
                <th className="px-6 py-3 font-semibold text-slate-600 whitespace-nowrap">Date</th>
                <th className="px-6 py-3 font-semibold text-slate-600 whitespace-nowrap">Customer</th>
                <th className="px-6 py-3 font-semibold text-slate-600 whitespace-nowrap">Route</th>
                <th className="px-6 py-3 font-semibold text-slate-600 text-right whitespace-nowrap">Amount</th>
                <th className="px-6 py-3 font-semibold text-slate-600 text-right whitespace-nowrap">Balance</th>
                <th className="px-6 py-3 font-semibold text-slate-600 text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-3 font-semibold text-slate-600 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="p-5 rounded-full bg-primary/10 text-primary mb-4 shadow-inner">
                        <FolderOpen className="h-12 w-12 stroke-[1.5]" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1">No invoices found</h3>
                      <p className="text-sm text-muted-foreground text-center mb-6">
                        {filter !== 'All' || searchTerm !== ''
                          ? "No invoices match your current search or filter criteria. Try clearing filters to see all transport bills."
                          : "You haven't generated any transport invoices yet. Create your first bill now to start tracking billing and payments."}
                      </p>
                      {filter !== 'All' || searchTerm !== '' ? (
                        <Button variant="outline" onClick={() => { setFilter('All'); setSearchTerm(''); }} className="gap-2">
                          Clear Filters
                        </Button>
                      ) : (
                        <Button onClick={() => navigate('/create-invoice')} className="gap-2 shadow-md">
                          <Plus className="h-4 w-4" />
                          Create Your First Invoice
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 max-w-[150px] truncate" title={inv.customerName}>{inv.customerName}</td>
                    <td className="px-6 py-4 max-w-[150px] truncate text-slate-500" title={`${inv.fromLocation} → ${inv.toLocation}`}>
                      {inv.fromLocation} → {inv.toLocation}
                    </td>
                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">{currency}{inv.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-amber-600 font-medium whitespace-nowrap">{currency}{inv.balanceAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {inv.balanceAmount > 0 && (
                          <Button variant="ghost" size="icon" title="Mark as Paid" onClick={() => handleMarkPaidClick(inv as Invoice)}>
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Share via Email" onClick={() => {
                          const subject = encodeURIComponent(`Transport Invoice - ${inv.invoiceNumber}`);
                          const formatDate = (dateVal: string | number | Date) => new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          const rawBody = `Dear ${inv.customerName || 'Valued Customer'},

We hope this email finds you well.

Please find below the official summary for your transport invoice #${inv.invoiceNumber}, dated ${formatDate(inv.invoiceDate)}.

Note: The official PDF invoice document has been prepared and can be attached to this correspondence.

--------------------------------------------------
INVOICE SUMMARY
--------------------------------------------------
• Invoice Number: ${inv.invoiceNumber}
• Invoice Date: ${formatDate(inv.invoiceDate)}
• Payment Due Date: ${formatDate(inv.dueDate)}
• Current Status: ${inv.status.toUpperCase()}

--------------------------------------------------
TRANSPORT & FINANCIALS
--------------------------------------------------
• Route: ${inv.fromLocation} -> ${inv.toLocation}
• Grand Total: ${currency}${inv.grandTotal.toFixed(2)}
• NET BALANCE DUE: ${currency}${inv.balanceAmount.toFixed(2)}

--------------------------------------------------

If you have any questions regarding this invoice, please feel free to reply directly to this email.

Thank you for your continued partnership and business!

Warm regards,

Transport Administration Department`;
                          const body = encodeURIComponent(rawBody);
                          window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`, '_blank');
                        }}>
                          <Share2 className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Link to={`/invoice/${inv.id}`}>
                          <Button variant="ghost" size="icon" title="View Invoice">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(inv.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteInvoiceId}
        onClose={() => setDeleteInvoiceId(null)}
        onConfirm={executeDelete}
        title="Delete Invoice?"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmText="Yes, Delete"
        variant="destructive"
      />

      <ConfirmModal
        isOpen={!!markPaidInvoice}
        onClose={() => setMarkPaidInvoice(null)}
        onConfirm={executeMarkPaid}
        title="Mark as Fully Paid?"
        description={`Are you sure you want to mark Invoice #${markPaidInvoice?.invoiceNumber} as fully paid (${currency}${markPaidInvoice?.grandTotal?.toFixed(2)})?`}
        confirmText="Yes, Mark Paid"
      />
    </div>
  );
}
