
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AnimatedLogo from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setNewPassword } from '@/services/passwordResetService';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{password?: string; confirmPassword?: string}>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    // Extract contactId from URL query params
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    setContactId(id);
    
    if (!id) {
      console.warn('No contact ID found in URL');
    } else {
      console.log('Contact ID found:', id);
    }
    
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [location]);

  const validateForm = (): boolean => {
    const newErrors: {password?: string; confirmPassword?: string} = {};
    let isValid = true;

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    
    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }
    
    if (!contactId) {
      toast.error('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Submitting password reset for contact ID:', contactId);
      
      // Use the iframe-based approach to set the new password
      const success = await setNewPassword(contactId, password);
      
      if (success) {
        toast.success('Password has been reset successfully');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        throw new Error('Failed to reset password. Please try again later.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMsg = 'An error occurred while resetting your password. Please try again.';
      
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setGeneralError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-gray-100 to-transparent opacity-70 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-gradient-to-tr from-gray-100 to-transparent opacity-70 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/4"></div>
      </div>
      
      <div className="z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <AnimatedLogo />
          </Link>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Reset Your Password</h2>
            <p className="text-gray-600">
              Enter a new password for your account
            </p>
          </div>
          
          {generalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}
          
          {!contactId ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">Invalid or expired reset link. Please request a new password reset.</p>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-black hover:bg-black/80 text-white"
              >
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  New Password
                </label>
                <Input 
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <Input 
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-black/80 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </motion.div>
        
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Link to="/login" className="text-sm text-gray-600 hover:text-black transition-colors inline-flex items-center">
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Return to Login
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
