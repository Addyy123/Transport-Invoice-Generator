import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { CompanyProfile } from './pages/CompanyProfile';
import { Customers } from './pages/Customers';
import { Settings } from './pages/Settings';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoicePreview } from './pages/InvoicePreview';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="create-invoice" element={<CreateInvoice />} />
            <Route path="edit-invoice/:id" element={<CreateInvoice />} />
            <Route path="invoice/:id" element={<InvoicePreview />} />
            <Route path="customers" element={<Customers />} />
            <Route path="profile" element={<CompanyProfile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
