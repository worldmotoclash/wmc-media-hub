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

      // Try to sign in anonymously if user is logged in
      if (user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        
        if (error) {
          // Anonymous auth is likely disabled - warn but don't fail
          if (error.message.includes('anonymous_provider_disabled') || error.message.includes('Anonymous sign-ins are disabled')) {
            console.warn('Anonymous authentication is disabled in Supabase. Database operations may fail due to RLS policies.');
            toast.error('Database authentication unavailable. Please enable Anonymous Auth in Supabase settings.');
            setIsReady(true); // Still mark as ready so UI doesn't hang
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
    return session !== null;
  }, [session]);

  return { 
    session, 
    isReady, 
    hasValidSession, 
    checkAndCreateSession 
  };
};