import localforage from 'localforage';

localforage.config({
  name: 'TransportInvoiceGenerator',
  storeName: 'data'
});

export const db = {
  company: localforage.createInstance({ name: 'TransportInvoiceGenerator', storeName: 'company' }),
  customers: localforage.createInstance({ name: 'TransportInvoiceGenerator', storeName: 'customers' }),
  invoices: localforage.createInstance({ name: 'TransportInvoiceGenerator', storeName: 'invoices' }),
  settings: localforage.createInstance({ name: 'TransportInvoiceGenerator', storeName: 'settings' }),
};
