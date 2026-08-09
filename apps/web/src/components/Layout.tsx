import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/templates', label: 'Templates' },
  { to: '/assets', label: 'Assets' },
  { to: '/suppressions', label: 'Suppressions' },
  { to: '/settings/api-keys', label: 'API Keys' },
  { to: '/settings/smtp', label: 'SMTP & Storage' },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-violet-600 text-white'
      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`;
}

export function Layout() {
  const { apiKey, logout } = useAuth();

  if (!apiKey) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-svh bg-neutral-50 dark:bg-neutral-950">
      <aside className="w-56 shrink-0 border-r border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-6 px-1 text-lg font-semibold text-neutral-900 dark:text-white">Mail Buddy</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-8 w-full rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Log out
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
