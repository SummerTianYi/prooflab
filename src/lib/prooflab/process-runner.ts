import { spawn } from "node:child_process";

const OUTPUT_LIMIT = 250_000;

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

interface ProcessOptions {
  cwd: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

function appendBounded(current: string, chunk: Buffer): string {
  const next = current + chunk.toString("utf8");
  return next.length <= OUTPUT_LIMIT ? next : next.slice(-OUTPUT_LIMIT);
}

export function runProcess(
  executable: string,
  args: string[],
  options: ProcessOptions,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk);
    });
    child.on("error", reject);

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1_000).unref();
    }, options.timeoutMs);

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      resolve({
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut,
      });
    });
  });
}
