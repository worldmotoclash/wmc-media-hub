import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

/**
 * Restricts /racer/reports pages to Admin / Editor / Creator.
 * - Unauthenticated -> /login
 * - Viewer (or any non-allowed role) -> /admin/media with toast
 * Returns true while a redirect is in flight (page should render null).
 */
export function useRacerReportsGuard(): boolean {
  const { user, isAdmin, isEditor, isCreator } = useUser();
  const navigate = useNavigate();

  const unauthenticated = !user;
  const allowed = !!user && (isAdmin() || isEditor() || isCreator());
  const blocked = unauthenticated || !allowed;

  useEffect(() => {
    if (unauthenticated) {
      navigate('/login');
      return;
    }
    if (!allowed) {
      toast.error('This feature is not available for your access level');
      navigate('/admin/media');
    }
  }, [unauthenticated, allowed, navigate]);

  return blocked;
}
