import { promises as fs } from 'fs';
import { execa } from 'execa'; // Import execa for running external commands

const MODULE_ID = process.cwd();

const packs = await fs.readdir('./unpacked_packs');
for (const pack of packs) {
  if (pack === '.gitattributes') continue;
  console.log('Packing ' + pack);
  try {
    // Execute fvtt-cli pack command for each pack
    await execa('npx', [
      '@foundryvtt/foundryvtt-cli',
      'pack',
      `${MODULE_ID}/unpacked_packs/${pack}`,
      `${MODULE_ID}/packs/${pack}`
    ], {
      stdio: 'inherit' // Pipe stdout/stderr to parent process
    });
  } catch (error) {
    console.error(`Error packing ${pack}:`, error);
    process.exit(1); // Exit if a pack fails
  }
}