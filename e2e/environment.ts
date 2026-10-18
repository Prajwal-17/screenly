// Keep parallel worktrees from sharing servers or a test database.
export const portOffset = Number(process.env.SCREENLY_E2E_PORT_OFFSET ?? 0);
export const webPort = 3100 + portOffset;
export const backendPort = 8787 + portOffset;
export const llmPort = 8790 + portOffset;
export const voicePort = 8791 + portOffset;
export const webURL = `http://localhost:${webPort}`;
export const backendURL = `http://localhost:${backendPort}`;
export const llmURL = `http://localhost:${llmPort}`;
export const voiceURL = `http://localhost:${voicePort}`;
