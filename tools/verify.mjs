import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function runChecks(commands, cwd) {
  for (const [command, ...args] of commands) {
    const code = await new Promise(resolve => {
      const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false });
      child.once('error', error => { console.error(`[runner] ${error.message}`); resolve(1); });
      child.once('close', code => resolve(code === 0 ? 0 : 1));
    });
    if (code) return 1;
  }
  return 0;
}

async function main() {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  if (process.versions.node !== manifest.engines.node) {
    throw new Error(`Use Node ${manifest.engines.node}; found ${process.versions.node}`);
  }
  const { execFileSync } = await import('node:child_process');
  const actualNpm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  if (`npm@${actualNpm}` !== manifest.packageManager) throw new Error(`Use ${manifest.packageManager}; found npm@${actualNpm}`);
  process.exitCode = await runChecks([['npm', 'test'], ['npm', 'run', 'check:architecture'], ['npm', 'run', 'check:docs'], ['npm', 'run', 'check:harness'], ['npm', 'run', 'check:format']], process.cwd());
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`[verify] ${error.message}`); process.exitCode = 1; });
}
