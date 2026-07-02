import type { CharacterQuote } from '../../../shared/contracts/characterTypes';
import CharacterQuoteCard from './CharacterQuoteCard';

export default function CharacterQuotesSection({ quotes }: { quotes: CharacterQuote[]; }) {
  return (
    <section className='space-y-3 rounded-lg border border-base-300 bg-base-200 p-4'>
      <h2 className='text-base font-semibold text-base-content'>Quotes</h2>
      {quotes.length > 0
        ? (
          <div className='space-y-3'>
            {quotes.map((quote, index) => (
              <CharacterQuoteCard
                key={index}
                context={quote.context}
                text={quote.text}
                speaker={quote.speaker}
              />
            ))}
          </div>
        )
        : <p className='text-sm text-base-content/70'>No quotes yet.</p>}
    </section>
  );
}
