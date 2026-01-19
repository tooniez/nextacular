import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

export default function useDriverMe(opts = {}) {
  const enabled = opts?.enabled !== false;
  const { data, error, mutate, isLoading } = useSWR(enabled ? '/api/driver/me' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
  });

  const isAuthError = error?.status === 401 || error?.status === 403;

  return {
    me: !enabled || isAuthError ? null : data?.data || null,
    isLoading: enabled ? Boolean(isLoading) || (!error && !data) : false,
    isError: error,
    isAuthError,
    mutate,
  };
}

