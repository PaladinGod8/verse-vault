interface EntityCountBadgeProps {
  count: number;
  singularLabel: string;
  pluralLabel?: string;
}

export default function EntityCountBadge(
  { count, singularLabel, pluralLabel }: EntityCountBadgeProps,
) {
  const noun = count === 1 ? singularLabel : pluralLabel ?? `${singularLabel}s`;
  return (
    <div
      role='status'
      aria-label={`Total ${noun}`}
      className='inline-flex shrink-0 items-center rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700'
    >
      {count} {noun}
    </div>
  );
}
