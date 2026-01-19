import useSWR from 'swr';

const useTariffs = (workspaceSlug, filters = {}) => {
  const { search, isActive, page, pageSize } = filters;
  const params = new URLSearchParams({
    workspaceSlug,
    ...(search && { search }),
    ...(isActive !== undefined && { isActive: isActive.toString() }),
    ...(page && { page: page.toString() }),
    ...(pageSize && { pageSize: pageSize.toString() }),
  });
  
  const apiRoute = `/api/tariffs?${params.toString()}`;
  const { data, error, mutate } = useSWR(workspaceSlug ? apiRoute : null, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });

  return {
    ...data,
    tariffs: data?.data?.tariffs || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    pageSize: data?.data?.pageSize || 20,
    totalPages: data?.data?.totalPages || 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useTariffs;
