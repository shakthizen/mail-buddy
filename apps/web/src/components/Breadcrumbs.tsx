import { Link, useLocation } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  const path = location.pathname;

  if (path === '/login') return null;

  const crumbs: Crumb[] = [{ label: 'Dashboard', to: '/templates' }];

  if (path === '/templates') {
    crumbs.push({ label: 'Email Templates' });
  } else if (path === '/templates/new') {
    crumbs.push({ label: 'Email Templates', to: '/templates' });
    crumbs.push({ label: 'New Template' });
  } else if (path.startsWith('/templates/')) {
    crumbs.push({ label: 'Email Templates', to: '/templates' });
    crumbs.push({ label: 'Edit Template' });
  } else if (path === '/assets') {
    crumbs.push({ label: 'Asset Library' });
  } else if (path === '/suppressions') {
    crumbs.push({ label: 'Suppressions' });
  } else if (path === '/settings/smtp') {
    crumbs.push({ label: 'Configuration' });
    crumbs.push({ label: 'SMTP Settings' });
  } else if (path === '/settings/storage') {
    crumbs.push({ label: 'Configuration' });
    crumbs.push({ label: 'Storage Engine' });
  } else if (path === '/settings/api-keys') {
    crumbs.push({ label: 'Configuration' });
    crumbs.push({ label: 'API Keys' });
  } else if (path === '/settings/users') {
    crumbs.push({ label: 'Configuration' });
    crumbs.push({ label: 'Team Users' });
  }

  return (
    <nav className="mb-6 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <div key={index} className="flex items-center space-x-2">
            {index > 0 && (
              <svg className="h-3.5 w-3.5 text-slate-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="font-medium text-slate-600 hover:text-violet-600 hover:underline dark:text-slate-400 dark:hover:text-violet-400"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium'}>
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
