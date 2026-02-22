import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { validateRacerEmail, trackRacerLogin } from '@/services/racerService';
import { fetchMemberByEmail } from '@/services/loginService';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { validateLoginForm } from '@/utils/loginValidation';

const RacerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateLoginForm(email, password);
    if (!isValid) {
      setErrors(validationErrors);
      toast.error('Please correct the errors in the form');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Fetch full member data (includes ripassword)
      const member = await fetchMemberByEmail(email.trim());

      if (!member) {
        toast.error('No account found for this email.');
        return;
      }

      // Validate password against ripassword from API
      if (!member.ripassword || password !== member.ripassword.toString()) {
        toast.error('Invalid password. Please try again.');
        return;
      }

      // Store racer data in session with all profile fields
      const racerData = {
        id: member.id,
        email: member.email,
        name: member.name,
        firstName: member.firstname || '',
        lastName: member.lastname || '',
        status: member.status,
        title: member.jobtitle || '',
        phone: member.phone,
        mobile: member.mobile,
        website: member.website || '',
        mailingstreet: member.mailingstreet,
        mailingcity: member.mailingcity || '',
        mailingstate: member.mailingstate || '',
        mailingzip: member.mailingzip || '',
        mailingcountry: member.mailingcountry || '',
      };
      sessionStorage.setItem('racerUser', JSON.stringify(racerData));

      // Update UserContext
      setUser({
        id: member.id,
        name: member.name,
        email: member.email,
        status: member.status,
        phone: member.phone,
        mobile: member.mobile,
        mailingstreet: member.mailingstreet,
        mediaHubAccess: 'Viewer',
        role: 'racer',
      });

      // Track login (fire and forget)
      trackRacerLogin(member.id).catch(() => {});

      toast.success('Login successful');
      navigate('/racer/dashboard');
    } catch (err: any) {
      console.error('Racer login error:', err);
      toast.error('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4 relative">
      {/* Background effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/4" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 w-full max-w-md space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold racing-gradient-text tracking-tight">
            WMC RACER PORTAL
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to access your racer application
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground">Racer Sign In</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your WMC credentials
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={errors.email ? 'border-destructive' : ''}
                  autoFocus
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Need access?{' '}
                <a
                  href="mailto:racers@worldmotoclash.com?subject=Racer%20Portal%20Access%20Request"
                  className="text-primary font-medium hover:underline"
                >
                  Contact us
                </a>{' '}
                for account credentials.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} World Moto Clash. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default RacerLogin;
