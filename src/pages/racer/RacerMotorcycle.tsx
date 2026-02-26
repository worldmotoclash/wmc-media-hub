import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import RacerFileUpload from '@/components/racer/RacerFileUpload';
import { submitToSalesforce, type RacerMember } from '@/services/racerService';
import { toast } from 'sonner';

const RacerMotorcycle: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ make: '', model: '', year: '', classType: '', modifications: '' });

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    setRacer(JSON.parse(stored));
  }, [navigate]);

  const handleSubmit = async () => {
    if (!racer) return;
    setSubmitting(true);
    try {
      await submitToSalesforce({
        sObj: 'Contact',
        id_Contact: racer.id,
        'text_Bike_Make__c': form.make,
        'text_Bike_Model__c': form.model,
        'text_Bike_Year__c': form.year,
        'text_Bike_Class__c': form.classType,
        'textarea_Bike_Modifications__c': form.modifications,
      });
      toast.success('Motorcycle details saved!');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!racer) return null;

  return (
    <RacerPortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Motorcycle Details</h2>
          <p className="text-muted-foreground text-sm mt-1">Submit your bike specs for race day</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Bike Information</CardTitle>
            <CardDescription>Required for technical inspection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input placeholder="Ducati" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input placeholder="Panigale V4" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" placeholder="2024" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Input placeholder="e.g. Superbike, Supersport" value={form.classType} onChange={(e) => setForm({ ...form, classType: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Modifications</Label>
              <Textarea placeholder="List any modifications…" value={form.modifications} onChange={(e) => setForm({ ...form, modifications: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Bike Photos</Label>
              <RacerFileUpload racerName={racer.name} racerContactId={racer.id} category="Motorcycle Photos" accept="image/jpeg,image/png,image/heic,image/heif,image/webp" label="Upload bike photos" />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save Motorcycle Details'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </RacerPortalLayout>
  );
};

export default RacerMotorcycle;
