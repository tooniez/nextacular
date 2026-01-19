/**
 * Hook to check if current user is Super Admin
 * Uses SWR for caching to avoid duplicate API calls
 */

import useSWR from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  try {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'rbac',
        hypothesisId: 'U_SA_1',
        location: 'src/hooks/data/useSuperAdmin.js',
        message: 'useSuperAdmin fetched /api/authz/me',
        data: {
          status: res.status,
          hasData: Boolean(json?.data),
          isSuperAdmin: Boolean(json?.data?.principal?.isSuperAdmin),
          platformAuthed: Boolean(json?.data?.principal?.platform?.isAuthenticated),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch {}
  return { status: res.status, data: json?.data || null };
};

export function useSuperAdmin() {
  const { data, error } = useSWR('/api/authz/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    errorRetryCount: 1,
  });

  const isLoading = !data && !error;
  const isSuperAdmin = Boolean(data?.data?.principal?.isSuperAdmin);
  const isOrgManager =
    Boolean(data?.data?.principal?.platform?.isAuthenticated) &&
    (isSuperAdmin || (data?.data?.principal?.workspaces || []).length > 0);

  return { isSuperAdmin, isOrgManager, isLoading };
}
