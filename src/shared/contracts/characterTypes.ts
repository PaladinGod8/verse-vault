// Character JSON-shape types: fixed text sections and the standardized wiki summary.

export interface CharacterSections {
  background?: string | null;
  personality?: string | null;
  relationships?: string | null;
  notes?: string | null;
}

export interface CharacterWikiSummary {
  biographic?: {
    birthName?: string | null;
    ipaPronunciation?: string | null;
    mainEpithet?: string | null;
  };
  aliases?: Array<{ text: string; note?: string | null; }>;
  titles?: Array<{ text: string; note?: string | null; }>;
  personalDescription?: {
    birthDate?: string | null;
    currentAge?: string | null;
    gender?: string | null;
    sex?: string | null;
    height?: string | null;
    weight?: string | null;
    hair?: string | null;
    eyes?: string | null;
    skinColour?: string | null;
    bloodType?: string | null;
    creatureTypes?: string | null;
    mainRace?: string | null;
    mainClass?: string | null;
    alignment?: string | null;
    dominantHand?: string | null;
  };
  agesTimeline?: Array<{ age: string; reference: string; }>;
  conditions?: string[];
  statusDemographics?: {
    status?: string | null;
    birthPlace?: string | null;
    circumstanceOfBirth?: string | null;
    religiousBelief?: string | null;
    currentLocation?: string | null;
    currentResidence?: string | null;
    currentOccupation?: string | null;
    currentVehicle?: string | null;
  };
  educationalHistory?: string[];
  occupationalHistory?: string[];
  trivia?: {
    favouriteThings?: string | null;
    notablePhysicalCharacteristics?: string | null;
    physicalQuirks?: string | null;
    mannerisms?: string | null;
    likes?: string | null;
    dislikes?: string | null;
    habitsHobbies?: string | null;
    apparelAccessories?: string | null;
  };
}

export function getDefaultCharacterSections(): CharacterSections {
  return {};
}

export function getDefaultCharacterWikiSummary(): CharacterWikiSummary {
  return {};
}
