import { describe, expect, it } from "vitest";
import { runProcess } from "./process-runner";

describe("runProcess", () => {
  it("captures output and exit status", async () => {
    const result = await runProcess(process.execPath, ["-e", "console.log('evidence')"], {
      cwd: process.cwd(),
      timeoutMs: 2_000,
      env: process.env,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("evidence");
    expect(result.timedOut).toBe(false);
  });

  it("terminates a process after its time budget", async () => {
    const result = await runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      cwd: process.cwd(),
      timeoutMs: 100,
      env: process.env,
    });

    expect(result.timedOut).toBe(true);
  });
});
