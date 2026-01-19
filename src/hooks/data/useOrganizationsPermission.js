/**
 * Hook to check if current user has Organizations permission
 * (Super Admin OR ADMIN/OWNER role in any workspace)
 */

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export function useOrganizationsPermission() {
  const { data: session, status: sessionStatus } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'loading') {
      return; // Wait for session to load
    }

    if (!session?.user?.email) {
      setHasPermission(false);
      setIsLoading(false);
      return;
    }

    // Check via API (server-side check)
    fetch('/api/account/organizations?page=1&pageSize=1', {
      credentials: 'include',
    })
      .then((res) => {
        setHasPermission(res.status === 200);
        setIsLoading(false);
      })
      .catch(() => {
        setHasPermission(false);
        setIsLoading(false);
      });
  }, [session, sessionStatus]);

  return { hasPermission, isLoading };
}
