import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Breadcrumbs } from './Breadcrumbs';

const coreNav = [
  {
    to: '/templates',
    label: 'Templates',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h8m-8 4h6" />
      </svg>
    ),
  },
  {
    to: '/assets',
    label: 'Asset Library',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    to: '/suppressions',
    label: 'Suppressions',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
  },
];

const settingsNav = [
  {
    to: '/settings/smtp',
    label: 'SMTP Settings',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    to: '/settings/storage',
    label: 'Storage Engine',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
        />
      </svg>
    ),
  },
  {
    to: '/settings/api-keys',
    label: 'API Keys',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
  },
  {
    to: '/settings/users',
    label: 'Team Users',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
    isActive
      ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20 dark:bg-violet-600 dark:text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
  }`;
}

export function Layout() {
  const { user, token, logout } = useAuth();

  if (!token && !user) return <Navigate to="/login" replace />;

  const userInitial = (user?.name || user?.email || 'A').charAt(0).toUpperCase();

  return (
    <div className="app-mesh-bg flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/75 p-4 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/65">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              Mail Buddy
            </span>
          </div>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            v0.1.0
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {/* Main / Core Section */}
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Core
            </p>
            <nav className="space-y-1">
              {coreNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Separator */}
          <div className="border-t border-slate-200/60 dark:border-slate-800/60" />

          {/* Settings Section */}
          <div>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Configuration
            </p>
            <nav className="space-y-1">
              {settingsNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom User Profile & Logout Dock */}
        <div className="mt-auto border-t border-slate-200/80 pt-3 dark:border-slate-800/80">
          <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50/80 p-2 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white shadow-sm">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {user?.name || 'Administrator'}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {user?.email || 'admin@mail-buddy'}
                </p>
              </div>
            </div>
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              {user?.role || 'admin'}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-8 lg:p-10">
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
