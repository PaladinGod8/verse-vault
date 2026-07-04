import type { ReactNode } from 'react';
import MarkdownView from '../ui/MarkdownView';

type DetailInfoRow = {
  label: string;
  value?: ReactNode;
};

type DetailTableColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
};

export function WikiDetailTableSection({
  title,
  rows,
}: {
  title: string;
  rows: DetailInfoRow[];
}) {
  return (
    <section className='overflow-hidden rounded-lg border border-slate-200'>
      <WikiDetailSectionHeading title={title} />
      <table className='w-full table-fixed text-sm'>
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label} className='align-top border-t border-slate-100 first:border-t-0'>
              <th scope='row' className='px-4 py-2 text-left font-medium text-slate-700'>
                {label}
              </th>
              <td className='px-4 py-2 text-slate-600'>{value ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function WikiDetailListSection({
  title,
  items,
}: {
  title: string;
  items: ReactNode[];
}) {
  return (
    <section className='overflow-hidden rounded-lg border border-slate-200'>
      <WikiDetailSectionHeading title={title} />
      {items.length > 0
        ? (
          <ul className='space-y-2 px-4 py-3 text-sm text-slate-600'>
            {items.map((item, index) => (
              <li key={index} className='list-none'>
                <span aria-hidden='true' className='mr-2 text-fuchsia-500'>
                  *
                </span>
                {item}
              </li>
            ))}
          </ul>
        )
        : <div className='min-h-11' />}
    </section>
  );
}

export function WikiDetailSummaryListSection({
  title,
  summary,
  items,
}: {
  title: string;
  summary?: string | null;
  items: ReactNode[];
}) {
  return (
    <section className='overflow-hidden rounded-lg border border-slate-200'>
      <WikiDetailSectionHeading title={title} />
      {summary
        ? <MarkdownView markdown={summary} className='px-4 py-3 text-sm text-slate-600' />
        : null}
      {items.length > 0
        ? (
          <ul className='space-y-2 px-4 py-3 text-sm text-slate-600'>
            {items.map((item, index) => (
              <li key={index} className='list-none'>
                <span aria-hidden='true' className='mr-2 text-fuchsia-500'>
                  *
                </span>
                {item}
              </li>
            ))}
          </ul>
        )
        : (!summary ? <div className='min-h-11' /> : null)}
    </section>
  );
}

function WikiDetailSubList({ label, items }: { label: string; items: ReactNode[]; }) {
  return (
    <div className='px-4 py-3'>
      <h3 className='text-xs font-semibold text-slate-700'>{label}</h3>
      {items.length > 0
        ? (
          <ul className='mt-1 space-y-2 text-sm text-slate-600'>
            {items.map((item, index) => (
              <li key={index} className='list-none'>
                <span aria-hidden='true' className='mr-2 text-fuchsia-500'>
                  *
                </span>
                {item}
              </li>
            ))}
          </ul>
        )
        : <div className='min-h-11' />}
    </div>
  );
}

export function WikiDetailVicesVirtuesSection({
  summary,
  vices,
  virtues,
}: {
  summary?: string | null;
  vices: ReactNode[];
  virtues: ReactNode[];
}) {
  return (
    <section className='overflow-hidden rounded-lg border border-slate-200'>
      <WikiDetailSectionHeading title='Vices & Virtues' />
      {summary
        ? <MarkdownView markdown={summary} className='px-4 pt-3 text-sm text-slate-600' />
        : null}
      <WikiDetailSubList label='Vices' items={vices} />
      <div className='border-t border-slate-100'>
        <WikiDetailSubList label='Virtues' items={virtues} />
      </div>
    </section>
  );
}

export function WikiDetailDataTableSection<Row>({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: Array<DetailTableColumn<Row>>;
  rows: Row[];
}) {
  return (
    <section className='overflow-hidden rounded-lg border border-slate-200'>
      <WikiDetailSectionHeading title={title} />
      <table className='w-full table-fixed text-sm'>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className='align-top border-t border-slate-100 first:border-t-0'>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className='px-4 py-2 text-slate-600 first:font-medium first:text-slate-700'
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0
            ? (
              <tr>
                {columns.map((column) => (
                  <td key={column.key} className='px-4 py-2 text-slate-600'>
                    {' '}
                  </td>
                ))}
              </tr>
            )
            : null}
        </tbody>
      </table>
    </section>
  );
}

export function WikiDetailSectionHeading({ title }: { title: string; }) {
  return (
    <div className='border-b border-slate-200 bg-slate-900 px-4 py-2'>
      <h2 className='text-base font-semibold text-white'>{title}</h2>
    </div>
  );
}
