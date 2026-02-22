import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Building, MapPin, Phone, Save, Loader2, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import { updateRacerProfile } from '@/services/racerService';
import { US_STATES, COUNTRIES } from '@/data/address-options';
import type { RacerMember } from '@/services/racerService';

const COUNTRIES_WITH_STATES = ['US', 'CA'];

const RacerProfile: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    phone: '',
    mobile: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    const parsed: RacerMember = JSON.parse(stored);
    setRacer(parsed);
    setFormData({
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      email: parsed.email || '',
      title: parsed.title || '',
      phone: parsed.phone || '',
      mobile: parsed.mobile || '',
      street: parsed.mailingstreet || '',
      city: parsed.mailingcity || '',
      state: parsed.mailingstate || '',
      zip: parsed.mailingzip || '',
      country: parsed.mailingcountry || 'US',
    });
  }, [navigate]);

  if (!racer) return null;

  const handleCancel = () => {
    setFormData({
      firstName: racer.firstName || '',
      lastName: racer.lastName || '',
      email: racer.email || '',
      title: racer.title || '',
      phone: racer.phone || '',
      mobile: racer.mobile || '',
      street: racer.mailingstreet || '',
      city: racer.mailingcity || '',
      state: racer.mailingstate || '',
      zip: racer.mailingzip || '',
      country: racer.mailingcountry || 'US',
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateRacerProfile(racer.id, formData);

      // Update local racer state + sessionStorage
      const updated: RacerMember = {
        ...racer,
        firstName: formData.firstName,
        lastName: formData.lastName,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        title: formData.title,
        phone: formData.phone,
        mobile: formData.mobile,
        mailingstreet: formData.street,
        mailingcity: formData.city,
        mailingstate: formData.state,
        mailingzip: formData.zip,
        mailingcountry: formData.country,
      };
      setRacer(updated);
      sessionStorage.setItem('racerUser', JSON.stringify(updated));

      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Profile update error:', err);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [key]: e.target.value });

  return (
    <RacerPortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with Edit/Save/Cancel */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Profile</h2>
            <p className="text-muted-foreground text-sm mt-1">Your WMC member information</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isLoading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={formData.firstName} onChange={set('firstName')} disabled={!isEditing} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={formData.lastName} onChange={set('lastName')} disabled={!isEditing} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={set('email')} disabled={!isEditing} />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="title">Title / Position</Label>
              <Input id="title" value={formData.title} onChange={set('title')} disabled={!isEditing} />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone} onChange={set('phone')} disabled={!isEditing} />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile Phone</Label>
                <Input id="mobile" value={formData.mobile} onChange={set('mobile')} disabled={!isEditing} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input id="street" value={formData.street} onChange={set('street')} disabled={!isEditing} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={set('city')} disabled={!isEditing} />
              </div>
              {COUNTRIES_WITH_STATES.includes(formData.country) ? (
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(v) => setFormData({ ...formData, state: v })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="bg-background max-h-[200px]">
                      {US_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="state">State / Province</Label>
                  <Input id="state" value={formData.state} onChange={set('state')} disabled={!isEditing} placeholder="Optional" />
                </div>
              )}
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" value={formData.zip} onChange={set('zip')} disabled={!isEditing} />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country || 'US'}
                onValueChange={(v) => setFormData({ ...formData, country: v })}
                disabled={!isEditing}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[200px]">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
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
