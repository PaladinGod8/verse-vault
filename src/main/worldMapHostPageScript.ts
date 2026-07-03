export const WORLD_MAP_HOST_PAGE_SCRIPT = String.raw`
      (() => {
        const vendorVersion = __VV_VENDOR_VERSION__;
        const host = window.worldMapHost;
        const frame = document.getElementById('fmg-frame');
        const title = document.getElementById('world-title');
        const statusLine = document.getElementById('status-line');
        const saveButton = document.getElementById('save-button');
        const regenerateButton = document.getElementById('regenerate-button');
        const exportButton = document.getElementById('export-button');
        const closeButton = document.getElementById('close-button');
        const canonicalPersistenceMessage =
          'Verse Vault Save is canonical here. Use Save or Export Copy from host toolbar.';
        const state = {
          session: null,
          dirty: false,
          busy: false,
          pendingCloseDecision: null,
        };

        function setStatus(message, isError = false) {
          statusLine.textContent = message;
          statusLine.classList.toggle('error', isError);
        }

        function setBusy(busy) {
          state.busy = busy;
          saveButton.disabled = busy;
          regenerateButton.disabled = busy;
          exportButton.disabled = busy;
          closeButton.disabled = busy;
        }

        function buildVendorSrc(options = {}) {
          const url = new URL(state.session.vendorEntryUrl);
          url.searchParams.set('seed', String(Date.now()));
          if (options.cacheBust) {
            url.searchParams.set('vv', String(options.cacheBust));
          }
          return url.toString();
        }

        function tryGetSaveApi() {
          const win = frame.contentWindow;
          const direct = win?.Services?.Save?.prepareMapData;
          if (typeof direct === 'function') {
            return { target: win.Services.Save, fn: direct };
          }
          const fallback = win?.prepareMapData;
          if (typeof fallback === 'function') {
            return { target: win, fn: fallback };
          }
          return null;
        }

        async function waitForMapReady(timeoutMs = 60000) {
          const started = Date.now();
          while (Date.now() - started < timeoutMs) {
            const api = tryGetSaveApi();
            if (api) {
              try {
                api.fn.call(api.target);
                return;
              } catch {
              }
            }
            await new Promise((resolve) => window.setTimeout(resolve, 150));
          }
          throw new Error('FMG editor did not become ready in time');
        }

        function sanitizeFileName(value) {
          return value.replace(/[\\\\/:*?"<>|]/g, '-').trim() || 'world-map';
        }

        function syncMapName(forceWorldName = false) {
          const input = frame.contentDocument?.getElementById('mapName');
          if (!(input instanceof HTMLInputElement)) {
            return;
          }
          if (forceWorldName || !state.session.hasExistingMap) {
            input.value = state.session.worldName;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        function maskUpstreamControls() {
          const doc = frame.contentDocument;
          if (!doc || doc.getElementById('vv-world-map-mask')) {
            return;
          }
          const style = doc.createElement('style');
          style.id = 'vv-world-map-mask';
          style.textContent = [
            '#saveButton',
            '#loadButton',
            '#saveMapData',
            '#loadMapData',
            '#saveToStorage',
            '#saveToMachine',
            '#saveToDropbox',
            '#loadFromDropboxButtons',
            '#sharableLinkContainer',
          ].join(',') + '{display:none !important;}';
          doc.head.appendChild(style);
        }

        function assignControlValue(id, value) {
          const field = frame.contentDocument?.getElementById(id);
          if (
            !(field instanceof HTMLInputElement)
            && !(field instanceof HTMLSelectElement)
          ) {
            return;
          }
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function suppressUpstreamPersistence() {
          const doc = frame.contentDocument;
          const win = frame.contentWindow;
          if (!doc || !win) {
            return;
          }

          maskUpstreamControls();
          assignControlValue('autosaveIntervalInput', '0');
          assignControlValue('autosaveIntervalOutput', '0');
          assignControlValue('onloadBehavior', 'random');

          try {
            win.localStorage?.removeItem('autosaveInterval');
            win.localStorage?.removeItem('onloadBehavior');
          } catch {
          }

          try {
            win.onbeforeunload = null;
          } catch {
          }

          const blockAction = () => {
            setStatus(canonicalPersistenceMessage);
          };
          win.showSavePane = blockAction;
          win.showLoadPane = blockAction;
          win.quickLoad = blockAction;
          win.saveMap = blockAction;
          win.loadFromDropbox = blockAction;
          win.connectToDropbox = blockAction;

          if (!doc.body.dataset.vvWorldMapShortcutsBlocked) {
            doc.addEventListener('keydown', (event) => {
              const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.code === 'KeyS';
              const isStorageShortcut = event.code === 'F6';
              if (!isSaveShortcut && !isStorageShortcut) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              setStatus(canonicalPersistenceMessage);
            }, true);
            doc.body.dataset.vvWorldMapShortcutsBlocked = 'true';
          }
        }

        function extractMapData() {
          const api = tryGetSaveApi();
          if (!api) {
            throw new Error('FMG save API unavailable');
          }
          return api.fn.call(api.target);
        }

        function buildSaveMeta() {
          const mapNameInput = frame.contentDocument?.getElementById('mapName');
          const mapName = mapNameInput instanceof HTMLInputElement
            ? (mapNameInput.value.trim() || state.session.worldName)
            : state.session.worldName;
          return {
            mapName,
            generatorVersion: vendorVersion,
          };
        }

        async function saveCurrent() {
          const mapData = extractMapData();
          const worldMap = await host.saveCurrent(mapData, buildSaveMeta());
          state.session.worldMapId = worldMap.id;
          state.session.hasExistingMap = true;
          state.dirty = false;
          setStatus('Saved canonical Verse Vault snapshot.');
          return worldMap;
        }

        async function exportCopy() {
          const mapData = extractMapData();
          const name = sanitizeFileName(buildSaveMeta().mapName || state.session.worldName);
          await host.exportCopy(mapData, name + '.map.gz');
          setStatus('Exported copy without changing bound snapshot.');
        }

        function awaitFrameLoad(src) {
          return new Promise((resolve, reject) => {
            const handleLoad = () => {
              frame.removeEventListener('load', handleLoad);
              frame.removeEventListener('error', handleError);
              resolve();
            };
            const handleError = () => {
              frame.removeEventListener('load', handleLoad);
              frame.removeEventListener('error', handleError);
              reject(new Error('FMG window failed to load'));
            };
            frame.addEventListener('load', handleLoad, { once: true });
            frame.addEventListener('error', handleError, { once: true });
            frame.src = src;
          });
        }

        async function loadExistingSnapshot(mapFileUrl) {
          const win = frame.contentWindow;
          if (!win || typeof win.loadMapFromURL !== 'function') {
            throw new Error('FMG load API unavailable');
          }

          await new Promise((resolve, reject) => {
            const original = win.parseLoadedData;
            if (typeof original !== 'function') {
              reject(new Error('FMG map parse hook unavailable'));
              return;
            }
            let settled = false;
            win.parseLoadedData = async function (...args) {
              try {
                const result = await original.apply(this, args);
                settled = true;
                resolve(result);
                return result;
              } catch (error) {
                settled = true;
                reject(error);
                throw error;
              } finally {
                win.parseLoadedData = original;
              }
            };
            try {
              win.loadMapFromURL(mapFileUrl, 0);
            } catch (error) {
              win.parseLoadedData = original;
              reject(error);
            }
            window.setTimeout(() => {
              if (!settled) {
                win.parseLoadedData = original;
                reject(new Error('Timed out loading stored world map'));
              }
            }, 60000);
          });
        }

        async function loadEditor(options = {}) {
          setBusy(true);
          const isRegenerate = Boolean(options.regenerate);
          try {
            await awaitFrameLoad(buildVendorSrc({ cacheBust: Date.now() }));
            await waitForMapReady();
            suppressUpstreamPersistence();

            if (!isRegenerate && state.session.hasExistingMap && state.session.mapFileUrl) {
              setStatus('Loading saved Verse Vault snapshot...');
              await loadExistingSnapshot(state.session.mapFileUrl);
            } else {
              syncMapName(true);
            }

            await waitForMapReady();
            suppressUpstreamPersistence();
            if (isRegenerate || !state.session.hasExistingMap) {
              syncMapName(true);
            }

            state.dirty = true;
            if (isRegenerate) {
              await saveCurrent();
              state.dirty = false;
              setStatus('Generated fresh map and replaced canonical snapshot.');
            } else if (state.session.hasExistingMap) {
              setStatus('Loaded saved Verse Vault snapshot.');
            } else {
              setStatus('Fresh generated map ready. First save will bind it to this world.');
            }
          } finally {
            setBusy(false);
          }
        }

        async function withBusy(action) {
          if (state.busy) {
            return;
          }
          setBusy(true);
          try {
            await action();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setStatus(message, true);
            throw error;
          } finally {
            setBusy(false);
          }
        }

        async function handleRegenerate() {
          if (!window.confirm('Regenerate world map? Current unsaved editor state will be replaced.')) {
            return;
          }
          await host.regenerate();
          await loadEditor({ regenerate: true });
        }

        async function handleWindowCloseRequest() {
          if (!state.dirty) {
            return { ok: true };
          }
          try {
            await saveCurrent();
            return { ok: true };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { ok: false, errorMessage: message };
          }
        }

        window.__VV_WORLD_MAP_HOST__ = { handleWindowCloseRequest };
        window.__VV_WORLD_MAP_HOST__.consumeWindowCloseDecision = () => {
          const decision = state.pendingCloseDecision;
          state.pendingCloseDecision = null;
          return decision;
        };

        saveButton.addEventListener('click', () => {
          void withBusy(() => saveCurrent());
        });
        regenerateButton.addEventListener('click', () => {
          void withBusy(() => handleRegenerate());
        });
        exportButton.addEventListener('click', () => {
          void withBusy(() => exportCopy());
        });
        closeButton.addEventListener('click', () => {
          void withBusy(async () => {
            state.pendingCloseDecision = await handleWindowCloseRequest();
            await host.close(state.pendingCloseDecision);
          });
        });

        async function init() {
          if (!host) {
            title.textContent = 'World Map host bridge missing';
            setStatus('preloadWorldMap bridge missing', true);
            return;
          }

          try {
            state.session = await host.getSession();
            title.textContent = state.session.worldName + ' World Map';
            await loadEditor({ regenerate: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            title.textContent = 'World Map failed to open';
            setStatus(message, true);
          }
        }

        void init();
      })();
`;
