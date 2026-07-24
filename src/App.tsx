import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { CompanyProfile } from './pages/CompanyProfile';
import { Customers } from './pages/Customers';
import { Settings } from './pages/Settings';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoicePreview } from './pages/InvoicePreview';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
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
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
