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
    </aside>
  );
}
