const { spawn } = require('node:child_process');
const path = require('node:path');
const vitePackage = require('vite/package.json');

const viteBin = path.join(
  path.dirname(require.resolve('vite/package.json')),
  vitePackage.bin.vite
);
const rawArgs = process.argv.slice(2);
const forwardedArgs = ['build'];

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];

  // Ignore accidental free-text words like "passed" that npm forwards.
  if (!arg.startsWith('-')) {
    continue;
  }

  forwardedArgs.push(arg);

  const nextArg = rawArgs[index + 1];
  if (nextArg && !nextArg.startsWith('-') && !arg.includes('=')) {
    forwardedArgs.push(nextArg);
    index += 1;
  }
}

const child = spawn(
  process.execPath,
  ['--max-old-space-size=8192', viteBin, ...forwardedArgs],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=8192`.trim(),
    },
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
