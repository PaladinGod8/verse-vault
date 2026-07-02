// @ts-expect-error - @tailwindcss/vite uses 'exports' field not supported by moduleResolution:node
import tailwindcss from '@tailwindcss/vite';
import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`,
    },
    plugins: [tailwindcss(), pluginExposeRenderer(name)],
    // phonemize ships dictionary JSON whose keys include reserved words (e.g.
    // "await"). esbuild's dep pre-bundler turns JSON keys into named bindings,
    // emitting `var await = ...` — a SyntaxError in an ES module that crashes
    // the whole renderer to a white screen. Excluding it from optimization lets
    // Vite's Rollup JSON handling serve it (reserved-word keys stay reachable
    // via the default export, which phonemize reads through resolveJson).
    optimizeDeps: {
      exclude: ['phonemize'],
    },
    resolve: {
      preserveSymlinks: true,
    },
    clearScreen: false,
  } as UserConfig;
});
