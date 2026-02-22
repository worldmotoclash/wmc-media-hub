import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RacerLogin from '@/pages/racer/RacerLogin';
import RacerDashboard from '@/pages/racer/RacerDashboard';
import RacerApplication from '@/pages/racer/RacerApplication';
import RacerMotorcycle from '@/pages/racer/RacerMotorcycle';
import RacerQualification from '@/pages/racer/RacerQualification';
import RacerProfile from '@/pages/racer/RacerProfile';

export const isRacerHostname = (): boolean => {
  const hostname = window.location.hostname.toLowerCase();
  return hostname.includes('racer') || hostname.includes('racers');
};

export const RacerRoutes: React.FC = () => (
  <Routes>
    <Route path="/racer/login" element={<RacerLogin />} />
    <Route path="/racer/dashboard" element={<RacerDashboard />} />
    <Route path="/racer/application" element={<RacerApplication />} />
    <Route path="/racer/motorcycle" element={<RacerMotorcycle />} />
    <Route path="/racer/qualification" element={<RacerQualification />} />
    <Route path="/racer/profile" element={<RacerProfile />} />
    <Route path="*" element={<Navigate to="/racer/login" replace />} />
  </Routes>
);
