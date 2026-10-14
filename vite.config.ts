import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Web版（ブラウザ・スマホ）の本番ビルドにだけCSPを埋め込む。
// Windows版は src-tauri/tauri.conf.json の csp が使われるので、二重にしない。
const WEB_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function webCsp(): Plugin {
  return {
    name: 'web-csp',
    apply: 'build',
    transformIndexHtml(html) {
      if (process.env.TAURI_ENV_PLATFORM) return html;
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${WEB_CSP}" />`);
    },
  };
}

export default defineConfig({
  // GitHub Pages では https://phakchy.github.io/game-daily-board/ の下に置く（src/config.ts と同じ）
  base: process.env.GITHUB_PAGES ? '/game-daily-board/' : '/',
  plugins: [react(), webCsp()],
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  clearScreen: false,
});
