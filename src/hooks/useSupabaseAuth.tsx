import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { Session } from '@supabase/supabase-js';

export const useSupabaseAuth = () => {
  const { user } = useUser();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  const checkAndCreateSession = useCallback(async () => {
    try {
      // Check if already signed in
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        setSession(existingSession);
        setIsReady(true);
        return true;
      }

      // If user is logged in but no Supabase session, try anonymous auth
      if (user) {
        const { data, error } = await supabase.auth.signInAnonymously();

        if (error) {
          // Anonymous auth disabled means we cannot perform authenticated DB writes.
          if (
            error.message.includes('anonymous_provider_disabled') ||
            error.message.includes('Anonymous sign-ins are disabled')
          ) {
            console.warn('Anonymous authentication is disabled in Supabase. Auth-required DB writes will not work.');
            setIsReady(true);
            return false;
          }
          throw error;
        }

        setSession(data.session);
        setIsReady(true);
        console.log('Supabase anonymous auth successful');
        return true;
      }

      setIsReady(true);
      return false;
    } catch (error: any) {
      console.error('Failed to authenticate with Supabase:', error);
      toast.error('Database authentication failed');
      setIsReady(true);
      return false;
    }
  }, [user]);

  useEffect(() => {
    checkAndCreateSession();
  }, [checkAndCreateSession]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasValidSession = useCallback(() => {
    // Only a real Supabase session will satisfy auth.uid() in RLS policies.
    return session !== null;
  }, [session]);

  return { 
    session, 
    isReady, 
    hasValidSession, 
    checkAndCreateSession 
  };
};