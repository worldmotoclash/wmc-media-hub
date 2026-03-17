import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

/**
 * Redirects Creator-role users away from restricted pages.
 * Returns true if the user is a Creator (page should not render).
 */
export function useCreatorGuard(): boolean {
  const { user, isCreator } = useUser();
  const navigate = useNavigate();
  const blocked = !!user && isCreator();

  useEffect(() => {
    if (blocked) {
      toast.error('This feature is not available for your access level');
      navigate('/admin/media');
    }
  }, [blocked, navigate]);

  return blocked;
}
