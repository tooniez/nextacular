import useSWR from 'swr';

const useInvitations = () => {
  const apiRoute = `/api/workspaces/invitations`;
  const { data, error } = useSWR(`${apiRoute}`, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });
  return {
    ...data,
    isLoading: !error && !data,
    isError: error,
  };
};

export default useInvitations;
