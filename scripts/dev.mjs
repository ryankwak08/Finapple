import { spawn } from 'child_process';

const processes = [];
let shuttingDown = false;

const spawnProcess = (name, command, args) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    for (const proc of processes) {
      if (proc !== child && !proc.killed) {
        proc.kill('SIGTERM');
      }
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(`[${name}] failed to start`, error);
    if (!shuttingDown) {
      shuttingDown = true;
      for (const proc of processes) {
        if (proc !== child && !proc.killed) {
          proc.kill('SIGTERM');
        }
      }
      process.exit(1);
    }
  });

  processes.push(child);
};

spawnProcess('backend', process.execPath, ['server/index.js']);
spawnProcess('frontend', process.execPath, ['node_modules/vite/bin/vite.js']);

const shutdown = () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const proc of processes) {
    if (!proc.killed) {
      proc.kill('SIGTERM');
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
