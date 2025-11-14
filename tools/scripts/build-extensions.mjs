import { spawn } from 'node:child_process';

const targets = ['extension-chrome', 'extension-firefox', 'extension-safari'];

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', cwd, shell: process.platform === 'win32' });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      } else {
        resolve(undefined);
      }
    });
  });
}

for (const target of targets) {
  const cwd = new URL(`../apps/${target}/`, import.meta.url);
  await run('pnpm', ['install'], cwd);
  await run('pnpm', ['run', 'build'], cwd);
}
