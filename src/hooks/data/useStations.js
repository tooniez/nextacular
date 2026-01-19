import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

const useStations = (workspaceSlug, filters = {}) => {
  const { search, status, city, page, pageSize } = filters;
  const params = new URLSearchParams({
    workspaceSlug,
    ...(search && { search }),
    ...(status && { status }),
    ...(city && { city }),
    ...(page && { page: page.toString() }),
    ...(pageSize && { pageSize: pageSize.toString() }),
  });
  
  const apiRoute = `/api/stations?${params.toString()}`;
  const { data, error, mutate } = useSWR(workspaceSlug ? apiRoute : null, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10000,
  });


  // API returns: { data: { data: [...], total: 4, page: 1, pageSize: 20, totalPages: 1 } }
  // SWR fetcher returns: { data: { data: [...], total: 4, ... } }
  // So: data.data.data = array of stations
  const stations = data?.data?.data || [];
  const total = data?.data?.total || 0;

  // #region agent log
  if (typeof window !== 'undefined') {
    if (data) {
      console.log('[useStations] Data received:', { 
        hasData: !!data, 
        hasDataData: !!data?.data,
        stationsCount: stations.length,
        total,
        dataStructure: JSON.stringify(data).substring(0, 300)
      });
    }
    if (workspaceSlug && !data && !error) {
      console.log('[useStations] Loading...', { workspaceSlug, apiRoute });
    }
    if (error) {
      console.error('[useStations] Error:', error);
    }
  }
  // #endregion

  return {
    ...data,
    stations,
    total,
    page: data?.data?.page || 1,
    pageSize: data?.data?.pageSize || 20,
    totalPages: data?.data?.totalPages || 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useStations;
