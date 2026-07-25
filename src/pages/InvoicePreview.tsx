import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Mail, ArrowLeft, Loader2, Edit } from 'lucide-react';
import { db } from '../lib/db';
import type { Invoice, CompanyProfile, Customer, Settings } from '../lib/schema';
import { Button } from '../components/ui/button';
import { amountToWords } from '../lib/numberToWords';

export function InvoicePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const inv = await db.invoices.getItem<Invoice>(id);
        if (!inv) throw new Error("Invoice not found");
        setInvoice(inv);
        
        const comp = await db.company.getItem<CompanyProfile>('profile');
        setCompany(comp || null);
        
        const cust = await db.customers.getItem<Customer>(inv.customerId);
        setCustomer(cust || null);
        
        const set = await db.settings.getItem<Settings>('appSettings');
        setSettings(set || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Invoice not found</h2>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const currency = settings?.currencySymbol || '₹';
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

    let itemsText = `1. Freight Charge: ${currency}${invoice.freightCharge.toFixed(2)}`;
    if (invoice.goodsDescription) itemsText += `\n   (Goods: ${invoice.goodsDescription})`;
    if (invoice.weight) itemsText += ` | Weight: ${invoice.weight} ${invoice.weightUnit || ''}`;
    if (invoice.numberOfPackages) itemsText += ` | Pkgs: ${invoice.numberOfPackages}`;

    if (Array.isArray(invoice.extraCharges) && invoice.extraCharges.length > 0) {
      invoice.extraCharges.forEach((charge, idx) => {
        itemsText += `\n${idx + 2}. ${charge.name}: ${currency}${charge.amount.toFixed(2)}`;
      });
    }

    let bankText = '';
    if (company?.bankName) {
      bankText = `\n----------------------------------------\nPAYMENT / BANK DETAILS\n----------------------------------------\nBank Name: ${company.bankName}\nA/C Name: ${company.accountHolder}\nA/C No: ${company.accountNumber}\nIFSC Code: ${company.ifscCode}` +
      (company.upiId ? `\nUPI ID: ${company.upiId}` : '');
    }

    let taxText = '';
    if (invoice.cgstAmount > 0) taxText += `\nCGST (${(invoice.gstPercentage/2).toFixed(1)}%): ${currency}${invoice.cgstAmount.toFixed(2)}`;
    if (invoice.sgstAmount > 0) taxText += `\nSGST (${(invoice.gstPercentage/2).toFixed(1)}%): ${currency}${invoice.sgstAmount.toFixed(2)}`;
    if (invoice.igstAmount > 0) taxText += `\nIGST (${invoice.gstPercentage}%): ${currency}${invoice.igstAmount.toFixed(2)}`;
    if (invoice.discount > 0) taxText = `\nDiscount: -${currency}${invoice.discount.toFixed(2)}` + taxText;

    const rawBody = `Dear ${customer?.companyName || customer?.customerName || 'Customer'},

Please find the complete invoice details below:

========================================
INVOICE SUMMARY
========================================
Invoice No: ${invoice.invoiceNumber}
Date: ${formatDate(invoice.invoiceDate)}
Due Date: ${formatDate(invoice.dueDate)}
Status: ${invoice.status.toUpperCase()}

----------------------------------------
BILLED TO
----------------------------------------
Name: ${customer?.companyName || customer?.customerName || 'N/A'}
${customer?.billingAddress ? `Address: ${customer.billingAddress}\n` : ''}${customer?.phone ? `Phone: ${customer.phone}\n` : ''}${customer?.gstNumber ? `GSTIN: ${customer.gstNumber}\n` : ''}
----------------------------------------
TRANSPORT DETAILS
----------------------------------------
From: ${invoice.fromLocation}
To: ${invoice.toLocation}
${invoice.vehicleNumber ? `Vehicle No: ${invoice.vehicleNumber}\n` : ''}${invoice.lrNumber ? `LR No: ${invoice.lrNumber}\n` : ''}${invoice.distanceKm ? `Distance: ${invoice.distanceKm} km\n` : ''}
----------------------------------------
CHARGES BREAKDOWN
----------------------------------------
${itemsText}

Subtotal: ${currency}${invoice.subtotal.toFixed(2)}${taxText}
----------------------------------------
GRAND TOTAL: ${currency}${invoice.grandTotal.toFixed(2)}
----------------------------------------
${invoice.paidAmount > 0 ? `Advance/Paid: -${currency}${invoice.paidAmount.toFixed(2)}\nBalance Due: ${currency}${invoice.balanceAmount.toFixed(2)}\n` : ''}${bankText}

${invoice.remarks ? `\nRemarks:\n${invoice.remarks}\n` : ''}
Thank you for your business!

Regards,
${company?.companyName || 'Transport Company'}
${company?.phone ? `Phone: ${company.phone}` : ''}
${company?.email ? `Email: ${company.email}` : ''}`;

    const subject = encodeURIComponent(`Transport Invoice - ${invoice.invoiceNumber}`);
    const body = encodeURIComponent(rawBody);
    
    const toEmail = customer?.email || '';
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 print:py-0 print:max-w-none">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="space-x-2">
          <Button onClick={() => navigate(`/edit-invoice/${invoice.id}`)} variant="outline">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" /> Print / PDF
          </Button>
          <Button onClick={handleEmail}>
            <Mail className="h-4 w-4 mr-2" /> Share via Gmail
          </Button>
        </div>
      </div>

      <div className="bg-white border sm:rounded-lg print:border-none print:shadow-none p-8 md:p-10 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6 print:pb-4 print:mb-4">
          <div className="flex-1">
            {company?.logo && <img src={company.logo} alt="Company Logo" className="h-16 mb-4 object-contain" />}
            <h1 className="text-2xl font-bold text-slate-900">{company?.companyName || 'Transport Company'}</h1>
            {company?.address && <p className="text-sm text-slate-600 mt-1">{company.address}</p>}
            {(company?.city || company?.state) && <p className="text-sm text-slate-600">{company.city}, {company.state} {company.pinCode}</p>}
            {company?.phone && <p className="text-sm text-slate-600 mt-1">Phone: {company.phone}</p>}
            {company?.email && <p className="text-sm text-slate-600">Email: {company.email}</p>}
            {company?.gstNumber && <p className="text-sm font-semibold text-slate-800 mt-1">GSTIN: {company.gstNumber}</p>}
          </div>
          
          <div className="text-right">
            <h2 className="text-4xl font-bold text-slate-900 uppercase tracking-wider">INVOICE</h2>
            <div className="mt-4 text-sm space-y-1">
              <p><span className="text-slate-500 font-medium mr-2">Invoice No:</span> <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
              <p><span className="text-slate-500 font-medium mr-2">Date:</span> <span className="font-semibold text-slate-900">{new Date(invoice.invoiceDate).toLocaleDateString()}</span></p>
              <p><span className="text-slate-500 font-medium mr-2">Due Date:</span> <span className="font-semibold text-slate-900">{new Date(invoice.dueDate).toLocaleDateString()}</span></p>
              <p><span className="text-slate-500 font-medium mr-2">Status:</span> <span className="font-bold uppercase">{invoice.status}</span></p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-6 print:mb-4">
          {/* Billed To */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Billed To</h3>
            <p className="font-bold text-base text-slate-900">{customer?.companyName || customer?.customerName}</p>
            {customer?.companyName && <p className="text-sm text-slate-700">{customer?.customerName}</p>}
            {customer?.billingAddress && <p className="text-sm text-slate-600 mt-1">{customer.billingAddress}</p>}
            {(customer?.city || customer?.state) && <p className="text-sm text-slate-600">{customer.city}, {customer.state} {customer.pinCode}</p>}
            {customer?.phone && <p className="text-sm text-slate-600 mt-1">Phone: {customer.phone}</p>}
            {customer?.gstNumber && <p className="text-sm font-semibold text-slate-800 mt-1">GSTIN: {customer.gstNumber}</p>}
          </div>

          {/* Transport Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Transport Details</h3>
            <div className="text-sm grid grid-cols-[100px_1fr] gap-y-1">
              <span className="text-slate-600 font-medium">From:</span>
              <span className="font-bold text-slate-900">{invoice.fromLocation}</span>
              
              <span className="text-slate-600 font-medium">To:</span>
              <span className="font-bold text-slate-900">{invoice.toLocation}</span>
              
              {invoice.vehicleNumber && (
                <>
                  <span className="text-slate-600 font-medium">Vehicle No:</span>
                  <span className="text-slate-900">{invoice.vehicleNumber}</span>
                </>
              )}
              {invoice.lrNumber && (
                <>
                  <span className="text-slate-600 font-medium">LR No:</span>
                  <span className="text-slate-900">{invoice.lrNumber}</span>
                </>
              )}
              {invoice.distanceKm && (
                <>
                  <span className="text-slate-600 font-medium">Distance:</span>
                  <span className="text-slate-900">{invoice.distanceKm} km</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-6 print:mb-4">
          <table className="w-full text-sm text-left border border-slate-200">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-800">Description</th>
                <th className="px-4 py-3 font-bold text-slate-800 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-900">Freight Charge</p>
                  {invoice.goodsDescription && <p className="text-slate-600 mt-1">Goods: {invoice.goodsDescription}</p>}
                  {invoice.weight ? <p className="text-slate-600">Weight: {invoice.weight} {invoice.weightUnit}</p> : null}
                  {invoice.numberOfPackages ? <p className="text-slate-600">Packages: {invoice.numberOfPackages}</p> : null}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900 align-top">{settings?.currencySymbol}{invoice.freightCharge.toFixed(2)}</td>
              </tr>
              {Array.isArray(invoice.extraCharges) && invoice.extraCharges.map((charge, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="px-4 py-3 text-slate-700">{charge.name}</td>
                  <td className="px-4 py-3 text-right text-slate-900">{settings?.currencySymbol}{charge.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Bank details */}
        <div className="grid grid-cols-2 gap-8 mb-6 print:mb-4">
          {/* Bank Details */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-1 mb-2">Payment / Bank Details</h3>
            {company?.bankName ? (
              <div className="text-sm space-y-1">
                <p><span className="text-slate-600 font-medium inline-block w-24">Bank:</span> <span className="font-bold text-slate-900">{company.bankName}</span></p>
                <p><span className="text-slate-600 font-medium inline-block w-24">A/C Name:</span> <span className="font-bold text-slate-900">{company.accountHolder}</span></p>
                <p><span className="text-slate-600 font-medium inline-block w-24">A/C No:</span> <span className="font-bold text-slate-900">{company.accountNumber}</span></p>
                <p><span className="text-slate-600 font-medium inline-block w-24">IFSC Code:</span> <span className="font-bold text-slate-900">{company.ifscCode}</span></p>
                {company.upiId && <p className="mt-2"><span className="text-slate-600 font-medium inline-block w-24">UPI ID:</span> <span className="font-bold text-slate-900">{company.upiId}</span></p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No bank details provided.</p>
            )}
          </div>

          {/* Totals Calculation */}
          <div className="text-sm">
            <div className="flex justify-between py-1">
              <span className="text-slate-600 font-medium">Subtotal:</span>
              <span className="font-semibold text-slate-900">{settings?.currencySymbol}{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600 font-medium">Discount:</span>
                <span className="font-semibold text-slate-900">-{settings?.currencySymbol}{invoice.discount.toFixed(2)}</span>
              </div>
            )}
            {invoice.cgstAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600 font-medium">CGST ({(invoice.gstPercentage/2).toFixed(1)}%):</span>
                <span className="font-semibold text-slate-900">{settings?.currencySymbol}{invoice.cgstAmount.toFixed(2)}</span>
              </div>
            )}
            {invoice.sgstAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600 font-medium">SGST ({(invoice.gstPercentage/2).toFixed(1)}%):</span>
                <span className="font-semibold text-slate-900">{settings?.currencySymbol}{invoice.sgstAmount.toFixed(2)}</span>
              </div>
            )}
            {invoice.igstAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600 font-medium">IGST ({invoice.gstPercentage}%):</span>
                <span className="font-semibold text-slate-900">{settings?.currencySymbol}{invoice.igstAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between py-2 mt-2 border-t border-slate-300">
              <span className="text-base font-bold text-slate-900 uppercase">Grand Total:</span>
              <span className="text-lg font-bold text-slate-900">{settings?.currencySymbol}{invoice.grandTotal.toFixed(2)}</span>
            </div>
            
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-slate-600 font-medium">Advance / Paid:</span>
                <span className="font-semibold text-slate-900">-{settings?.currencySymbol}{invoice.paidAmount.toFixed(2)}</span>
              </div>
            )}
            
            {(invoice.paidAmount > 0 || invoice.balanceAmount > 0) && (
              <div className="flex justify-between py-2 border-t border-slate-300 bg-slate-50 px-2 mt-1">
                <span className="font-bold text-slate-900 uppercase">Balance Due:</span>
                <span className="font-bold text-slate-900">{settings?.currencySymbol}{invoice.balanceAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount in Words & Remarks */}
        <div className="mb-6 print:mb-4 space-y-4">
          <div className="text-sm">
            <span className="font-bold text-slate-800">Amount in Words: </span>
            <span className="italic text-slate-700">{settings?.currencySymbol === '₹' ? 'Rupees ' : ''}{amountToWords(invoice.grandTotal)}</span>
          </div>

          {invoice.remarks && (
            <div className="text-sm">
              <span className="font-bold text-slate-800 block mb-1">Remarks: </span>
              <span className="text-slate-700 whitespace-pre-wrap">{invoice.remarks}</span>
            </div>
          )}

          {company?.termsAndConditions && (
            <div className="text-sm">
              <span className="font-bold text-slate-800 block mb-1">Terms & Conditions: </span>
              <span className="text-slate-700 whitespace-pre-wrap">{company.termsAndConditions}</span>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-4 print:mt-8">
          <div className="text-center">
            <div className="border-t border-slate-400 w-48 mx-auto pt-2">
              <p className="text-sm font-bold text-slate-800">Receiver's Signature</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 w-48 mx-auto pt-2">
              <p className="text-sm font-bold text-slate-800">For {company?.companyName || 'Company'}</p>
              <p className="text-xs text-slate-600 mt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
