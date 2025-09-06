
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';

const UserInfoCard: React.FC = () => {
  const { user } = useUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Investor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-gray-500">User information not available. Please log in again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Investor Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-base text-gray-500">Name</span>
            <span className="font-medium text-lg">{user.name}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base text-gray-500">Status</span>
            <span className="font-medium text-lg">{user.status}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base text-gray-500">Email</span>
            <span className="font-medium text-lg">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex flex-col">
              <span className="text-base text-gray-500">Phone</span>
              <span className="font-medium text-lg">{user.phone}</span>
            </div>
          )}
          {user.mailingstreet && (
            <div className="flex flex-col">
              <span className="text-base text-gray-500">Address</span>
              <span className="font-medium text-lg">{user.mailingstreet}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserInfoCard;
