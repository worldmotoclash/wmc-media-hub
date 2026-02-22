import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import RacerFileUpload from '@/components/racer/RacerFileUpload';
import SocialHandleInput from '@/components/racer/SocialHandleInput';
import { submitRacerApplication, type RacerMember } from '@/services/racerService';
import { getStepCompletion, getStorageKey, extractHandle } from '@/utils/applicationProgress';
import { toast } from 'sonner';

const STEPS = ['Personal Info', 'Racing History', 'Motorcycle', '5 Key Questions', 'Audition Video'];

const RacerApplication: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    const parsed: RacerMember = JSON.parse(stored);
    setRacer(parsed);

    // Load saved application data from localStorage first
    const savedData = localStorage.getItem(getStorageKey(parsed.id));
    const saved: Record<string, string> = savedData ? JSON.parse(savedData) : {};

    // Pre-populate from profile, then overlay saved progress
    const profileDefaults: Record<string, string> = {
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
      country: parsed.mailingcountry || '',
      linkedin: extractHandle('linkedin', parsed.linkedin || ''),
      youtube: extractHandle('youtube', parsed.youtube || ''),
      facebook: extractHandle('facebook', parsed.facebook || ''),
      twitter: extractHandle('twitter', parsed.twitter || ''),
    };

    setFormData({ ...profileDefaults, ...saved });
  }, [navigate]);

  // Persist to localStorage on every change
  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (racer) localStorage.setItem(getStorageKey(racer.id), JSON.stringify(next));
      return next;
    });
  }, [racer]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmitAll = async () => {
    if (!racer) return;
    setSubmitting(true);
    try {
      await submitRacerApplication(racer.id, formData);
      toast.success('Application submitted successfully!');
      navigate('/racer/dashboard');
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!racer) return null;

  const stepCompletion = getStepCompletion(formData);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={formData.firstName || ''} onChange={(e) => updateField('firstName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.lastName || ''} onChange={(e) => updateField('lastName', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email || ''} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Title / Position</Label>
              <Input value={formData.title || ''} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Phone</Label>
                <Input value={formData.mobile || ''} onChange={(e) => updateField('mobile', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input value={formData.street || ''} onChange={(e) => updateField('street', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city || ''} onChange={(e) => updateField('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={formData.state || ''} onChange={(e) => updateField('state', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input value={formData.zip || ''} onChange={(e) => updateField('zip', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country || ''} onChange={(e) => updateField('country', e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">At least one social handle is required.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <SocialHandleInput platform="linkedin" value={formData.linkedin || ''} onChange={(v) => updateField('linkedin', v)} />
              </div>
              <div className="space-y-2">
                <Label>YouTube</Label>
                <SocialHandleInput platform="youtube" value={formData.youtube || ''} onChange={(v) => updateField('youtube', v)} />
              </div>
              <div className="space-y-2">
                <Label>Facebook</Label>
                <SocialHandleInput platform="facebook" value={formData.facebook || ''} onChange={(v) => updateField('facebook', v)} />
              </div>
              <div className="space-y-2">
                <Label>X / Twitter</Label>
                <SocialHandleInput platform="twitter" value={formData.twitter || ''} onChange={(v) => updateField('twitter', v)} />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Years of Racing Experience</Label>
              <Input type="number" value={formData.yearsExperience || ''} onChange={(e) => updateField('yearsExperience', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Racing Series / Leagues</Label>
              <Textarea placeholder="List the series you've competed in…" value={formData.racingSeries || ''} onChange={(e) => updateField('racingSeries', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Notable Results / Championships</Label>
              <Textarea placeholder="Highlight your best finishes…" value={formData.results || ''} onChange={(e) => updateField('results', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Racing License Type</Label>
              <Input value={formData.licenseType || ''} onChange={(e) => updateField('licenseType', e.target.value)} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input placeholder="e.g. Ducati" value={formData.bikeMake || ''} onChange={(e) => updateField('bikeMake', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input placeholder="e.g. Panigale V4" value={formData.bikeModel || ''} onChange={(e) => updateField('bikeModel', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" placeholder="2024" value={formData.bikeYear || ''} onChange={(e) => updateField('bikeYear', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modifications</Label>
              <Textarea placeholder="Describe any modifications…" value={formData.bikeModifications || ''} onChange={(e) => updateField('bikeModifications', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Bike Photos</Label>
              <RacerFileUpload
                racerName={racer.name}
                racerContactId={racer.id}
                category="Motorcycle Photos"
                accept="image/*"
                label="Upload bike photos"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {[
              'Why do you want to compete in World Moto Clash?',
              'What makes you a compelling on-camera personality?',
              'Describe your fan base and social media presence.',
              'What is your ultimate goal as a motorcycle racer?',
              'What is your X-Factor — what sets you apart?',
            ].map((q, i) => (
              <div key={i} className="space-y-2">
                <Label>{q}</Label>
                <Textarea
                  value={formData[`question${i + 1}`] || ''}
                  onChange={(e) => updateField(`question${i + 1}`, e.target.value)}
                  rows={3}
                />
              </div>
            ))}
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a 1–3 minute video introducing yourself. Show your personality, your riding, and why you belong on the WMC grid.
            </p>
            <RacerFileUpload
              racerName={racer.name}
              racerContactId={racer.id}
              category="Audition Video"
              accept="video/*"
              label="Upload audition video"
              onUploadComplete={() => updateField('auditionVideoUploaded', 'true')}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <RacerPortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Racer Application</h2>
          <p className="text-muted-foreground text-sm mt-1">Complete all 5 steps to submit your application</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i === step
                    ? 'bg-primary text-primary-foreground'
                    : stepCompletion[i]
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepCompletion[i] ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </React.Fragment>
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Step {step + 1}: {STEPS[step]}</CardTitle>
            <CardDescription>Fill in the details below</CardDescription>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmitAll} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </RacerPortalLayout>
  );
};

export default RacerApplication;
