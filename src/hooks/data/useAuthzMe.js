import useSWR from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json?.data || null, errors: json?.errors || null };
};

export function useAuthzMe({ workspaceSlug, callbackUrl } = {}) {
  const qs = new URLSearchParams();
  if (workspaceSlug) qs.set('workspaceSlug', String(workspaceSlug));
  if (callbackUrl) qs.set('callbackUrl', String(callbackUrl));
  const key = `/api/authz/me${qs.toString() ? `?${qs.toString()}` : ''}`;

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    errorRetryCount: 1,
  });

  return {
    status: data?.status ?? null,
    principal: data?.data?.principal || null,
    redirectTo: data?.data?.redirectTo || null,
    menu: data?.data?.menu || null,
    isLoading: Boolean(isLoading),
    isError: Boolean(error),
    errors: data?.errors || null,
  };
}

