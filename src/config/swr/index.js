import fetcher from '@/lib/client/fetcher';

const handleOnError = (error) => {
  // SWR onError is for side effects (logging, notifications), NOT for throwing
  // SWR already handles errors internally - we just log them here
  // Do NOT throw - it causes infinite loops and React crashes
  console.error('[SWR Error]', error);
};

const swrConfig = () => ({
  fetcher,
  onError: handleOnError,
  refreshInterval: 0, // Disable auto-refresh to reduce load
  revalidateOnFocus: false,
  revalidateOnReconnect: false, // Disable auto-revalidate on reconnect
  dedupingInterval: 10000, // Increase to 10 seconds to reduce duplicate requests
  // Avoid infinite request loops on auth/5xx errors
  shouldRetryOnError: false,
});

export default swrConfig;
