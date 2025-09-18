import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

export const useSupabaseAuth = () => {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      // Create a simple anonymous session when user logs in
      signInAnonymously();
    }
  }, [user]);

  const signInAnonymously = async () => {
    try {
      // Check if already signed in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;

      // Sign in anonymously to enable database operations
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('Supabase auth error:', error);
        return;
      }

      console.log('Supabase anonymous auth successful');
    } catch (error) {
      console.error('Failed to authenticate with Supabase:', error);
      toast.error('Database authentication failed');
    }
  };

  return { signInAnonymously };
};