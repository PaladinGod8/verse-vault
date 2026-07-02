/**
 * @role Curated IPA symbol palette data (English-relevant)
 * @owns The click-to-insert symbol set shown in the IPA tool: the glyphs a
 *       normal keyboard can't type, grouped and annotated with example words
 */

export type IpaSymbol = {
  char: string;
  /** Plain-English example word illustrating the sound (shown on hover). */
  example: string;
};

export type IpaSymbolGroup = {
  label: string;
  symbols: IpaSymbol[];
};

export const IPA_SYMBOL_GROUPS: IpaSymbolGroup[] = [
  {
    label: 'Vowels',
    symbols: [
      { char: 'iː', example: 'fleece' },
      { char: 'ɪ', example: 'kit' },
      { char: 'e', example: 'dress' },
      { char: 'ɛ', example: 'bed' },
      { char: 'æ', example: 'trap' },
      { char: 'ə', example: 'comma' },
      { char: 'ɜː', example: 'nurse' },
      { char: 'ʌ', example: 'strut' },
      { char: 'uː', example: 'goose' },
      { char: 'ʊ', example: 'foot' },
      { char: 'ɔː', example: 'thought' },
      { char: 'ɒ', example: 'lot' },
      { char: 'ɑː', example: 'palm' },
      { char: 'ɝ', example: 'nurse (US)' },
    ],
  },
  {
    label: 'Diphthongs',
    symbols: [
      { char: 'eɪ', example: 'face' },
      { char: 'aɪ', example: 'price' },
      { char: 'ɔɪ', example: 'choice' },
      { char: 'aʊ', example: 'mouth' },
      { char: 'əʊ', example: 'goat' },
      { char: 'oʊ', example: 'goat (US)' },
      { char: 'ɪə', example: 'near' },
      { char: 'eə', example: 'square' },
      { char: 'ʊə', example: 'cure' },
    ],
  },
  {
    label: 'Consonants',
    symbols: [
      { char: 'θ', example: 'thin' },
      { char: 'ð', example: 'this' },
      { char: 'ʃ', example: 'ship' },
      { char: 'ʒ', example: 'vision' },
      { char: 'tʃ', example: 'chair' },
      { char: 'dʒ', example: 'judge' },
      { char: 'ŋ', example: 'sing' },
      { char: 'ɹ', example: 'red' },
      { char: 'j', example: 'yes' },
      { char: 'ɫ', example: 'milk' },
      { char: 'ʔ', example: 'uh-oh' },
    ],
  },
  {
    label: 'Marks',
    symbols: [
      { char: 'ˈ', example: 'primary stress' },
      { char: 'ˌ', example: 'secondary stress' },
      { char: 'ː', example: 'long vowel' },
    ],
  },
];
