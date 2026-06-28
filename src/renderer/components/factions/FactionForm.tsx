import { useEffect, useMemo, useState } from 'react';
import type { FactionSections, FactionWikiSummary } from '../../../shared/contracts/factionTypes';
import { getDescendantIds, wouldCreateCycle } from '../../../shared/factionHierarchy';
import { FACTION_BASIC_INFO_FIELDS } from '../../lib/factionWikiSummaryFieldConfig';
import { normalizeTokenImageSrc } from '../../lib/tokenImageSrc';
import CharacterWikiSummaryGroupFields from '../characters/CharacterWikiSummaryGroupFields';
import CharacterWikiSummaryListEditor from '../characters/CharacterWikiSummaryListEditor';
import EditorActionBar from '../ui/EditorActionBar';
import FactionCurrentImagePreview from './FactionCurrentImagePreview';
import FactionImageDropzone from './FactionImageDropzone';
import FactionMembersEditor from './FactionMembersEditor';
import FactionNameField from './FactionNameField';
import FactionSectionsEditor from './FactionSectionsEditor';
import FactionTypeAndParentFields from './FactionTypeAndParentFields';

const FACTION_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const FACTION_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type FactionImageUploadPayload = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type FactionMemberFormValue = {
  character_id: number;
  role: string;
};

export type FactionFormValues = {
  name: string;
  profile?: string | null;
  image_src?: string | null;
  image_upload?: FactionImageUploadPayload;
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

function validateFactionImageFile(file: File): string | null {
  const mimeType = file.type.toLowerCase();
  if (!FACTION_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.';
  }
  if (file.size === 0) {
    return 'Selected file is empty.';
  }
  if (file.size > FACTION_IMAGE_MAX_SIZE_BYTES) {
    return 'Image exceeds 5 MB limit.';
  }
  return null;
}

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
  const isCreateMode = !initialValues;
  const initialImageSrc = normalizeTokenImageSrc(initialValues?.image_src);
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
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);

  const selectedImagePreviewUrl = useMemo(
    () => selectedImageFile ? URL.createObjectURL(selectedImageFile) : undefined,
    [selectedImageFile],
  );

  useEffect(() => {
    return () => {
      if (selectedImagePreviewUrl) {
        URL.revokeObjectURL(selectedImagePreviewUrl);
      }
    };
  }, [selectedImagePreviewUrl]);

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

    let imageUpload: FactionImageUploadPayload | undefined;
    if (selectedImageFile) {
      const validationError = validateFactionImageFile(selectedImageFile);
      if (validationError) {
        setImageUploadError(validationError);
        return;
      }

      try {
        const buffer = await selectedImageFile.arrayBuffer();
        imageUpload = {
          fileName: selectedImageFile.name,
          mimeType: selectedImageFile.type.toLowerCase(),
          bytes: new Uint8Array(buffer),
        };
      } catch {
        setImageUploadError(
          'Unable to read the selected image file. Try a different image.',
        );
        return;
      }
    }

    setNameError(null);
    setParentError(null);
    setImageUploadError(null);

    await onSave({
      name: trimmedName,
      profile: profile.trim() ? profile : null,
      image_src: clearImage ? null : undefined,
      image_upload: imageUpload,
      clear_image: clearImage,
      sections,
      wiki_summary: wikiSummary,
      type_id: typeId,
      parent_faction_id: parentFactionId,
      // Drop incomplete rows (character_id 0 - "Select a character..." never finished).
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
        <textarea
          id='faction-profile'
          value={profile ?? ''}
          onChange={(e) => setProfile(e.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none'
          rows={4}
          placeholder='A short description of this faction'
          disabled={isSaving}
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

      {!isCreateMode && initialImageSrc
        ? (
          <FactionCurrentImagePreview
            imageSrc={initialImageSrc}
            previewUrl={selectedImagePreviewUrl}
            isCleared={clearImage}
            onClear={() => {
              setClearImage(true);
              setSelectedImageFile(null);
              setImageUploadError(null);
            }}
            disabled={isSaving}
          />
        )
        : null}

      <FactionImageDropzone
        selectedFile={selectedImageFile}
        onFileSelect={(file) => {
          const validationError = validateFactionImageFile(file);
          if (validationError) {
            setSelectedImageFile(null);
            setImageUploadError(validationError);
            return;
          }
          setSelectedImageFile(file);
          setClearImage(false);
          setImageUploadError(null);
        }}
        onClearFile={() => {
          setSelectedImageFile(null);
          setImageUploadError(null);
        }}
        error={imageUploadError}
        disabled={isSaving}
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
