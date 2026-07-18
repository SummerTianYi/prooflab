import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports that replay deployments cannot execute live compute", async () => {
    vi.stubEnv("PROOFLAB_DEPLOYMENT_MODE", "replay");

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      mode: string;
      liveCompute: boolean;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "ok",
      mode: "replay",
      liveCompute: false,
    });
  });
});
