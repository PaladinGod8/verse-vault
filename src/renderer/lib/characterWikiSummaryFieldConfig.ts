export type WikiSummaryFieldDef = { key: string; label: string; };

export const BIOGRAPHIC_FIELDS: WikiSummaryFieldDef[] = [
  { key: 'birthName', label: 'Birth Name' },
  { key: 'ipaPronunciation', label: 'IPA Pronunciation' },
  { key: 'mainEpithet', label: 'Main Epithet' },
];

export const PERSONAL_DESCRIPTION_FIELDS: WikiSummaryFieldDef[] = [
  { key: 'birthDate', label: 'Birth Date' },
  { key: 'currentAge', label: 'Current Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'sex', label: 'Sex' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'hair', label: 'Hair' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'skinColour', label: 'Skin Colour' },
  { key: 'bloodType', label: 'Blood Type' },
  { key: 'creatureTypes', label: 'Creature Types' },
  { key: 'mainRace', label: 'Main Race' },
  { key: 'mainClass', label: 'Main Class' },
  { key: 'alignment', label: 'Alignment' },
  { key: 'dominantHand', label: 'Dominant Hand' },
];

export const STATUS_DEMOGRAPHICS_FIELDS: WikiSummaryFieldDef[] = [
  { key: 'status', label: 'Status' },
  { key: 'primaryFaction', label: 'Primary Faction' },
  { key: 'birthPlace', label: 'Birth Place' },
  { key: 'circumstanceOfBirth', label: 'Circumstance of Birth' },
  { key: 'religiousBelief', label: 'Religious Belief' },
  { key: 'currentLocation', label: 'Current Location' },
  { key: 'currentResidence', label: 'Current Residence' },
  { key: 'currentOccupation', label: 'Current Occupation' },
  { key: 'currentVehicle', label: 'Current Vehicle' },
];

export const TRIVIA_FIELDS: WikiSummaryFieldDef[] = [
  { key: 'favouriteThings', label: 'Favourite Things' },
  { key: 'notablePhysicalCharacteristics', label: 'Notable Physical Characteristics' },
  { key: 'physicalQuirks', label: 'Physical Quirks' },
  { key: 'mannerisms', label: 'Mannerisms' },
  { key: 'likes', label: 'Likes' },
  { key: 'dislikes', label: 'Dislikes' },
  { key: 'habitsHobbies', label: 'Habits & Hobbies' },
  { key: 'apparelAccessories', label: 'Apparel & Accessories' },
];
