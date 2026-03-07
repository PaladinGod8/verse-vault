import commonjs from '@rollup/plugin-commonjs';
import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vite';
import { external, getBuildConfig, getBuildDefine, pluginHotRestart } from './vite.base.config';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  if (!forgeConfigSelf.entry) {
    throw new Error('Missing main entry in Forge Vite config.');
  }
  const define = getBuildDefine(forgeEnv);
  const config: UserConfig = {
    build: {
      sourcemap: true,
      lib: {
        entry: forgeConfigSelf.entry,
        fileName: () => '[name].js',
        formats: ['cjs'],
      },
      rollupOptions: {
        external: [...external, 'electron-devtools-installer'],
      },
    },
    plugins: [pluginHotRestart('restart'), commonjs()],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
