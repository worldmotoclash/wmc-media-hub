
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import GoogleSignInButton from './GoogleSignInButton';

interface LoginFormFieldsProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  rememberMe: boolean;
  setRememberMe: (rememberMe: boolean) => void;
  errors: {email?: string; password?: string};
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onGoogleSignIn: () => void;
  isGoogleLoading?: boolean;
}

const LoginFormFields: React.FC<LoginFormFieldsProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  errors,
  isLoading,
  onSubmit,
  onForgotPassword,
  onGoogleSignIn,
  isGoogleLoading = false
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email Address
        </label>
        <Input 
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className={`w-full ${errors.email ? 'border-red-500' : ''}`}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <button 
            type="button" 
            onClick={onForgotPassword}
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <Input 
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={`w-full ${errors.password ? 'border-red-500' : ''}`}
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="remember"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked as boolean)} 
        />
        <label
          htmlFor="remember"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-600"
        >
          Remember me for 30 days
        </label>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-black hover:bg-black/80 text-white"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <GoogleSignInButton 
        onClick={onGoogleSignIn} 
        isLoading={isGoogleLoading} 
      />
    </form>
  );
};

export default LoginFormFields;
