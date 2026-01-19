export default function DriverIndexRedirect() {
  if (typeof window !== 'undefined') {
    window.location.replace('/driver/map');
  }
  return null;
}

