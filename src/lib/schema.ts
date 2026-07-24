import { z } from 'zod';

export const companySchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  logo: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
  termsAndConditions: z.string().optional(),
  authorizedSignature: z.string().optional(),
});

export type CompanyProfile = z.infer<typeof companySchema>;

export const customerSchema = z.object({
  id: z.string(),
  customerName: z.string().min(1, 'Customer Name is required'),
  companyName: z.string().optional(),
  gstNumber: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Customer = z.infer<typeof customerSchema>;

export const settingsSchema = z.object({
  currencySymbol: z.string().default('₹'),
  defaultGstPercentage: z.number().default(18),
  defaultPaymentTerms: z.string().default('Due on Receipt'),
  invoicePrefix: z.string().default('INV-YYYY-'),
});

export type Settings = z.infer<typeof settingsSchema>;

export const chargeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

export const invoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.number(),
  dueDate: z.number(),
  status: z.enum(['Draft', 'Pending', 'Partially Paid', 'Paid', 'Cancelled', 'Overdue']),
  customerId: z.string().min(1, 'Customer is required'),
  
  // Transport Details
  lrNumber: z.string().optional(),
  tripNumber: z.string().optional(),
  bookingNumber: z.string().optional(),
  fromLocation: z.string().min(1, 'From location is required'),
  toLocation: z.string().min(1, 'To location is required'),
  distanceKm: z.number().optional(),
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),

  // Consignment Details
  goodsDescription: z.string().optional(),
  weight: z.number().optional(),
  weightUnit: z.string().default('KG'),
  numberOfPackages: z.number().optional(),
  consignmentNumber: z.string().optional(),
  remarks: z.string().optional(),

  // Charges
  freightCharge: z.number().min(0).default(0),
  extraCharges: z.array(chargeSchema).default([]),
  discount: z.number().min(0).default(0),
  gstOption: z.enum(['NONE', 'CGST_SGST', 'IGST']).default('NONE'),
  gstPercentage: z.number().min(0).default(0),
  
  // Auto-calculated fields
  subtotal: z.number().default(0),
  discountedSubtotal: z.number().default(0),
  cgstAmount: z.number().default(0),
  sgstAmount: z.number().default(0),
  igstAmount: z.number().default(0),
  grandTotal: z.number().default(0),
  
  // Payments
  paidAmount: z.number().min(0).default(0),
  balanceAmount: z.number().default(0),
  roundOff: z.number().default(0),

  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceCharge = z.infer<typeof chargeSchema>;
