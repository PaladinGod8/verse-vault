import { NavLink } from 'react-router-dom';
import { useIpaTool } from '../../hooks/useIpaTool';
import { useToast } from '../ui/ToastProvider';

interface WorldSidebarProps {
  worldId: number | null;
}

function PhoneticIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M4 7V5h16v2' />
      <path d='M9 5v14' />
      <path d='M7 19h4' />
      <path d='M14 12h6' />
      <path d='M17 9v10' />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polygon points='12 2 2 7 12 12 22 7 12 2' />
      <polyline points='2 17 12 22 22 17' />
      <polyline points='2 12 12 17 22 12' />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='m12 3-1.9 3.8L6.3 8.7l3.8 1.9L12 14.4l1.9-3.8 3.8-1.9-3.8-1.9L12 3Z' />
      <path d='M5 15.5 4 17.5l-2 1 2 1 1 2 1-2 2-1-2-1-1-2Z' />
      <path d='M19 14l-.9 1.9-1.9.9 1.9.9.9 1.9.9-1.9 1.9-.9-1.9-.9L19 14Z' />
    </svg>
  );
}

function ScrollIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4' />
      <path d='M19 3H4.5a2.5 2.5 0 0 0 0 5H19' />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polygon points='3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6' />
      <line x1='9' y1='3' x2='9' y2='18' />
      <line x1='15' y1='6' x2='15' y2='21' />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <circle cx='12' cy='12' r='10' />
      <path d='M2 12h20' />
      <path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z' />
    </svg>
  );
}

function TokensIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <circle cx='12' cy='12' r='10' />
      <circle cx='12' cy='10' r='3' />
      <path d='M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662' />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
      <circle cx='9' cy='7' r='4' />
      <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
      <path d='M16 3.13a4 4 0 0 1 0 7.75' />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
    </svg>
  );
}

function FactionsIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <circle cx='6' cy='6' r='3' />
      <circle cx='18' cy='6' r='3' />
      <circle cx='12' cy='18' r='3' />
      <path d='M6 9v3a3 3 0 0 0 3 3h0M18 9v3a3 3 0 0 1-3 3h0' />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M12 7v14' />
      <path d='M3 18V5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 1-2-2Z' />
      <path d='M21 18V5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2Z' />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='m6 3 6 7 6-7' />
      <path d='m12 22 10-12H2Z' />
      <path d='M12 22 2 10l4-7' />
      <path d='M12 22 22 10l-4-7' />
    </svg>
  );
}

function NotebookIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M2 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z' />
      <path d='M6 4v16' />
      <path d='M10 8h8' />
      <path d='M10 12h8' />
      <path d='M10 16h5' />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <line x1='12' x2='12' y1='20' y2='10' />
      <line x1='18' x2='18' y1='20' y2='4' />
      <line x1='6' x2='6' y1='20' y2='16' />
    </svg>
  );
}

export default function WorldSidebar({ worldId }: WorldSidebarProps) {
  const { open: openIpaTool } = useIpaTool();
  const toast = useToast();

  const handleOpenWorldMap = () => {
    if (worldId == null) {
      return;
    }
    void window.db.worldMaps.openEditor(worldId).catch(() => {
      toast.error(
        'Could not open World Map',
        'The map editor failed to open. Please try again.',
      );
    });
  };

  return (
    <aside className='flex w-16 flex-col items-center gap-2 border-r border-slate-200 bg-white py-4 shadow-sm'>
      <NavLink
        to={`/world/${worldId}/levels`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
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
          ].join(' ')}
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
          ].join(' ')}
      >
        <ScrollIcon />
        <span>Campaigns</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/battlemaps`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <MapIcon />
        <span>BattleMaps</span>
      </NavLink>
      <button
        type='button'
        onClick={handleOpenWorldMap}
        disabled={worldId == null}
        aria-label='World Map'
        className='flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40'
      >
        <GlobeIcon />
        <span>World Map</span>
      </button>
      <NavLink
        to={`/world/${worldId}/tokens`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <TokensIcon />
        <span>Tokens</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/statblocks`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <ShieldIcon />
        <span>StatBlocks</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/backgrounds`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <BookOpenIcon />
        <span>Backgrounds</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/items`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <GemIcon />
        <span>Items</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/lore-notes`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <NotebookIcon />
        <span>Lore Notes</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/characters`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <UsersIcon />
        <span>Characters</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/factions`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <FactionsIcon />
        <span>Factions</span>
      </NavLink>
      <NavLink
        to={`/world/${worldId}/statistics`}
        className={({ isActive }) =>
          [
            'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium transition',
            isActive
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
          ].join(' ')}
      >
        <BarChartIcon />
        <span>Statistics</span>
      </NavLink>
      <button
        type='button'
        onClick={openIpaTool}
        aria-label='IPA phonetic tool'
        className='flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs leading-tight font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800'
      >
        <PhoneticIcon />
        <span>IPA</span>
      </button>
    </aside>
  );
}
