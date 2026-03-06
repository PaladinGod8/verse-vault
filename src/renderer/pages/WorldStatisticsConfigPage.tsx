import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import WorldSidebar from '../components/worlds/WorldSidebar';
import ResourceDefinitionForm from '../components/statistics/ResourceDefinitionForm';
import PassiveScoreDefinitionForm from '../components/statistics/PassiveScoreDefinitionForm';
import ModalShell from '../components/ui/ModalShell';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/ToastProvider';
import type {
  WorldStatisticsConfig,
  ResourceStatisticDefinition,
  PassiveScoreDefinition,
} from '../../shared/statisticsTypes';

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
  const [editingResource, setEditingResource] =
    useState<ResourceStatisticDefinition | null>(null);
  const [pendingDeleteResource, setPendingDeleteResource] =
    useState<ResourceStatisticDefinition | null>(null);
  const [isDeletingResource, setIsDeletingResource] = useState(false);
  const [passiveScores, setPassiveScores] = useState<PassiveScoreDefinition[]>(
    [],
  );
  const [isCreatePassiveScoreOpen, setIsCreatePassiveScoreOpen] =
    useState(false);
  const [editingPassiveScore, setEditingPassiveScore] =
    useState<PassiveScoreDefinition | null>(null);
  const [pendingDeletePassiveScore, setPendingDeletePassiveScore] =
    useState<PassiveScoreDefinition | null>(null);
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

    try {
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      setResources(config.statistics?.resources ?? []);
    } catch {
      setResources([]);
    }
  }, [world]);

  // Parse world config and extract passive scores
  useEffect(() => {
    if (!world) {
      setPassiveScores([]);
      return;
    }

    try {
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      setPassiveScores(config.statistics?.passiveScores ?? []);
    } catch {
      setPassiveScores([]);
    }
  }, [world]);

  const handleCreateResource = async (data: ResourceStatisticDefinition) => {
    if (!world) return;

    try {
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      const updatedResources = [...(config.statistics?.resources ?? []), data];

      const updatedConfig: WorldStatisticsConfig = {
        ...config,
        statistics: {
          ...config.statistics,
          resources: updatedResources,
        },
      };

      const updatedWorld = await window.db.worlds.update(world.id, {
        config: JSON.stringify(updatedConfig),
      });

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
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      const updatedResources = (config.statistics?.resources ?? []).map((r) =>
        r.id === editingResource.id ? data : r,
      );

      const updatedConfig: WorldStatisticsConfig = {
        ...config,
        statistics: {
          ...config.statistics,
          resources: updatedResources,
        },
      };

      const updatedWorld = await window.db.worlds.update(world.id, {
        config: JSON.stringify(updatedConfig),
      });

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
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      const updatedResources = (config.statistics?.resources ?? []).filter(
        (r) => r.id !== pendingDeleteResource.id,
      );

      const updatedConfig: WorldStatisticsConfig = {
        ...config,
        statistics: {
          ...config.statistics,
          resources: updatedResources,
        },
      };

      const updatedWorld = await window.db.worlds.update(world.id, {
        config: JSON.stringify(updatedConfig),
      });

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
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      const updatedPassiveScores = [
        ...(config.statistics?.passiveScores ?? []),
        data,
      ];

      const updatedConfig: WorldStatisticsConfig = {
        ...config,
        statistics: {
          ...config.statistics,
          passiveScores: updatedPassiveScores,
        },
      };

      const updatedWorld = await window.db.worlds.update(world.id, {
        config: JSON.stringify(updatedConfig),
      });

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
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      const updatedPassiveScores = (config.statistics?.passiveScores ?? []).map(
        (ps) => (ps.id === editingPassiveScore.id ? data : ps),
      );

      const updatedConfig: WorldStatisticsConfig = {
        ...config,
        statistics: {
          ...config.statistics,
          passiveScores: updatedPassiveScores,
        },
      };

      const updatedWorld = await window.db.worlds.update(world.id, {
        config: JSON.stringify(updatedConfig),
      });

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
      const config: WorldStatisticsConfig = JSON.parse(world.config);
      const updatedPassiveScores = (
        config.statistics?.passiveScores ?? []
      ).filter((ps) => ps.id !== pendingDeletePassiveScore.id);

      const updatedConfig: WorldStatisticsConfig = {
        ...config,
        statistics: {
          ...config.statistics,
          passiveScores: updatedPassiveScores,
        },
      };

      const updatedWorld = await window.db.worlds.update(world.id, {
        config: JSON.stringify(updatedConfig),
      });

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
    <div className="flex min-h-screen">
      <WorldSidebar worldId={worldId} />
      <main className="flex-1 space-y-6 p-6">
        <header className="space-y-2">
          <Link
            to={worldId !== null ? `/world/${worldId}` : '/'}
            className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Back to world
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Statistics Configuration
          </h1>
          {world ? (
            <p className="text-sm text-slate-600">
              Configure game system statistics for <strong>{world.name}</strong>
            </p>
          ) : null}
        </header>

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : world ? (
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Primary Resources
                </h2>
                <button
                  onClick={() => setIsCreateResourceOpen(true)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Add Resource
                </button>
              </div>

              {resources.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No resources defined yet. Add your first resource to get
                  started.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          ID
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Abbreviation
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Default
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {resources.map((resource) => (
                        <tr key={resource.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm text-slate-900">
                            {resource.id}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900">
                            {resource.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {resource.abbreviation}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {resource.isDefault ? 'Yes' : 'No'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingResource(resource)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  setPendingDeleteResource(resource)
                                }
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Core Ability Scores & Passive Scores
                </h2>
                <button
                  onClick={() => setIsCreatePassiveScoreOpen(true)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Add Passive Score
                </button>
              </div>

              {passiveScores.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No passive scores defined yet. Add your first passive score to
                  get started.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          ID
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Abbreviation
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Default
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {passiveScores.map((ps) => (
                        <tr key={ps.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm text-slate-900">
                            {ps.id}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-900">
                            {ps.name}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {ps.abbreviation}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {ps.type === 'ability_score'
                              ? 'Ability'
                              : ps.type === 'proficiency_bonus'
                                ? 'PB'
                                : 'Custom'}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {ps.isDefault ? 'Yes' : 'No'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingPassiveScore(ps)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setPendingDeletePassiveScore(ps)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>

      {/* Create Resource Modal */}
      {isCreateResourceOpen ? (
        <ModalShell
          isOpen={isCreateResourceOpen}
          onClose={() => setIsCreateResourceOpen(false)}
          labelledBy="create-resource-title"
          boxClassName="max-w-lg"
        >
          <h2
            id="create-resource-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Create Resource
          </h2>
          <ResourceDefinitionForm
            mode="create"
            existingIds={resources.map((r) => r.id)}
            onSubmit={handleCreateResource}
            onCancel={() => setIsCreateResourceOpen(false)}
          />
        </ModalShell>
      ) : null}

      {/* Edit Resource Modal */}
      {editingResource ? (
        <ModalShell
          isOpen={editingResource !== null}
          onClose={() => setEditingResource(null)}
          labelledBy="edit-resource-title"
          boxClassName="max-w-lg"
        >
          <h2
            id="edit-resource-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Edit Resource
          </h2>
          <ResourceDefinitionForm
            mode="edit"
            initialValues={editingResource}
            existingIds={resources.map((r) => r.id)}
            onSubmit={handleUpdateResource}
            onCancel={() => setEditingResource(null)}
          />
        </ModalShell>
      ) : null}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={pendingDeleteResource !== null}
        title={`Delete "${pendingDeleteResource?.name ?? ''}"?`}
        message="This will remove the resource definition. Existing statblock data will not be affected."
        onConfirm={handleDeleteResource}
        onCancel={() => setPendingDeleteResource(null)}
        confirmLabel="Delete"
        isConfirming={isDeletingResource}
      />

      {/* Create Passive Score Modal */}
      {isCreatePassiveScoreOpen ? (
        <ModalShell
          isOpen={isCreatePassiveScoreOpen}
          onClose={() => setIsCreatePassiveScoreOpen(false)}
          labelledBy="create-passive-score-title"
          boxClassName="max-w-lg"
        >
          <h2
            id="create-passive-score-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Create Passive Score
          </h2>
          <PassiveScoreDefinitionForm
            mode="create"
            existingIds={passiveScores.map((ps) => ps.id)}
            onSubmit={handleCreatePassiveScore}
            onCancel={() => setIsCreatePassiveScoreOpen(false)}
          />
        </ModalShell>
      ) : null}

      {/* Edit Passive Score Modal */}
      {editingPassiveScore ? (
        <ModalShell
          isOpen={editingPassiveScore !== null}
          onClose={() => setEditingPassiveScore(null)}
          labelledBy="edit-passive-score-title"
          boxClassName="max-w-lg"
        >
          <h2
            id="edit-passive-score-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Edit Passive Score
          </h2>
          <PassiveScoreDefinitionForm
            mode="edit"
            initialValues={editingPassiveScore}
            existingIds={passiveScores.map((ps) => ps.id)}
            onSubmit={handleUpdatePassiveScore}
            onCancel={() => setEditingPassiveScore(null)}
          />
        </ModalShell>
      ) : null}

      {/* Delete Passive Score Confirmation */}
      <ConfirmDialog
        isOpen={pendingDeletePassiveScore !== null}
        title={`Delete "${pendingDeletePassiveScore?.name ?? ''}"?`}
        message="This will remove the passive score definition. Existing statblock data will not be affected."
        onConfirm={handleDeletePassiveScore}
        onCancel={() => setPendingDeletePassiveScore(null)}
        confirmLabel="Delete"
        isConfirming={isDeletingPassiveScore}
      />
    </div>
  );
}
