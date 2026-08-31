# Transport Invoice Generator - Master Blueprint

## 1. Product Name

Transport Invoice Generator

## 2. Product Goal

Build a professional invoice generator for transport businesses, truck owners, freight brokers, and small logistics teams.

The app should help owners and staff create clean, accurate, GST-ready transport invoices with route, vehicle, consignment, freight, payment, PDF, and Gmail sharing features.

The app should be simple enough that office staff can use it without training, but strong enough to later grow into a cloud-based transport billing system.

---

## 3. Development Philosophy

Build a professional app, but keep dependency size under control.

Use useful light-to-medium dependencies when they improve quality and save time.

Avoid large dependencies unless they are truly needed for an important feature.

The app should not be a toy demo. It should be practical, clean, maintainable, and ready for future cloud upgrade.

---

## 4. Recommended Tech Stack

Frontend:
- Vite
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- Lucide React

Storage for first version:
- IndexedDB preferred
- localStorage acceptable for simple settings
- Export/import JSON backup

PDF:
- Browser print with print CSS first
- Use a small PDF library only if needed

Email:
- Gmail compose link in first version
- Direct email sending in future cloud version

Future cloud upgrade:
- Supabase or Firebase
- Cloud database
- Authentication
- Team accounts
- Direct email sending

Avoid in first version:
- Docker
- Prisma
- PostgreSQL local setup
- Large admin templates
- Heavy animation libraries
- OCR/AI packages
- Gmail API/OAuth
- Large state management libraries

---

## 5. Target Users

Primary users:
- Transport company owners
- Truck owners
- Fleet operators
- Freight brokers
- Small logistics businesses

Secondary users:
- Office staff
- Billing staff
- Accountants
- Operations assistants

---

## 6. Main Problem

Many small transport businesses create invoices manually using Excel, Word, WhatsApp, or handwritten bills.

This causes:
- Slow invoice creation
- Manual calculation errors
- Missing GST information
- Unprofessional invoice format
- Difficulty finding old invoices
- Repeated typing of customer/company details
- Confusion while emailing invoices
- No simple backup system

---

## 7. Product Solution

Create a web app where users can:

- Save company details once
- Save customer details
- Create transport-specific invoices
- Add route, vehicle, driver, and consignment details
- Add freight and extra charges
- Automatically calculate GST and totals
- Preview a professional invoice
- Print or save invoice as PDF
- Open Gmail with a professional pre-filled message
- Save invoice history
- Export/import backup data

---

## 8. Core Modules

### Dashboard

Purpose:
Give the owner/staff a quick overview of invoice activity.

Show:
- Total invoices
- Pending invoices
- Paid invoices
- Total billed amount
- Outstanding balance
- Recent invoices
- Quick action button: Create Invoice

---

### Company Profile

Purpose:
Store transport business information once and reuse it on invoices.

Fields:
- Company name
- Logo
- GST number
- PAN number
- Address
- City
- State
- PIN code
- Phone
- Email
- Website
- Bank name
- Account holder name
- Account number
- IFSC code
- UPI ID
- Default terms and conditions
- Authorized signature

Requirements:
- Save data locally
- Allow editing
- Validate important fields
- Warn if uploaded image is too large

---

### Customer Management

Purpose:
Save customer/party details for repeated invoice creation.

Fields:
- Customer name
- Company name
- GST number
- Billing address
- Shipping address
- City
- State
- PIN code
- Phone
- Email
- Notes

Features:
- Add customer
- Edit customer
- Delete customer
- Search customer
- View customer invoice history

---

### Create Invoice

Purpose:
Main screen where staff create a transport invoice.

Invoice details:
- Invoice number
- Invoice date
- Due date
- Payment status
- Customer selection

Transport details:
- LR number
- Trip number
- Booking number
- From location
- To location
- Distance in KM
- Vehicle number
- Vehicle type
- Driver name
- Driver phone

Consignment details:
- Goods description
- Weight
- Number of packages
- Consignment number
- Remarks

Charges:
- Freight charge
- Loading charge
- Unloading charge
- Toll charge
- Fuel/diesel charge
- Parking charge
- Driver allowance
- Detention charge
- Other charge
- Discount
- GST percentage
- Paid amount
- Round off

Automatic calculations:
- Subtotal
- Discounted subtotal
- GST amount
- CGST
- SGST
- IGST
- Grand total
- Balance amount

Actions:
- Save draft
- Save invoice
- Preview
- Print
- Share via Gmail

---

### Invoice Preview

Purpose:
Show a professional A4-style invoice before printing or sharing.

Preview includes:
- Company logo and details
- GST and PAN
- Invoice number and dates
- Customer details
- Route details
- Vehicle details
- Driver details
- Consignment details
- Charges table
- GST summary
- Grand total
- Paid amount
- Balance
- Bank details
- Terms and conditions
- Signature area

Requirements:
- Print-friendly
- Clean borders
- Professional spacing
- Works on A4 paper

---

### Print / PDF

Purpose:
Allow users to save or print invoices.

First version:
- Use browser print
- Add print CSS
- User can select “Save as PDF”

Requirements:
- Hide sidebar/buttons while printing
- Fit invoice on A4
- Use clear black text
- Keep layout professional

Optional:
Use a small PDF library only if browser printing is not enough.

---

### Gmail Sharing

Purpose:
Help staff send invoice details to party quickly.

MVP behavior:
- Open Gmail compose URL
- Pre-fill customer email
- Pre-fill subject
- Pre-fill professional message

Subject:
Transport Invoice - {Invoice Number}

Message:
Dear {Customer Name},

Please find the transport invoice details below.

Invoice Number: {Invoice Number}
Route: {From Location} to {To Location}
Vehicle Number: {Vehicle Number}
Total Amount: ₹{Grand Total}

