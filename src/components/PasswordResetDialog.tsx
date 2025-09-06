
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { fetchInvestorData } from '@/services/loginService';
import { requestPasswordReset } from '@/services/passwordResetService';

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PasswordResetDialog: React.FC<PasswordResetDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const handleReset = () => {
    setEmail('');
    setIsLoading(false);
    setIsSuccess(false);
    setErrorMessage('');
  };
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // First, fetch investor data to find the contact ID
      console.log('Fetching investor data to find contact ID for:', email);
      const investorData = await fetchInvestorData();
      
      // Find the investor by email (case-insensitive)
      const investor = investorData.find((inv: any) => 
        inv.email && inv.email.toLowerCase() === email.toLowerCase()
      );
      
      if (!investor) {
        setErrorMessage('Email not found. Please check your email address.');
        setIsLoading(false);
        return;
      }

      console.log('Found investor for password reset:', investor.id);
      
      // Use the iframe-based approach to request password reset
      // Note: We're directly passing the ID from the investor data
      const success = await requestPasswordReset(investor.id);
      
      if (success) {
        setIsSuccess(true);
        toast.success(
          'Password reset instructions have been sent to your email.',
          { duration: 5000 }
        );
        
        // Close dialog after showing success message
        setTimeout(() => {
          onOpenChange(false);
          handleReset();
        }, 3000);
      } else {
        throw new Error('Failed to send password reset request. Please try again later.');
      }
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMsg = 'An error occurred while processing your request.';
      
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      toast.error('Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleReset();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Enter your email address below and we'll send you instructions to reset your password.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {isSuccess ? (
            <Alert>
              <AlertDescription className="text-green-600 font-medium">
                Password reset request sent. Please check your email for instructions.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={isLoading}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Processing...' : 'Send Reset Link'}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetDialog;
