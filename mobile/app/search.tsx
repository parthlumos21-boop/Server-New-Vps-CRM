import React from 'react';
import { GlobalSearchScreen } from '../src/components/search/GlobalSearchScreen';
import { useAuth } from '../src/context/AuthContext';

export default function SearchRoute() {
  const { user } = useAuth();
  
  // Determine if the user is an admin or employee based on their email or role
  // Defaulting to admin path for this demo if not explicitly known
  const isAdmin = user?.email?.toLowerCase().includes('@lumossolution.com') || 
                  user?.email?.toLowerCase().includes('@gmail.com') ||
                  user?.role === 'admin';
                  
  const basePath = isAdmin ? '/(admin)' : '/(tabs)';

  return <GlobalSearchScreen basePath={basePath} />;
}
