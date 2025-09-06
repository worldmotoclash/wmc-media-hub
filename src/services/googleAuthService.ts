import { User } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { authenticateUser, getCurrentIpAddress, getIPLocation } from './loginService';

// Function to initialize Google Sign-In
export const initializeGoogleAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google API script is already loaded
    if (window.google) {
      resolve();
      return;
    }

    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google API script'));
    document.head.appendChild(script);
  });
};

// Function to authenticate with Google
export const authenticateWithGoogle = async (): Promise<User | null> => {
  try {
    await initializeGoogleAuth();

    return new Promise((resolve, reject) => {
      const clientId = '779355943255-k9dq2kjagq70utjad1qsp0eraah4ep4s.apps.googleusercontent.com';
      
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(`Authentication failed: ${tokenResponse.error}`));
            return;
          }

          try {
            // Get user info from Google
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`
              }
            });

            if (!response.ok) {
              throw new Error('Failed to fetch user information');
            }

            const googleUser = await response.json();
            const email = googleUser.email;

            if (!email) {
              throw new Error('Email not provided by Google');
            }

            // Use the existing authentication flow with the email from Google
            // The system will check if this email exists in the approved investor database
            const userData = await authenticateUser(email, '', true);
            resolve(userData);
          } catch (error) {
            console.error('Google authentication error:', error);
            reject(error);
          }
        },
        error_callback: (error: any) => {
          console.error('Google OAuth error:', error);
          reject(new Error('Google authentication failed. Please try again.'));
        }
      });

      // Request access token with prompt to select account
      client.requestAccessToken({ prompt: 'select_account' });
    });
  } catch (error) {
    console.error('Google authentication initialization error:', error);
    toast.error('Failed to initialize Google authentication. Please try again.');
    return null;
  }
};
