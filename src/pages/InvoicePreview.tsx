import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Mail, ArrowLeft, Loader2, Edit } from 'lucide-react';
import { db } from '../lib/db';
import type { Invoice, CompanyProfile, Customer, Settings } from '../lib/schema';
import { Button } from '../components/ui/button';
import { amountToWords } from '../lib/numberToWords';
import HeaderVSImage from '../../HeaderVS.png';
import HeaderSNImage from '../../HeaderSN.png';

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
        
        const compKey = inv.companyId || 'profile';
        const comp = await db.company.getItem<CompanyProfile>(compKey) || await db.company.getItem<CompanyProfile>('profile');
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
        <Button className="mt-4" onClick={() => navigate(window.history.length > 1 ? -1 as any : '/')}>Go Back</Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const currency = settings?.currencySymbol || '₹';
    const formatDate = (dateVal: string | number | Date) => new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let itemsText = `• Freight Charge: ${currency}${invoice.freightCharge.toFixed(2)}`;
    if (invoice.goodsDescription) itemsText += `\n  (Description: ${invoice.goodsDescription})`;
    if (invoice.weight) itemsText += ` | Weight: ${invoice.weight} ${invoice.weightUnit || ''}`;
    if (invoice.numberOfPackages) itemsText += ` | Pkgs: ${invoice.numberOfPackages}`;

    if (Array.isArray(invoice.extraCharges) && invoice.extraCharges.length > 0) {
      invoice.extraCharges.forEach((charge) => {
        itemsText += `\n• ${charge.name}: ${currency}${charge.amount.toFixed(2)}`;
      });
    }
    if (invoice.discount > 0) {
      itemsText += `\n• Less Discount: -${currency}${invoice.discount.toFixed(2)}`;
    }

    let bankText = '';
    if (company?.bankName) {
      bankText = `\n\nPAYMENT INSTRUCTIONS & BANK DETAILS:\n` +
                 `Please transfer the balance due to the bank account below:\n` +
                 `• Bank Name: ${company.bankName}\n` +
                 `• Account Holder: ${company.accountHolder || 'N/A'}\n` +
                 `• Account Number: ${company.accountNumber || 'N/A'}\n` +
                 `• IFSC Code: ${company.ifscCode || 'N/A'}` +
                 (company.upiId ? `\n• UPI ID: ${company.upiId}` : '');
    }

    let taxText = '';
    if (invoice.cgstAmount > 0) taxText += `\n• CGST (${(invoice.gstPercentage/2).toFixed(1)}%): ${currency}${invoice.cgstAmount.toFixed(2)}`;
    if (invoice.sgstAmount > 0) taxText += `\n• SGST (${(invoice.gstPercentage/2).toFixed(1)}%): ${currency}${invoice.sgstAmount.toFixed(2)}`;
    if (invoice.igstAmount > 0) taxText += `\n• IGST (${invoice.gstPercentage}%): ${currency}${invoice.igstAmount.toFixed(2)}`;

    const recipientName = customer?.companyName || customer?.customerName || 'Valued Customer';
    const senderName = company?.companyName || 'Transport Company';

    const rawBody = `Dear ${recipientName},

We hope this email finds you well.

Please find below the official billing summary for your transport invoice #${invoice.invoiceNumber}, dated ${formatDate(invoice.invoiceDate)}. 

Note: The official PDF invoice document (with full terms and signature) has been prepared and is attached herewith for your records and payment processing.

--------------------------------------------------
1. INVOICE OVERVIEW
--------------------------------------------------
• Invoice Number: ${invoice.invoiceNumber}
• Invoice Date: ${formatDate(invoice.invoiceDate)}
• Payment Due Date: ${formatDate(invoice.dueDate)}
• Current Status: ${invoice.status.toUpperCase()}

--------------------------------------------------
2. TRANSPORT ROUTE & CONSIGNMENT
--------------------------------------------------
• Origin: ${invoice.fromLocation}
• Destination: ${invoice.toLocation}` +
(invoice.vehicleNumber ? `\n• Vehicle Number: ${invoice.vehicleNumber}` : '') +
(invoice.lrNumber ? `\n• LR / Consignment No: ${invoice.lrNumber}` : '') +
(invoice.distanceKm ? `\n• Total Distance: ${invoice.distanceKm} km` : '') +
(invoice.goodsDescription ? `\n• Goods Description: ${invoice.goodsDescription}` : '') +
(invoice.weight ? `\n• Total Weight: ${invoice.weight} ${invoice.weightUnit || 'KG'}` : '') + `

--------------------------------------------------
3. CHARGES BREAKDOWN
--------------------------------------------------
${itemsText}
• Subtotal: ${currency}${invoice.subtotal.toFixed(2)}${taxText}

--------------------------------------------------
4. TOTALS & NET BALANCE
--------------------------------------------------
• Grand Total: ${currency}${invoice.grandTotal.toFixed(2)}` +
(invoice.paidAmount > 0 ? `\n• Advance / Less Paid: -${currency}${invoice.paidAmount.toFixed(2)}` : '') + `
• NET BALANCE DUE: ${currency}${invoice.balanceAmount.toFixed(2)}${bankText}` +
(invoice.remarks ? `\n\nSPECIAL REMARKS / NOTES:\n${invoice.remarks}` : '') + `

--------------------------------------------------

If you have any questions or require any clarification regarding this invoice, please feel free to reply to this email or contact our billing department directly.

Thank you for your continued partnership and business!

Warm regards,

${senderName}` +
(company?.phone ? `\nPhone: ${company.phone}` : '') +
(company?.email ? `\nEmail: ${company.email}` : '') +
(company?.gstNumber ? `\nGSTIN: ${company.gstNumber}` : '');

    const subject = encodeURIComponent(`Transport Invoice - ${invoice.invoiceNumber}`);
    const body = encodeURIComponent(rawBody);
    
    const toEmail = customer?.email || '';
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${subject}&body=${body}`, '_blank');
  };

  const currency = settings?.currencySymbol || '₹';

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 print:py-0 print:max-w-none px-2 sm:px-0 print:px-0 font-sans text-slate-900">
      {/* Action buttons (hidden when printing) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)} className="self-start -ml-2 sm:ml-0">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          <Button onClick={() => navigate(`/edit-invoice/${invoice.id}`)} variant="outline" size="sm" className="flex-1 sm:flex-initial">
            <Edit className="h-4 w-4 mr-1.5 sm:mr-2" /> Edit
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 sm:flex-initial bg-primary text-primary-foreground hover:bg-primary/90">
            <Printer className="h-4 w-4 mr-1.5 sm:mr-2" /> Print / PDF
          </Button>
          <Button onClick={handleEmail} size="sm" className="w-full sm:w-auto sm:flex-initial mt-1 sm:mt-0">
            <Mail className="h-4 w-4 mr-1.5 sm:mr-2" /> Share via Gmail
          </Button>
        </div>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="w-full overflow-x-auto pb-8 print:pb-0">
        <div className={invoice.billingType === 'MONTHLY_KM' 
          ? "bg-white text-black p-4 md:p-8 print:p-0 min-w-[700px] md:min-w-0 max-w-[210mm] min-h-[297mm] mx-auto print:w-[210mm] print:h-[297mm] print:overflow-hidden overflow-visible font-bold"
          : "bg-white border sm:rounded-lg print:border-none print:shadow-none p-4 sm:p-8 md:p-10 print:p-0 min-w-[700px] md:min-w-0 overflow-hidden print:overflow-visible shadow-sm mx-auto"}>
        
        {/* Company Header (Only for STANDARD) */}
        {invoice.billingType !== 'MONTHLY_KM' && (
          <>
            <CustomInvoiceHeader company={company} />

            <div className="text-center font-bold text-base sm:text-lg uppercase tracking-widest underline mb-4 text-black">
              TAX INVOICE / CONSIGNMENT NOTE
            </div>
          </>
        )}

        {invoice.billingType === 'MONTHLY_KM' ? (
          <MonthlyKmPreview 
            invoice={invoice} 
            company={company} 
            customer={customer} 
            amountToWords={amountToWords} 
          />
        ) : (
          <>
            {/* Top Boxes: TO- Client & BILL Details */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mb-6 print:grid-cols-[1fr_auto]">
              {/* TO- Client Box */}
              <div className="border-2 border-black p-3 sm:p-4 flex flex-col justify-between min-h-[120px] bg-white">
                <div>
                  <div className="font-extrabold text-base uppercase text-black leading-snug">
                    TO- {customer?.companyName || customer?.customerName || 'VALUED CUSTOMER'}
                  </div>
                  {customer?.companyName && customer?.customerName && (
                    <div className="text-sm font-semibold text-slate-800 mt-0.5">{customer.customerName}</div>
                  )}
                  {customer?.billingAddress && (
                    <div className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{customer.billingAddress}</div>
                  )}
                  {(customer?.city || customer?.state) && (
                    <div className="text-sm text-slate-700">{customer.city}, {customer.state} {customer.pinCode}</div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-xs sm:text-sm space-y-0.5 text-slate-800">
                  {customer?.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
                  {customer?.gstNumber && <div><strong>GSTIN:</strong> <span className="font-bold">{customer.gstNumber}</span></div>}
                </div>
              </div>

              {/* BILL Details Box */}
              <div className="border-2 border-black w-full md:w-72 print:w-72 bg-white self-start">
                <div className="flex border-b-2 border-black text-sm">
                  <div className="w-28 font-extrabold p-2 border-r-2 border-black bg-slate-100 uppercase text-xs flex items-center">
                    BILL NO
                  </div>
                  <div className="flex-1 p-2 font-bold text-black break-all">
                    {invoice.invoiceNumber}
                  </div>
                </div>
                {!!invoice.invoiceDate && (
                  <div className="flex border-b-2 border-black text-sm">
                    <div className="w-28 font-extrabold p-2 border-r-2 border-black bg-slate-100 uppercase text-xs flex items-center">
                      BILL DATE
                    </div>
                    <div className="flex-1 p-2 font-semibold text-black">
                      {new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {!!invoice.dueDate && (
                  <div className="flex border-b border-black text-sm">
                    <div className="w-28 font-extrabold p-2 border-r border-black bg-slate-50 uppercase text-xs flex items-center">
                      DUE DATE
                    </div>
                    <div className="flex-1 p-2 font-medium text-slate-800">
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {invoice.vehicleNumber && (
                  <div className="flex border-b border-black text-sm">
                    <div className="w-28 font-extrabold p-2 border-r border-black bg-slate-50 uppercase text-xs flex items-center">
                      VEHICLE NO
                    </div>
                    <div className="flex-1 p-2 font-bold uppercase text-black break-all">
                      {invoice.vehicleNumber}
                    </div>
                  </div>
                )}
                {invoice.lrNumber && (
                  <div className="flex text-sm">
                    <div className="w-28 font-extrabold p-2 border-r border-black bg-slate-50 uppercase text-xs flex items-center">
                      LR / GR NO
                    </div>
                    <div className="flex-1 p-2 font-bold text-black break-all">
                      {invoice.lrNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main 3-Column Table Grid */}
            <div className="border-2 border-black overflow-hidden bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-slate-100 font-extrabold text-black uppercase text-xs sm:text-sm">
                    <th className="w-14 sm:w-16 border-r-2 border-black text-center py-3 px-1">SR NO</th>
                    <th className="border-r-2 border-black text-center py-3 px-4 tracking-wider">TRANSPORT CHARGES</th>
                    <th className="w-36 sm:w-44 text-center py-3 px-3">AMOUNT RS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="w-14 sm:w-16 border-r-2 border-black text-center py-4 px-2 font-bold text-slate-800 align-top">
                      1
                    </td>
                    <td className="border-r-2 border-black py-4 px-4 text-left align-top">
                      <div className="font-extrabold text-base text-black uppercase">
                        Freight Charges
                      </div>
                      <div className="text-sm font-semibold text-slate-800 mt-1">
                        Route: <span className="text-black">{invoice.fromLocation}</span> TO <span className="text-black">{invoice.toLocation}</span>
                      </div>
                      {invoice.goodsDescription && (
                        <div className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">
                          <strong>Description of Goods:</strong> {invoice.goodsDescription}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs sm:text-sm text-slate-600 mt-2 pt-2 border-t border-slate-200">
                        {invoice.weight && <span><strong>Weight:</strong> {invoice.weight} {invoice.weightUnit || 'KG'}</span>}
                        {invoice.numberOfPackages && <span><strong>Packages:</strong> {invoice.numberOfPackages}</span>}
                        {invoice.distanceKm && <span><strong>Distance:</strong> {invoice.distanceKm} km</span>}
                      </div>
                    </td>
                    <td className="w-36 sm:w-44 text-right py-4 px-4 font-bold text-base text-black align-top whitespace-nowrap">
                      {currency}{invoice.freightCharge.toFixed(2)}
                    </td>
                  </tr>

                  {/* Extra Charges Rows */}
                  {Array.isArray(invoice.extraCharges) && invoice.extraCharges.map((charge, idx) => (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="w-14 sm:w-16 border-r-2 border-black text-center py-3 px-2 font-semibold text-slate-700 align-top">
                        {idx + 2}
                      </td>
                      <td className="border-r-2 border-black py-3 px-4 text-slate-800 align-top font-medium">
                        {charge.name}
                      </td>
                      <td className="w-36 sm:w-44 text-right py-3 px-4 text-slate-900 font-semibold align-top whitespace-nowrap">
                        {currency}{charge.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* Empty Filling Row to extend vertical border lines down */}
                  <tr className="h-32 sm:h-48 print:h-48 border-b-2 border-black">
                    <td className="w-14 sm:w-16 border-r-2 border-black"></td>
                    <td className="border-r-2 border-black"></td>
                    <td className="w-36 sm:w-44"></td>
                  </tr>

                  {/* Summary Rows */}
                  {(Array.isArray(invoice.extraCharges) && invoice.extraCharges.length > 0) || invoice.discount > 0 || invoice.cgstAmount > 0 || invoice.sgstAmount > 0 || invoice.igstAmount > 0 ? (
                    <tr className="border-b border-black">
                      <td colSpan={2} className="border-r-2 border-black py-2 px-4 text-right font-bold text-xs uppercase text-slate-700">
                        Subtotal
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900">
                        {currency}{invoice.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ) : null}

                  {invoice.discount > 0 && (
                    <tr className="border-b border-black text-red-600">
                      <td colSpan={2} className="border-r-2 border-black py-2 px-4 text-right font-bold text-xs uppercase">
                        Less Discount
                      </td>
                      <td className="py-2 px-4 text-right font-bold">
                        -{currency}{invoice.discount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {invoice.cgstAmount > 0 && (
                    <tr className="border-b border-black">
                      <td colSpan={2} className="border-r-2 border-black py-2 px-4 text-right font-semibold text-xs text-slate-700 uppercase">
                        CGST ({(invoice.gstPercentage/2).toFixed(1)}%)
                      </td>
                      <td className="py-2 px-4 text-right font-semibold text-slate-900">
                        {currency}{invoice.cgstAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {invoice.sgstAmount > 0 && (
                    <tr className="border-b border-black">
                      <td colSpan={2} className="border-r-2 border-black py-2 px-4 text-right font-semibold text-xs text-slate-700 uppercase">
                        SGST ({(invoice.gstPercentage/2).toFixed(1)}%)
                      </td>
                      <td className="py-2 px-4 text-right font-semibold text-slate-900">
                        {currency}{invoice.sgstAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {invoice.igstAmount > 0 && (
                    <tr className="border-b border-black">
                      <td colSpan={2} className="border-r-2 border-black py-2 px-4 text-right font-semibold text-xs text-slate-700 uppercase">
                        IGST ({invoice.gstPercentage}%)
                      </td>
                      <td className="py-2 px-4 text-right font-semibold text-slate-900">
                        {currency}{invoice.igstAmount.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  {/* Grand Total Row (Standard) */}
                  <tr className="border-b-2 border-black bg-slate-100 font-extrabold text-black">
                    <td colSpan={2} className="border-r-2 border-black py-3 px-4 text-right text-sm sm:text-base uppercase tracking-wider">
                      TOTAL AMOUNT RS
                    </td>
                    <td className="py-3 px-4 text-right text-base sm:text-lg whitespace-nowrap">
                      {currency}{invoice.grandTotal.toFixed(2)}
                    </td>
                  </tr>

                  {invoice.paidAmount > 0 && (
                    <>
                      <tr className="border-b border-black text-slate-700">
                        <td colSpan={2} className="border-r-2 border-black py-2 px-4 text-right font-semibold text-xs uppercase">
                          Less Advance / Paid Amount
                        </td>
                        <td className="py-2 px-4 text-right font-semibold">
                          -{currency}{invoice.paidAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-slate-50 font-extrabold text-black">
                        <td colSpan={2} className="border-r-2 border-black py-2.5 px-4 text-right text-sm uppercase tracking-wider">
                          NET BALANCE DUE
                        </td>
                        <td className="py-2.5 px-4 text-right text-base whitespace-nowrap">
                          {currency}{invoice.balanceAmount.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Box: Words, Bank Details, Terms & Signatures */}
            <div className="border-2 border-t-0 border-black p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              {/* Left Column: Amount in Words & Bank Details */}
              <div className="space-y-4 text-sm flex flex-col justify-between">
                <div>
                  <div className="font-bold uppercase text-xs text-slate-600 mb-1">Amount in Words:</div>
                  <div className="font-extrabold text-black capitalize bg-slate-50 p-2.5 border border-slate-300 rounded text-sm">
                    {settings?.currencySymbol === '₹' ? 'Rupees ' : ''}{amountToWords(invoice.grandTotal)} Only
                  </div>

                  {/* Bank Details */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="font-bold uppercase text-xs text-black underline mb-2">Payment & Bank Details:</div>
                    {company?.bankName ? (
                      <div className="grid grid-cols-[85px_1fr] gap-x-2 gap-y-1 text-xs text-slate-800">
                        <span className="font-semibold text-slate-600">Bank Name:</span>
                        <span className="font-bold text-black">{company.bankName}</span>
                        <span className="font-semibold text-slate-600">A/C Name:</span>
                        <span className="font-semibold text-black">{company.accountHolder || 'N/A'}</span>
                        <span className="font-semibold text-slate-600">A/C No:</span>
                        <span className="font-bold text-black">{company.accountNumber || 'N/A'}</span>
                        <span className="font-semibold text-slate-600">IFSC Code:</span>
                        <span className="font-bold text-black">{company.ifscCode || 'N/A'}</span>
                        {company.upiId && (
                          <>
                            <span className="font-semibold text-slate-600">UPI ID:</span>
                            <span className="font-bold text-black">{company.upiId}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">No bank details provided.</div>
                    )}
                  </div>
                </div>

                {/* Terms and Conditions */}
                {company?.termsAndConditions && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="font-bold uppercase text-xs text-black underline mb-1">Terms & Conditions:</div>
                    <div className="text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {company.termsAndConditions}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Signatures */}
              <div className="flex flex-col justify-end items-end space-y-12">
                <div className="text-right">
                  <div className="font-bold text-sm text-black mb-12">
                    For {company?.companyName || 'Transport Company'}
                  </div>
                  {company?.authorizedSignature ? (
                    <img src={company.authorizedSignature} alt="Signature" className="h-16 object-contain ml-auto mb-2" />
                  ) : (
                    <div className="h-16"></div> /* spacer for physical signature */
                  )}
                  <div className="border-t border-black pt-1 w-48 text-center text-xs font-bold text-black uppercase">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        </div>
      </div>
    </div>
  );
}

function CustomInvoiceHeader({ company }: { company: any }) {
  const name = (company?.companyName || '').toLowerCase().trim();

  // Match "S N Logistics" — check for 'logistics' keyword first (most specific)
  const isSNLogistics = name.includes('logistics') || name.includes('s n logistics') || name.includes('snl');

  // Match "V S Tiwari Transport" — check for 'tiwari' keyword
  const isVSTT = name.includes('tiwari') || name.includes('vstt') || name.includes('v s tiwari') || name.includes('v.s.tiwari');

  if (isSNLogistics) {
    return (
      <div className="w-full flex flex-col pt-3 pb-2 px-2">
        <div className="flex flex-col items-end text-[#0a192f] font-bold text-[13px] sm:text-[15px] leading-tight mr-4">
          <span>Mob.: 9823146925</span>
          <span className="mt-1">8923068135</span>
        </div>
        <div className="text-center mt-2 mb-3">
          <h1 className="text-[#800000] font-black text-[40px] sm:text-[50px] tracking-wider uppercase font-sans">
            S N LOGISTICS
          </h1>
        </div>
        <div className="border-b-[2px] border-[#800000] pb-2 mb-2 text-center px-2">
          <p className="text-[#0a192f] font-bold text-[14px] sm:text-[16px] leading-snug">
            Address : Room No. 2129, Tiwari Flour Mill, Dhodipooja, Boisar,<br />
            Tal & Dist. Palghar, Pin 401 501, Maharashtra
          </p>
        </div>
      </div>
    );
  }

  if (isVSTT) {
    return (
      <div className="w-full flex flex-col pt-3 pb-3 px-2 mb-2">
        <div className="flex flex-col items-end text-[#cc0000] font-bold text-[13px] sm:text-[15px] leading-tight mr-4">
          <span>Mob .: 9823146925</span>
          <span className="mt-1">8923068135</span>
        </div>
        <div className="text-center mt-1 mb-2">
          <h1 className="text-[#cc0000] font-black text-[40px] sm:text-[48px] tracking-wide uppercase font-sans">
            V. S. TIWARI TRANSPORT
          </h1>
        </div>
        <div className="border-t-[1.5px] border-b-[1.5px] border-[#cc0000] py-2 text-center px-2">
          <p className="text-[#cc0000] font-bold text-[14px] sm:text-[16px]">
            Room No. 563, Dhodipuja, Navapur Road, Boisar, Tal. Dist. Palghar, 401 501 Maharashtra
          </p>
        </div>
      </div>
    );
  }

  // Generic fallback for any other company
  return (
    <div className="text-center border-b-2 border-black pb-4 mb-4 pt-4">
      {company?.logo && (
        <img src={company.logo} alt="Company Logo" className="h-14 sm:h-16 mx-auto mb-2 object-contain max-w-full" />
      )}
      <h1 className="text-2xl sm:text-3xl print:text-3xl font-extrabold text-black uppercase tracking-wide">
        {company?.companyName || 'TRANSPORT COMPANY'}
      </h1>
      {company?.address && <p className="text-sm text-slate-700 mt-1">{company.address}</p>}
      {(company?.city || company?.state) && (
        <p className="text-sm text-slate-700">{company.city}, {company.state} {company.pinCode}</p>
      )}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs sm:text-sm font-medium text-slate-800 mt-2">
        {company?.phone && <span><strong>Phone:</strong> {company.phone}</span>}
        {company?.email && <span><strong>Email:</strong> {company.email}</span>}
        {company?.gstNumber && <span><strong>GSTIN:</strong> {company.gstNumber}</span>}
        {company?.panNumber && <span><strong>PAN:</strong> {company.panNumber}</span>}
      </div>
    </div>
  );
}

function MonthlyKmPreview({ invoice, company, customer, amountToWords }: any) {
  return (
    <div className="text-black font-sans text-sm bg-white relative h-full">
      {/* Custom HTML Header */}
      <CustomInvoiceHeader company={company} />
      

      <div className="border-t-[3px] border-black pt-1 px-1 mt-1">
        {/* Top Header */}
        <div className="flex justify-between items-start mb-2 mt-2 px-1">
        <div className="flex flex-col w-[65%]">
          <div className="flex gap-2 font-bold text-[15px]">
            <span>To :-</span>
            <span className="uppercase">{customer?.companyName || customer?.customerName || ''},</span>
          </div>
          <div className="ml-10 font-bold text-[15px] uppercase">
            {(customer?.billingAddress || '').replace(/\n/g, ' ')} {customer?.city || ''} {customer?.pinCode || ''}
          </div>
          <div className="mt-1 text-[14px]">
            GST Number : <span className="uppercase">{customer?.gstNumber || ''}</span>
          </div>
        </div>
        
        <div className="w-[30%]">
          <table className="w-full border-collapse border-[2px] border-black font-semibold text-[14px]">
            <tbody>
              <tr>
                <td className="border-[2px] border-black p-1 pl-2 w-[40%]">Bill No.</td>
                <td className="border-[2px] border-black p-1 text-center w-[60%]">{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td className="border-[2px] border-black p-1 pl-2">Bill Date</td>
                <td className="border-[2px] border-black p-1 text-center">{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border-[2px] border-black mt-2">
        <thead>
          <tr>
            <th className="border-[2px] border-black p-1.5 w-[8%] text-center text-[15px]">Sr. No.</th>
            <th className="border-[2px] border-black p-1.5 w-[67%] text-center text-[15px]">Transport Charges</th>
            <th className="border-[2px] border-black p-1.5 w-[25%] text-center text-[15px]">Amount, Rs</th>
          </tr>
        </thead>
        <tbody>
          {/* Main Info Row */}
          <tr className="border-none">
            <td className="border-r-[2px] border-black p-2 text-center text-[15px] align-top font-semibold">1</td>
            <td className="border-r-[2px] border-black p-2 pb-4 flex flex-col align-top font-semibold">
              <div className="font-bold underline text-[15px] mb-1">
                A. Minimum Monthly Billing : {invoice.baseKm || 0} KM.
              </div>
              <div className="text-[14px] flex">
                <span className="w-36">a) {
                  !invoice.vehicleCapacity 
                    ? 'Up to 8 Ton' 
                    : /^\d+(\.\d+)?$/.test(invoice.vehicleCapacity.trim()) 
                      ? `Up to ${invoice.vehicleCapacity.trim()} Ton` 
                      : invoice.vehicleCapacity
                }</span>
                <span>: Rs {(invoice.baseRate || 0).toFixed(2)}/KM</span>
              </div>

              <div className="text-[14px] flex mt-2">
                <span className="w-36">b) After {invoice.baseKm || 0} KM</span>
                <span>: Rs {(invoice.extraKmRate || 0).toFixed(2)}/KM</span>
              </div>

              <div className="font-bold underline uppercase text-[15px] mt-3">
                VEHICLE NO : {invoice.vehicleNumber || ''}
              </div>

              <div className="text-[14px] mt-2">
                Period : {invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString('en-GB') : ''} to {invoice.periodEnd ? new Date(invoice.periodEnd).toLocaleDateString('en-GB') : ''}
              </div>

              <div className="text-[14px] mt-2 mb-1">
                KM Reading<br/>
                <div className="flex"><span className="w-36">On {invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString('en-GB') : ''}</span> <span>{invoice.startKm || 0}</span></div>
                <div className="flex"><span className="w-36">On {invoice.periodEnd ? new Date(invoice.periodEnd).toLocaleDateString('en-GB') : ''}</span> <span>{invoice.endKm || 0}</span></div>
                <div className="flex mt-1"><span className="w-36">Chargeable KM</span> <span>{Math.max(0, (invoice.endKm || 0) - (invoice.startKm || 0))} KM</span></div>
              </div>
            </td>
            <td className="border-r-[2px] border-black p-2 text-right text-[15px] align-top font-semibold"></td>
          </tr>

          {/* Sub Table Header Row */}
          <tr className="border-none text-[14px] font-semibold">
            <td className="border-r-[2px] border-black"></td>
            <td className="border-r-[2px] border-black p-1 pr-16 flex justify-end">
              <div className="flex w-[55%] justify-between">
                <span className="underline mr-auto">Transport Charges</span>
                <span className="w-16 text-right">KM</span>
                <span className="w-24 text-right">Rate, Rs</span>
              </div>
            </td>
            <td className="border-r-[2px] border-black"></td>
          </tr>

          {/* Sub Table Row 1 (Base KM) */}
          <tr className="border-none text-[14px] font-semibold">
            <td className="border-r-[2px] border-black"></td>
            <td className="border-r-[2px] border-black p-1 pr-16 flex justify-end">
              <div className="flex w-[55%] justify-end">
                <span className="w-16 text-right">{invoice.baseKm || 0}</span>
                <span className="w-24 text-right">{(invoice.baseRate || 0).toFixed(2)}</span>
              </div>
            </td>
            <td className="border-r-[2px] border-black p-1 pr-2 text-right text-[15px] align-top">
              {((invoice.baseKm || 0) * (invoice.baseRate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* Sub Table Row 2 (Extra KM) */}
          <tr className="border-none text-[14px] font-semibold">
            <td className="border-r-[2px] border-black"></td>
            <td className="border-r-[2px] border-black p-1 pb-4 pr-16 flex justify-end">
              <div className="flex w-[55%] justify-end">
                <span className="w-16 text-right">{Math.max(0, (invoice.endKm || 0) - (invoice.startKm || 0) - (invoice.baseKm || 0))}</span>
                <span className="w-24 text-right">{(invoice.extraKmRate || 0).toFixed(2)}</span>
              </div>
            </td>
            <td className="border-r-[2px] border-black p-1 pb-4 pr-2 text-right text-[15px] align-top">
              {(Math.max(0, (invoice.endKm || 0) - (invoice.startKm || 0) - (invoice.baseKm || 0)) * (invoice.extraKmRate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* Summary rows */}
          <tr className="border-t-[2px] border-black font-bold text-[14px]">
             <td className="border-r-[2px] border-black p-1.5"></td>
             <td className="border-r-[2px] border-black p-1.5 pl-2 flex justify-between pr-4">
                <span>TOTAL</span>
                <span className="ml-auto mr-12">{Math.max(0, (invoice.endKm || 0) - (invoice.startKm || 0))} <span className="ml-2">KM</span></span>
                <span className="mr-8">Rs.</span>
             </td>
             <td className="p-1.5 pr-2 text-right">
                {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </td>
          </tr>
          <tr className="border-t-[2px] border-black font-bold text-[14px]">
             <td className="border-r-[2px] border-black p-1.5"></td>
             <td className="border-r-[2px] border-black p-1.5 pr-12 text-right">R/O</td>
             <td className="p-1.5 pr-2 text-right"></td>
          </tr>
          <tr className="border-t-[2px] border-black font-bold text-[14px]">
             <td className="border-r-[2px] border-black p-1.5"></td>
             <td className="border-r-[2px] border-black p-1.5 pr-10 text-right">TOTAL</td>
             <td className="p-1.5 pr-2 text-right">
                {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </td>
          </tr>
          <tr className="border-t-[2px] border-black font-bold text-[15px]">
             <td className="border-r-[2px] border-black p-1.5"></td>
             <td colSpan={2} className="p-2 pb-2 pt-3">
                Amount Rupees {amountToWords(invoice.grandTotal)} Only
                <div className="w-[65%] border-b-[2px] border-black mt-3"></div>
                <div className="w-[45%] border-b-[2px] border-black mt-3"></div>
             </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex justify-between items-end mt-2 mb-4 text-[14px] font-semibold px-2">
         <div className="flex flex-col gap-1">
            <div className="flex"><span className="w-10">PAN</span> <span>: {company?.panNumber || ''}</span></div>
            <div className="flex"><span className="w-10">GST</span> <span>: {company?.gstNumber || ''}</span></div>
         </div>
         <div className="flex flex-col mr-10 items-center text-[14px]">
            <span>For {company?.companyName || 'Transport Company'}</span>
            <span className="mt-6">Proprietor</span>
         </div>
      </div>

      <div className="border-b-[3px] border-black w-full pb-1 mb-1"></div>
      </div>
    </div>
  );
}
