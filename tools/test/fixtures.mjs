import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';

export async function withRepository(files, run) {
  const root = await mkdtemp(join(tmpdir(), 'lets-farty-fixture-'));
  try {
    for (const [name, contents] of Object.entries(files)) {
      const path = resolve(root, name);
      if (!path.startsWith(root + sep)) throw new Error(`Fixture path escapes root: ${name}`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, contents);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
