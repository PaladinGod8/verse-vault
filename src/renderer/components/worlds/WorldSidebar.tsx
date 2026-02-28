import { NavLink } from 'react-router-dom';

interface WorldSidebarProps {
  worldId: number | null;
}

function LayersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.9 3.8L6.3 8.7l3.8 1.9L12 14.4l1.9-3.8 3.8-1.9-3.8-1.9L12 3Z" />
      <path d="M5 15.5 4 17.5l-2 1 2 1 1 2 1-2 2-1-2-1-1-2Z" />
      <path d="M19 14l-.9 1.9-1.9.9 1.9.9.9 1.9.9-1.9 1.9-.9-1.9-.9L19 14Z" />
    </svg>
  );
}

function ScrollIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 3H4.5a2.5 2.5 0 0 0 0 5H19" />
    </svg>
  );
}

export default function WorldSidebar({ worldId }: WorldSidebarProps) {
  return (
    <aside className="flex w-16 flex-col items-center gap-2 border-r border-slate-200 bg-white py-4 shadow-sm">
      <NavLink
        to={`/world/${worldId}/levels`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')
        }
      >
        <LayersIcon />
        <span>Level</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/abilities`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')
        }
      >
        <SparklesIcon />
        <span>Abilities</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/campaigns`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')
        }
      >
        <ScrollIcon />
        <span>Campaigns</span>
      </NavLink>
    </aside>
  );
}
