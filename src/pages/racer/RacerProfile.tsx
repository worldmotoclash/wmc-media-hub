import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import type { RacerMember } from '@/services/racerService';

const RacerProfile: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    setRacer(JSON.parse(stored));
  }, [navigate]);

  if (!racer) return null;

  const fields = [
    { label: 'Name', value: racer.name, icon: <User className="w-4 h-4" /> },
    { label: 'Email', value: racer.email, icon: <Mail className="w-4 h-4" /> },
    { label: 'Phone', value: racer.phone || '—', icon: <Phone className="w-4 h-4" /> },
    { label: 'Mobile', value: racer.mobile || '—', icon: <Phone className="w-4 h-4" /> },
    { label: 'Address', value: racer.mailingstreet || '—', icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <RacerPortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Profile</h2>
          <p className="text-muted-foreground text-sm mt-1">Your WMC member information</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-muted-foreground">
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm text-foreground">{f.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{racer.status || 'Active'}</p>
          </CardContent>
        </Card>
      </div>
    </RacerPortalLayout>
  );
};

export default RacerProfile;
