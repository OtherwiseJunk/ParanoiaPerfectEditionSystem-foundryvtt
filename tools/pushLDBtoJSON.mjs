import { promises as fs } from "fs";
import path from "path";
import { execa } from "execa";

const MODULE_ID = process.cwd();

const packs = await fs.readdir("./packs/");
for (const pack of packs) {
  console.log("Unpacking " + pack);
  const directory = `./unpacked_packs/${pack}`;

  await fs.mkdir(directory, { recursive: true });

  for (const file of await fs.readdir(directory)) {
    await fs.unlink(path.join(directory, file));
  }

  try {
    await execa(
      "npx",
      ["@foundryvtt/foundryvtt-cli", "unpack", `${MODULE_ID}/packs/${pack}`, directory],
      {
        stdio: "inherit",
      }
    );
  } catch (error) {
    console.error(`Error unpacking ${pack}:`, error);
    process.exit(1);
  }
}