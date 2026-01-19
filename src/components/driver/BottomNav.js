import Link from 'next/link';
import { useRouter } from 'next/router';
import { MapIcon, BoltIcon, ChatBubbleLeftRightIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import useDriverMe from '@/hooks/useDriverMe';

const items = [
  { href: '/driver/map', label: 'Mappa', Icon: MapIcon },
  { href: '/driver/activity', label: 'Attività', Icon: BoltIcon, requireAuth: true },
  { href: '/driver/support', label: 'Assistenza', Icon: ChatBubbleLeftRightIcon },
  { href: '/driver/profile', label: 'Profilo', Icon: UserCircleIcon, requireAuth: true },
];

export default function BottomNav() {
  const router = useRouter();
  const path = router.asPath;
  const { me } = useDriverMe({ enabled: true });
  const isAuthed = Boolean(me);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 md:hidden">
      <div className="grid grid-cols-4">
        {items.map(({ href, label, Icon, requireAuth }) => {
          const active = path === href || path.startsWith(href + '/');
          const gated = Boolean(requireAuth) && !isAuthed;
          const gatedHref = `/auth/login?callbackUrl=${encodeURIComponent(String(href))}`;
          const finalHref = gated ? gatedHref : href;
          return (
            <Link
              key={href}
              href={finalHref}
              className={`py-2 flex flex-col items-center justify-center text-xs ${
                active ? 'text-blue-700' : 'text-gray-500'
              }`}
              onClick={(e) => {
                if (!gated) return;
                // Some browsers/extensions can break SPA transitions.
                // For gated routes we hard-navigate to guarantee the login page replaces the map.
                try {
                  e?.preventDefault?.();
                } catch {}

                try {
                  if (typeof window !== 'undefined') window.location.assign(gatedHref);
                } catch {}
              }}
            >
              <Icon className="w-6 h-6" />
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

