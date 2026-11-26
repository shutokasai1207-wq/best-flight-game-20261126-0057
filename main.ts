// main.ts — hands the Sky Courier flight game in (~/workspace/makefun/flight-entry/)
// Copies game/ and screenshots/ into the output directory and writes the
// dossier with buildDossier from the kit's library (vendor/makefun-game.ts).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const rootDir = dirname(fileURLToPath(import.meta.url));

if (!existsSync(join(rootDir, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing from the repository');
}
if (!existsSync(join(rootDir, 'screenshots'))) {
  throw new Error('screenshots/ is missing from the repository');
}

mkdirSync(outDir, { recursive: true });
cpSync(join(rootDir, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(rootDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
