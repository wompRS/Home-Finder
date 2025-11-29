import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

const config = {
  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib'
    }
  },
  vitePlugin: {
    inspector: false
  }
};

export default config;