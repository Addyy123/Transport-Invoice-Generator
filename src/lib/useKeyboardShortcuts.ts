import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in a form field for Esc key
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (document.activeElement?.tagName || '').toUpperCase()
      );

      // Ctrl + N -> Create new invoice
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (location.pathname !== '/create-invoice') {
          navigate('/create-invoice');
          toast.info('New invoice form opened (Ctrl+N)');
        }
      }

      // Ctrl + S -> Trigger save event
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:save'));
      }

      // Esc -> Go back if not typing in input and not on dashboard
      if (e.key === 'Escape') {
        if (isInputActive) {
          (document.activeElement as HTMLElement)?.blur();
        } else if (location.pathname !== '/' && !location.pathname.startsWith('/login')) {
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);
}
