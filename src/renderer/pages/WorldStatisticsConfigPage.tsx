import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  PassiveScoreDefinition,
  ResourceStatisticDefinition,
} from '../../shared/statisticsTypes';
import PassiveScoreSection from '../components/statistics/PassiveScoreSection';
import ResourceSection from '../components/statistics/ResourceSection';
import { useToast } from '../components/ui/ToastProvider';
import WorldSidebar from '../components/worlds/WorldSidebar';
import {
  parseWorldStatisticsConfig,
  saveWorldStatisticsList,
} from '../lib/worldStatisticsConfigHelpers';

export default function WorldStatisticsConfigPage() {
  const { id } = useParams();
  const worldId = useMemo(() => {
    if (!id) {
      return null;
    }

    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }, [id]);

  const toast = useToast();
  const [world, setWorld] = useState<World | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceStatisticDefinition[]>([]);
  const [isCreateResourceOpen, setIsCreateResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceStatisticDefinition | null>(null);
  const [pendingDeleteResource, setPendingDeleteResource] = useState<
    ResourceStatisticDefinition | null
  >(null);
  const [isDeletingResource, setIsDeletingResource] = useState(false);
  const [passiveScores, setPassiveScores] = useState<PassiveScoreDefinition[]>(
    [],
  );
  const [isCreatePassiveScoreOpen, setIsCreatePassiveScoreOpen] = useState(false);
  const [editingPassiveScore, setEditingPassiveScore] = useState<PassiveScoreDefinition | null>(
    null,
  );
  const [pendingDeletePassiveScore, setPendingDeletePassiveScore] = useState<
    PassiveScoreDefinition | null
  >(null);
  const [isDeletingPassiveScore, setIsDeletingPassiveScore] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (worldId === null) {
      setWorld(null);
      setError('Invalid world id.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadWorld = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const existingWorld = await window.db.worlds.getById(worldId);
        if (!existingWorld) {
          if (isMounted) {
            setWorld(null);
            setError('World not found.');
          }
          return;
        }

        if (isMounted) {
          setWorld(existingWorld);
        }
      } catch {
        if (isMounted) {
          setWorld(null);
          setError('Unable to load this world right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWorld();

    return () => {
      isMounted = false;
    };
  }, [worldId]);

  // Parse world config and extract resources
  useEffect(() => {
    if (!world) {
      setResources([]);
      return;
    }

    const config = parseWorldStatisticsConfig(world.config);
    setResources(config.statistics?.resources ?? []);
  }, [world]);

  // Parse world config and extract passive scores
  useEffect(() => {
    if (!world) {
      setPassiveScores([]);
      return;
    }

    const config = parseWorldStatisticsConfig(world.config);
    setPassiveScores(config.statistics?.passiveScores ?? []);
  }, [world]);

  const handleCreateResource = async (data: ResourceStatisticDefinition) => {
    if (!world) return;

    try {
      const updatedWorld = await saveWorldStatisticsList(world, 'resources', [
        ...resources,
        data,
      ]);

      setWorld(updatedWorld);
      setIsCreateResourceOpen(false);
      toast.success('Resource created.', `"${data.name}" was added.`);
    } catch (err) {
      toast.error(
        'Failed to create resource.',
        err instanceof Error ? err.message : 'Please try again.',
      );
      throw err;
    }
  };

  const handleUpdateResource = async (data: ResourceStatisticDefinition) => {
    if (!world || !editingResource) return;

    try {
      const updatedResources = resources.map((r) => (r.id === editingResource.id ? data : r));
      const updatedWorld = await saveWorldStatisticsList(world, 'resources', updatedResources);

      setWorld(updatedWorld);
      setEditingResource(null);
      toast.success('Resource updated.', `"${data.name}" was saved.`);
    } catch (err) {
      toast.error(
        'Failed to update resource.',
        err instanceof Error ? err.message : 'Please try again.',
      );
      throw err;
    }
  };

  const handleDeleteResource = async () => {
    if (!world || !pendingDeleteResource) return;

    setIsDeletingResource(true);

    try {
      const updatedResources = resources.filter((r) => r.id !== pendingDeleteResource.id);
      const updatedWorld = await saveWorldStatisticsList(world, 'resources', updatedResources);

      setWorld(updatedWorld);
      toast.success(
        'Resource deleted.',
        `"${pendingDeleteResource.name}" was removed.`,
      );
    } catch (err) {
      toast.error(
        'Failed to delete resource.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsDeletingResource(false);
      setPendingDeleteResource(null);
    }
  };

  const handleCreatePassiveScore = async (data: PassiveScoreDefinition) => {
    if (!world) return;

    try {
      const updatedWorld = await saveWorldStatisticsList(world, 'passiveScores', [
        ...passiveScores,
        data,
      ]);

      setWorld(updatedWorld);
      setIsCreatePassiveScoreOpen(false);
      toast.success('Passive score created.', `"${data.name}" was added.`);
    } catch (err) {
      toast.error(
        'Failed to create passive score.',
        err instanceof Error ? err.message : 'Please try again.',
      );
      throw err;
    }
  };

  const handleUpdatePassiveScore = async (data: PassiveScoreDefinition) => {
    if (!world || !editingPassiveScore) return;

    try {
      const updatedPassiveScores = passiveScores.map((ps) =>
        ps.id === editingPassiveScore.id ? data : ps
      );
      const updatedWorld = await saveWorldStatisticsList(
        world,
        'passiveScores',
        updatedPassiveScores,
      );

      setWorld(updatedWorld);
      setEditingPassiveScore(null);
      toast.success('Passive score updated.', `"${data.name}" was saved.`);
    } catch (err) {
      toast.error(
        'Failed to update passive score.',
        err instanceof Error ? err.message : 'Please try again.',
      );
      throw err;
    }
  };

  const handleDeletePassiveScore = async () => {
    if (!world || !pendingDeletePassiveScore) return;

    setIsDeletingPassiveScore(true);

    try {
      const updatedPassiveScores = passiveScores.filter(
        (ps) => ps.id !== pendingDeletePassiveScore.id,
      );
      const updatedWorld = await saveWorldStatisticsList(
        world,
        'passiveScores',
        updatedPassiveScores,
      );

      setWorld(updatedWorld);
      toast.success(
        'Passive score deleted.',
        `"${pendingDeletePassiveScore.name}" was removed.`,
      );
    } catch (err) {
      toast.error(
        'Failed to delete passive score.',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setIsDeletingPassiveScore(false);
      setPendingDeletePassiveScore(null);
    }
  };

  return (
    <div className='flex min-h-screen'>
      <WorldSidebar worldId={worldId} />
      <main className='flex-1 space-y-6 p-6'>
        <header className='space-y-2'>
          <Link
            to={worldId !== null ? `/world/${worldId}` : '/'}
            className='inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900'
          >
            Back to world
          </Link>
          <h1 className='text-2xl font-semibold tracking-tight text-slate-900'>
            Statistics Configuration
          </h1>
          {world
            ? (
              <p className='text-sm text-slate-600'>
                Configure game system statistics for <strong>{world.name}</strong>
              </p>
            )
            : null}
        </header>

        {isLoading
          ? <p className='text-sm text-slate-600'>Loading...</p>
          : error
          ? <p className='text-sm text-red-600'>{error}</p>
          : world
          ? (
            <div className='space-y-8'>
              <ResourceSection
                resources={resources}
                isCreateOpen={isCreateResourceOpen}
                onCreateOpen={() => setIsCreateResourceOpen(true)}
                onCreateClose={() => setIsCreateResourceOpen(false)}
                onCreateSubmit={handleCreateResource}
                editingResource={editingResource}
                onEditOpen={setEditingResource}
                onEditClose={() => setEditingResource(null)}
                onEditSubmit={handleUpdateResource}
                pendingDelete={pendingDeleteResource}
                onDeleteRequest={setPendingDeleteResource}
                onDeleteConfirm={handleDeleteResource}
                onDeleteCancel={() => setPendingDeleteResource(null)}
                isDeleting={isDeletingResource}
              />

              <PassiveScoreSection
                passiveScores={passiveScores}
                isCreateOpen={isCreatePassiveScoreOpen}
                onCreateOpen={() => setIsCreatePassiveScoreOpen(true)}
                onCreateClose={() => setIsCreatePassiveScoreOpen(false)}
                onCreateSubmit={handleCreatePassiveScore}
                editingPassiveScore={editingPassiveScore}
                onEditOpen={setEditingPassiveScore}
                onEditClose={() => setEditingPassiveScore(null)}
                onEditSubmit={handleUpdatePassiveScore}
                pendingDelete={pendingDeletePassiveScore}
                onDeleteRequest={setPendingDeletePassiveScore}
                onDeleteConfirm={handleDeletePassiveScore}
                onDeleteCancel={() => setPendingDeletePassiveScore(null)}
                isDeleting={isDeletingPassiveScore}
              />
            </div>
          )
          : null}
      </main>
    </div>
  );
}
