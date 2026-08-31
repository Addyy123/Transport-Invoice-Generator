import { z } from 'zod';

const processNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

const processZero = (val: any) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = Number(val);
  return Number.isNaN(num) ? 0 : num;
};

const numOpt = z.preprocess(processNumber, z.number().optional());
const numZero = z.preprocess(processZero, z.number().default(0));

export const companySchema = z.object({
  id: z.string().optional(),
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
  vehicles: z.array(z.string()).optional(),
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

export const tripSchema = z.object({
  id: z.string(),
  vehicleNumber: z.string().optional(),
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  periodStart: numOpt,
  periodEnd: numOpt,
  startKm: numOpt,
  endKm: numOpt,
  ratePerKm: numOpt,
});

export const invoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: numOpt,
  dueDate: numOpt,
  status: z.enum(['Draft', 'Pending', 'Partially Paid', 'Paid', 'Cancelled', 'Overdue']),
  customerId: z.string().min(1, 'Customer is required'),
  companyId: z.string().default('profile'),
  
  // Transport Details
  billingType: z.string().default('STANDARD'),
  // Local Bill Fields
  numberOfTrips: numOpt,
  perTripRate: numOpt,
  localArea: z.string().optional(),
  localDeliveryNote: z.string().optional(),
  partyChallanNo: z.string().optional(),
  lrNumber: z.string().optional(),
  tripNumber: z.string().optional(),
  bookingNumber: z.string().optional(),
  fromLocation: z.string().optional().or(z.literal('')),
  toLocation: z.string().optional().or(z.literal('')),
  distanceKm: numOpt,
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),

  // Monthly KM Details
  baseKm: numOpt,
  baseRate: numOpt,
  vehicleCapacity: z.string().optional(),
  extraKmRate: numOpt,
  periodStart: numOpt,
  periodEnd: numOpt,
  startKm: numOpt,
  endKm: numOpt,
  
  // Temporary Bill (Per Trip) Details
  trips: z.array(tripSchema).default([]),

  // Consignment Details
  goodsDescription: z.string().optional(),
  weight: numOpt,
  weightUnit: z.string().default('KG'),
  numberOfPackages: numOpt,
  consignmentNumber: z.string().optional(),
  remarks: z.string().optional(),

  // Charges
  freightCharge: numZero,
  extraCharges: z.array(chargeSchema).default([]),
  discount: numZero,
  gstOption: z.enum(['NONE', 'CGST_SGST', 'IGST']).default('NONE'),
  gstPercentage: numZero,
  
  // Auto-calculated fields
  subtotal: numZero,
  discountedSubtotal: numZero,
  cgstAmount: numZero,
  sgstAmount: numZero,
  igstAmount: numZero,
  grandTotal: numZero,
  
  // Payments
  paidAmount: numZero,
  balanceAmount: numZero,
  roundOff: numZero,

  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceCharge = z.infer<typeof chargeSchema>;
export type InvoiceTrip = z.infer<typeof tripSchema>;