Please attach the downloaded PDF invoice before sending.

Thank you for choosing {Company Name}.

Regards,
{Company Name}

Important:
MVP cannot automatically attach local PDF files through Gmail URL. User downloads PDF first, then attaches it manually.

Future version:
Direct email sending with attachment using backend email service.

---

### Invoice History

Purpose:
Let users find and manage old invoices.

Features:
- List all invoices
- Search by invoice number
- Search by customer name
- Search by route
- Search by vehicle number
- Filter by payment status
- Filter by date
- View invoice
- Edit invoice
- Duplicate invoice
- Delete invoice
- Print invoice

Statuses:
- Draft
- Pending
- Partially Paid
- Paid
- Cancelled
- Overdue

---

### Settings

Purpose:
Control defaults and backup.

Fields/features:
- Currency symbol
- Default GST percentage
- Default payment terms
- Default invoice prefix
- Export all data as JSON
- Import backup JSON
- Reset all data

Requirements:
- Confirm before reset
- Validate import file before saving
- Show success/error messages

---

## 9. Data Storage Plan

First version:
- Use IndexedDB for invoices/customers/company profile
- Use localStorage only for small settings
- Do not store generated PDFs
- Store invoice data as JSON
- Compress or limit image uploads

Why:
This keeps the app practical without needing a server from day one.

Future:
Move data to Supabase/Firebase for cloud sync and multi-device use.

---

## 10. Invoice Numbering

Default format:
INV-YYYY-001

Example:
INV-2026-001
INV-2026-002
INV-2026-003

Rules:
- Invoice number should auto-generate
- User can edit if needed
- Avoid duplicate invoice numbers
- Reset numbering yearly if setting is enabled later

---

## 11. GST Rules

Support:
- 0%
- 5%
- 12%
- 18%
- Custom percentage

Tax split:
- CGST + SGST for same-state billing
- IGST for different-state billing

First version:
Allow user to choose:
- CGST/SGST
- IGST
- No GST

---

## 12. Validation Rules

Required fields:
- Company name
- Customer name
- Invoice number
- Invoice date
- From location
- To location
- Freight charge or at least one charge
- GST option

Format validation:
- Email
- Phone number
- GST number
- PAN number
- IFSC code
- Vehicle number

Calculation validation:
- Amounts cannot be negative
- GST cannot be negative
- Paid amount cannot exceed grand total unless allowed manually
- Grand total cannot be below zero

---

## 13. Design Requirements

The app should feel:
- Professional
- Clean
- Practical
- Fast
- Easy for staff

Design rules:
- No landing page
- First screen is dashboard
- Clear sidebar/top navigation
- Large readable forms
- Logical sections
- Minimal colors
- Professional invoice layout
- Mobile-friendly
- No unnecessary animations
- No heavy decorative design

Recommended colors:
- White background
- Dark text
- Blue primary buttons
- Green success
- Orange warning
- Red danger
- Light gray borders

---

## 14. User Flow

Basic user flow:

1. Open app
2. Add company profile
3. Add customer
4. Create invoice
5. Select customer
6. Enter transport details
7. Enter charges
8. Preview invoice
9. Save invoice
10. Print or save as PDF
11. Open Gmail draft
12. Attach PDF manually
13. Send to party

---

## 15. Success Criteria

The MVP is successful when:

- Staff can create invoice without training
- Invoice can be created in under 2 minutes
- GST and total calculations are correct
- Invoice looks professional in PDF/print
- Customer and company details are reused
- Old invoices can be searched
- Data can be backed up/exported
- App works well on desktop and mobile
- App does not use unnecessary heavy dependencies

---

## 16. Development Phases

### Phase 1: Foundation
- Project setup
- App layout
- Navigation
- Reusable UI components
- Dashboard shell

### Phase 2: Business Data
- Company profile
- Customer management
- Settings

### Phase 3: Invoice Core
- Invoice data model
- Calculation utilities
- Invoice form
- Auto invoice number
- Save/edit invoice

### Phase 4: Output
- Invoice preview
- Print CSS
- PDF save through browser
- Gmail sharing

### Phase 5: Management
- Invoice history
- Search/filter
- Duplicate invoice
- Export/import backup

### Phase 6: Polish
- Mobile responsiveness
- Validation improvement
- UI polish
- Bug fixing
- Testing

---

## 17. Future Cloud Upgrade

Add later after MVP works:

- Login
- Owner and staff roles
- Cloud database
- Multi-device sync
- Direct invoice email with PDF attachment
- Stored invoice PDFs
- Payment tracking
- WhatsApp sharing
- Dashboard analytics
- Vehicle management
- Driver management
- Trip management
- Expense tracking
- Reports

Recommended cloud choices:
- Supabase for database, auth, and storage
- Firebase as alternative
- Resend or SendGrid for email sending

---

## 18. Future AI Upgrade

Add only after core app is stable:

- Create invoice from natural language prompt
- OCR from LR/POD/invoice images
- Smart freight suggestion
- GST/HSN suggestions
- Payment reminder message generation
- Revenue summary
- Customer payment behavior insights

---

## 19. Antigravity Global Instruction

Use this instruction at the top of every coding prompt:

Build a professional Transport Invoice Generator for transport businesses.

Use useful light-to-medium dependencies when they improve quality, validation, UI, maintainability, or PDF/print output.

Avoid unnecessary large dependencies. Do not add backend, database server, authentication, OCR, AI, Gmail API, Docker, Prisma, or PostgreSQL in the first version unless specifically requested.

Use Vite, React, TypeScript, Tailwind CSS, React Hook Form, Zod, Lucide React, IndexedDB/localStorage, and print-friendly invoice output.

The app should be practical, clean, easy for staff, mobile-friendly, and ready for future cloud upgrade.