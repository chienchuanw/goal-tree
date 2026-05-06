'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; index: string };

const ITEMS: Item[] = [
  { href: '/today', label: 'Today', index: '01' },
  { href: '/goals', label: 'Goals', index: '02' },
  { href: '/notes', label: 'Notes', index: '03' },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavTabsDesktop() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden md:flex items-stretch h-full">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'relative inline-flex items-center px-5 text-sm tracking-tight transition-colors',
              active ? 'text-ink' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            <span className="num mr-2 text-[10px] tracking-[0.18em] text-ink-faint">
              {item.index}
            </span>
            {item.label}
            <span
              aria-hidden
              className={[
                'absolute left-3 right-3 -bottom-px h-px transition-colors',
                active ? 'bg-ink' : 'bg-transparent',
              ].join(' ')}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export function NavTabsMobile() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="border-r border-rule last:border-r-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] tracking-tight transition-colors',
                  active ? 'text-ink' : 'text-ink-muted',
                ].join(' ')}
              >
                <span className="num text-[9px] tracking-[0.18em] text-ink-faint">
                  {item.index}
                </span>
                <span className="text-[13px] leading-none">{item.label}</span>
                <span
                  aria-hidden
                  className={[
                    'mt-0.5 h-px w-6 transition-colors',
                    active ? 'bg-ink' : 'bg-transparent',
                  ].join(' ')}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
