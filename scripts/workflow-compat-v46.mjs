import fs from 'node:fs';
import path from 'node:path';

export async function withWorkflowCompatibility(entries, runner) {
  const created = [];
  try {
    for (const [legacyPath, unifiedPath] of entries) {
      if (fs.existsSync(legacyPath)) continue;
      if (!fs.existsSync(unifiedPath)) throw new Error(`Unified workflow missing: ${unifiedPath}`);
      fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
      fs.copyFileSync(unifiedPath, legacyPath);
      created.push(legacyPath);
    }
    await runner();
  } finally {
    for (const file of created.reverse()) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
}
