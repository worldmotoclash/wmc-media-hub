import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { validateRacerEmail, trackRacerLogin } from '@/services/racerService';
import { useUser } from '@/contexts/UserContext';

const RacerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const member = await validateRacerEmail(email.trim());

      if (!member) {
        setError('No racer account found for this email. Contact WMC for access.');
        return;
      }

      // Store in session
      sessionStorage.setItem('racerUser', JSON.stringify(member));

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

      navigate('/racer/dashboard');
    } catch (err: any) {
      console.error('Racer login error:', err);
      setError('Unable to verify your email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold racing-gradient-text tracking-tight">
            WMC RACER PORTAL
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your registered email to access your application
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Racer Sign In</CardTitle>
            <CardDescription>Enter the email associated with your WMC account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} World Moto Clash. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RacerLogin;
