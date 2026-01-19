import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import useDriverMe from '@/hooks/useDriverMe';

export default function DriverPublicLayout({ children }) {
  const router = useRouter();
  const { me, isLoading } = useDriverMe();

  useEffect(() => {
    if (!isLoading && me) {
      router.replace('/driver/map');
    }
  }, [isLoading, me, router]);

  if (isLoading) return <></>;
  if (me) return null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
      <Toaster position="bottom-center" toastOptions={{ duration: 8000 }} />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}

