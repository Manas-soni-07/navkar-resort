import React from 'react';
import { Redirect } from 'expo-router';
import { LoadingView } from '@/components/ui';
import { useAuth, homeRouteFor, isAdminRole } from '@/context/AuthContext';

type Audience = 'admin' | 'manager';

interface RoleGuardProps {
  audience: Audience;
  children: React.ReactNode;
}

/**
 * Protects a screen on the client. Signed-out users go to /login; signed-in
 * users of the wrong role go to their own dashboard.
 *
 * This is UX only — the API enforces the same rules server-side.
 */
export function RoleGuard({ audience, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingView message="Restoring your session..." />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const allowed = audience === 'admin' ? isAdminRole(user.role) : !isAdminRole(user.role);
  if (!allowed) {
    return <Redirect href={homeRouteFor(user.role)} />;
  }

  return <>{children}</>;
}
