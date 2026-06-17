const BASE_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";

export default async function globalSetup() {
  let statusData;
  try {
    const res = await fetch(`${BASE_URL}/api/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    statusData = await res.json();
  } catch (err) {
    throw new Error(
      `Foundry not reachable at ${BASE_URL} — is the devcontainer running? (${err.message})`
    );
  }

  const versionString = statusData.version;
  if (!versionString) {
    throw new Error(
      `Could not read version from /api/status response: ${JSON.stringify(statusData)}`
    );
  }

  const majorVersion = parseInt(versionString.split(".")[0], 10);
  if (isNaN(majorVersion)) {
    throw new Error(`Could not parse major version from "${versionString}"`);
  }

  const { bootstrap } = await import("./setup/bootstrap.js");
  await bootstrap({ baseURL: BASE_URL, majorVersion });
}
