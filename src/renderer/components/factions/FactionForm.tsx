import { useMemo, useState } from 'react';
import type { FactionSections, FactionWikiSummary } from '../../../shared/contracts/factionTypes';
import { getDescendantIds, wouldCreateCycle } from '../../../shared/factionHierarchy';
import { useImageCropDraft } from '../../hooks/useImageCropDraft';
import { FACTION_BASIC_INFO_FIELDS } from '../../lib/factionWikiSummaryFieldConfig';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import CharacterWikiSummaryGroupFields from '../characters/CharacterWikiSummaryGroupFields';
import CharacterWikiSummaryListEditor from '../characters/CharacterWikiSummaryListEditor';
import EditorActionBar from '../ui/EditorActionBar';
import RichTextEditor from '../ui/RichTextEditor';
import FactionImageField from './FactionImageField';
import FactionMembersEditor from './FactionMembersEditor';
import FactionNameField from './FactionNameField';
import FactionSectionsEditor from './FactionSectionsEditor';
import FactionTypeAndParentFields from './FactionTypeAndParentFields';

export type FactionMemberFormValue = {
  character_id: number;
  role: string;
};

export type FactionFormValues = {
  name: string;
  profile?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  image_edit_draft?: ReturnType<typeof useImageCropDraft>['imageEditDraft'];
  clear_image?: boolean;
  sections: FactionSections;
  wiki_summary: FactionWikiSummary;
  type_id: number | null;
  parent_faction_id: number | null;
  members: FactionMemberFormValue[];
};

type FactionFormProps = {
  initialValues?: FactionFormValues;
  factionId?: number;
  allFactionsInWorld: Faction[];
  factionTypes: FactionType[];
  worldId: number;
  onManageTypes: () => void;
  onSave: (data: FactionFormValues) => Promise<void> | void;
  onClose: () => void;
  isSaving: boolean;
};

export default function FactionForm({
  initialValues,
  factionId,
  allFactionsInWorld,
  factionTypes,
  worldId,
  onManageTypes,
  onSave,
  onClose,
  isSaving,
}: FactionFormProps) {
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
  const initialOriginalImageSrc = normalizeTokenImageSrc(
    initialValues?.original_image_src,
  ) ?? initialImageSrc;
  const [name, setName] = useState(initialValues?.name ?? '');
  const [profile, setProfile] = useState(initialValues?.profile ?? '');
  const [sections, setSections] = useState<FactionSections>(initialValues?.sections ?? {});
  const [wikiSummary, setWikiSummary] = useState<FactionWikiSummary>(
    initialValues?.wiki_summary ?? {},
  );
  const [typeId, setTypeId] = useState<number | null>(initialValues?.type_id ?? null);
  const [parentFactionId, setParentFactionId] = useState<number | null>(
    initialValues?.parent_faction_id ?? null,
  );
  const [members, setMembers] = useState<FactionMemberFormValue[]>(
    initialValues?.members ?? [],
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [parentError, setParentError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const cropDraft = useImageCropDraft({
    initialImageSrc,
    initialOriginalImageSrc,
  });

  const availableParentFactions = useMemo(() => {
    const excludedIds = new Set<number>();
    if (factionId !== undefined) {
      excludedIds.add(factionId);
      for (const descendantId of getDescendantIds(factionId, allFactionsInWorld)) {
        excludedIds.add(descendantId);
      }
    }
    return allFactionsInWorld.filter((faction) => !excludedIds.has(faction.id));
  }, [allFactionsInWorld, factionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    if (
      factionId !== undefined
      && parentFactionId !== null
      && wouldCreateCycle(factionId, parentFactionId, allFactionsInWorld)
    ) {
      setParentError('A faction cannot be its own ancestor.');
      return;
    }

    setNameError(null);
    setParentError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      profile: profile.trim() ? profile : null,
      image_src: clearImage ? null : undefined,
      original_image_src: clearImage ? null : undefined,
      image_crop: clearImage ? null : undefined,
      image_edit_draft: cropDraft.imageEditDraft ?? undefined,
      clear_image: clearImage,
      sections,
      wiki_summary: wikiSummary,
      type_id: typeId,
      parent_faction_id: parentFactionId,
      members: members.filter((member) => member.character_id !== 0),
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <EditorActionBar>
        <button type='button' className='btn btn-ghost' onClick={onClose} disabled={isSaving}>
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={isSaving}>
          {isSaving ? <span className='loading loading-spinner loading-xs' /> : null}
          <span>{initialValues ? 'Save' : 'Create'}</span>
        </button>
      </EditorActionBar>

      <FactionNameField
        name={name}
        onChange={(value) => {
          setName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
        disabled={isSaving}
      />

      <div>
        <label htmlFor='faction-profile' className='mb-1 block text-sm font-medium text-slate-700'>
          Profile
        </label>
        <RichTextEditor
          id='faction-profile'
          value={profile ?? ''}
          onChange={setProfile}
          variant='full'
          placeholder='A short description of this faction'
          editable={!isSaving}
          aria-label='Profile'
        />
      </div>

      <FactionTypeAndParentFields
        typeId={typeId}
        onTypeIdChange={setTypeId}
        factionTypes={factionTypes}
        onManageTypes={onManageTypes}
        parentFactionId={parentFactionId}
        onParentFactionIdChange={(value) => {
          setParentFactionId(value);
          if (parentError) setParentError(null);
        }}
        availableParentFactions={availableParentFactions}
        parentError={parentError}
        disabled={isSaving}
      />

      <FactionImageField
        cropDraft={cropDraft}
        initialCropJson={initialValues?.image_crop}
        clearImage={clearImage}
        isSaving={isSaving}
        imageUploadError={imageUploadError}
        onClearImageChange={setClearImage}
        onImageUploadErrorChange={setImageUploadError}
      />

      <FactionSectionsEditor sections={sections} onChange={setSections} disabled={isSaving} />

      <div className='space-y-4 border-t border-slate-200 pt-4'>
        <h3 className='text-sm font-semibold text-slate-900'>Wiki Summary</h3>
        <CharacterWikiSummaryGroupFields
          legend='Basic Information'
          fields={FACTION_BASIC_INFO_FIELDS}
          values={wikiSummary as Record<string, string | null | undefined>}
          onChange={(key, value) => setWikiSummary({ ...wikiSummary, [key]: value })}
          disabled={isSaving}
        />
        <CharacterWikiSummaryListEditor
          legend='Aliases'
          items={wikiSummary.aliases ?? []}
          onChange={(items) => setWikiSummary({ ...wikiSummary, aliases: items })}
          disabled={isSaving}
        />
        <CharacterWikiSummaryListEditor
          legend='Locations'
          items={wikiSummary.locations ?? []}
          onChange={(items) => setWikiSummary({ ...wikiSummary, locations: items })}
          disabled={isSaving}
        />
      </div>

      <FactionMembersEditor
        members={members}
        worldId={worldId}
        onChange={setMembers}
        disabled={isSaving}
      />
    </form>
  );
}
