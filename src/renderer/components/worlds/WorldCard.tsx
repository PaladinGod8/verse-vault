import { useMemo, useState } from 'react';

type WorldCardProps = {
  world: World;
};

function formatTimestamp(timestamp: string | null, fallback: string): string {
  if (!timestamp) {
    return fallback;
  }

  const normalized = timestamp.includes('T')
    ? timestamp
    : `${timestamp.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export default function WorldCard({ world }: WorldCardProps) {
  const thumbnail = world.thumbnail?.trim() ?? '';
  const [showImage, setShowImage] = useState(thumbnail.length > 0);

  const altText = useMemo(() => `${world.name} thumbnail`, [world.name]);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="h-40 bg-slate-100">
        {showImage ? (
          <img
            src={thumbnail}
            alt={altText}
            className="h-full w-full object-cover"
            onError={() => setShowImage(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
            No thumbnail
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">
          {world.name}
        </h2>

        <p className="min-h-12 text-sm text-slate-600">
          {world.short_description?.trim() || 'No description yet.'}
        </p>

        <dl className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between gap-3">
            <dt>Last viewed</dt>
            <dd className="text-right text-slate-700">
              {formatTimestamp(world.last_viewed_at, 'Never')}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Last modified</dt>
            <dd className="text-right text-slate-700">
              {formatTimestamp(world.updated_at, 'Unknown')}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
