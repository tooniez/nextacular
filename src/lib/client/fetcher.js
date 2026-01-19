export const fetcher = async (url) => {
  // If url is null or undefined, SWR should not call fetcher, but handle it just in case
  if (!url) {
    return null;
  }
  
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  try {
    const response = await fetch(url, { credentials: 'same-origin' });

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(
        typeof data === 'string' && data
          ? `API Error: ${response.status} ${response.statusText} - ${data.slice(0, 200)}`
          : `API Error: ${response.status} ${response.statusText}`
      );
      error.status = response.status;
      error.info = data;
      error.url = url;

      throw error;
    }

    return data;
  } catch (error) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = (endTime - startTime).toFixed(2);
    // Keep this as console.error: useful, and Next can strip console in prod via config.
    console.error('[API] Request failed', {
      url,
      status: error?.status,
      message: error?.message,
      durationMs: duration,
    });
    throw error;
  }
};

export default fetcher;
