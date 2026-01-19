import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>404 - Page not found</h1>
      <p style={{ marginBottom: '16px' }}>
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" style={{ textDecoration: 'underline' }}>
        Go back home
      </Link>
    </div>
  );
}

