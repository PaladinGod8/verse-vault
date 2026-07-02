type CharacterQuoteCardProps = {
  context?: string | null;
  text: string;
  speaker?: string | null;
};

export default function CharacterQuoteCard({ context, text, speaker }: CharacterQuoteCardProps) {
  return (
    <div className='rounded-lg border border-base-300 bg-base-100 p-4 text-base-content'>
      {context
        ? <p className='mb-1 text-xs font-medium text-base-content/70'>{context}</p>
        : null}
      <p className='italic'>{`"${text}"`}</p>
      {speaker
        ? <p className='mt-2 text-right text-sm font-medium text-primary'>{`~ ${speaker}`}</p>
        : null}
    </div>
  );
}
