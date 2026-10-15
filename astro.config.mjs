import { defineConfig } from 'astro/config';

// No GitHub Actions, GITHUB_REPOSITORY = "usuario/repositorio": site e base saem sozinhos.
const [dono, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  ...(repo && { site: `https://${dono}.github.io`, base: repo.endsWith('.github.io') ? '/' : `/${repo}/` }),
});
