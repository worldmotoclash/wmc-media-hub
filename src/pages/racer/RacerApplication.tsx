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
  const [saving, setSaving] = useState(false);
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
      tiktok: extractHandle('tiktok', parsed.tiktok || ''),
      instagram: extractHandle('instagram', parsed.instagram || ''),
      dob: parsed.birthdate || '',
      emergencyContactName: parsed.emergencyname || '',
      emergencyContactPhone: parsed.emergencyphone || '',
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

  const getSFDCFieldsForStep = (currentStep: number): Record<string, string> => {
    const fields: Record<string, string> = {};
    switch (currentStep) {
      case 0:
        if (formData.firstName) fields['string_FirstName'] = formData.firstName;
        if (formData.lastName) fields['string_LastName'] = formData.lastName;
        if (formData.email) fields['string_Email'] = formData.email;
        if (formData.title) fields['string_Title'] = formData.title;
        if (formData.phone) fields['phone_Phone'] = formData.phone;
        if (formData.mobile) fields['phone_MobilePhone'] = formData.mobile;
        if (formData.street) fields['text_MailingStreet'] = formData.street;
        if (formData.city) fields['text_MailingCity'] = formData.city;
        if (formData.state) fields['text_MailingState'] = formData.state;
        if (formData.zip) fields['text_MailingPostalCode'] = formData.zip;
        if (formData.country) fields['text_MailingCountry'] = formData.country;
        if (formData.linkedin) fields['url_rie__LinkedIn__c'] = formData.linkedin;
        if (formData.youtube) fields['url_Youtube__c'] = formData.youtube;
        if (formData.facebook) fields['url_rie__Facebook__c'] = formData.facebook;
        if (formData.twitter) fields['url_rie__Twitter__c'] = formData.twitter;
        if (formData.tiktok) fields['url_rie__TikTok__c'] = formData.tiktok;
        if (formData.instagram) fields['url_Instagram__c'] = formData.instagram;
        if (formData.dob) fields['date_Birthdate'] = formData.dob;
        if (formData.emergencyContactName) fields['string_Emergency_Contact_Name__c'] = formData.emergencyContactName;
        if (formData.emergencyContactPhone) fields['phone_Emergency_Contact_Phone__c'] = formData.emergencyContactPhone;
        break;
      case 1:
        if (formData.yearsExperience) fields['string_Years_of_Experience__c'] = formData.yearsExperience;
        if (formData.racingSeries) fields['text_Racing_Series__c'] = formData.racingSeries;
        if (formData.results) fields['text_Notable_Results__c'] = formData.results;
        if (formData.licenseType) fields['string_Racing_License_Type__c'] = formData.licenseType;
        break;
      case 2:
        if (formData.bikeMake) fields['string_Bike_Make__c'] = formData.bikeMake;
        if (formData.bikeModel) fields['string_Bike_Model__c'] = formData.bikeModel;
        if (formData.bikeYear) fields['string_Bike_Year__c'] = formData.bikeYear;
        if (formData.bikeModifications) fields['text_Bike_Modifications__c'] = formData.bikeModifications;
        break;
      case 3:
        for (let i = 1; i <= 5; i++) {
          if (formData[`question${i}`]) fields[`text_Question_${i}__c`] = formData[`question${i}`];
        }
        break;
      case 4:
        if (formData.auditionVideoUploaded) fields['string_Audition_Video_Uploaded__c'] = formData.auditionVideoUploaded;
        break;
    }
    return fields;
  };

  const handleNext = async () => {
    if (!racer || step >= STEPS.length - 1) return;
    setSaving(true);
    try {
      const stepFields = getSFDCFieldsForStep(step);
      if (Object.keys(stepFields).length > 0) {
        await submitRacerApplication(racer.id, stepFields);
        toast.success('Progress saved');
      }
      setStep(step + 1);
    } catch (err) {
      console.error('[RacerApplication] SFDC sync error:', err);
      toast.error('Failed to save progress. You can continue, but data may not be synced.');
      setStep(step + 1);
    } finally {
      setSaving(false);
    }
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
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.dob || ''} onChange={(e) => updateField('dob', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input value={formData.emergencyContactName || ''} onChange={(e) => updateField('emergencyContactName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input value={formData.emergencyContactPhone || ''} onChange={(e) => updateField('emergencyContactPhone', e.target.value)} />
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
              <div className="space-y-2">
                <Label>TikTok</Label>
                <SocialHandleInput platform="tiktok" value={formData.tiktok || ''} onChange={(v) => updateField('tiktok', v)} />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <SocialHandleInput platform="instagram" value={formData.instagram || ''} onChange={(v) => updateField('instagram', v)} />
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
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
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
              accept="video/mp4,video/quicktime"
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
            <Button onClick={handleNext} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <>Next <ChevronRight className="w-4 h-4 ml-1" /></>}
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
