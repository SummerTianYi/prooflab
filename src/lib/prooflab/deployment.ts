export type DeploymentMode = "local" | "replay";

type DeploymentEnvironment = Record<string, string | undefined>;

interface DeploymentHandlers<T> {
  local: () => T | Promise<T>;
  replay: () => T | Promise<T>;
}

export class LocalComputeRequestError extends Error {
  constructor() {
    super("Local compute requires a same-origin loopback request.");
    this.name = "LocalComputeRequestError";
  }
}

export class LocalComputeBusyError extends Error {
  constructor() {
    super("A local compute task is already running.");
    this.name = "LocalComputeBusyError";
  }
}

const LOCAL_COMPUTE_STATE_KEY = "__prooflabLocalComputeState";

type ProofLabGlobal = typeof globalThis & {
  [LOCAL_COMPUTE_STATE_KEY]?: { active: boolean };
};

function localComputeState(): { active: boolean } {
  const sharedGlobal = globalThis as ProofLabGlobal;
  sharedGlobal[LOCAL_COMPUTE_STATE_KEY] ??= { active: false };
  return sharedGlobal[LOCAL_COMPUTE_STATE_KEY];
}

export function resolveDeploymentMode(
  environment: DeploymentEnvironment,
): DeploymentMode {
  if (environment.NODE_ENV === "production" || environment.VERCEL === "1") {
    return "replay";
  }

  const configured = environment.PROOFLAB_DEPLOYMENT_MODE;
  if (configured === undefined || configured === "local") {
    return "local";
  }
  if (configured === "replay") {
    return "replay";
  }

  throw new Error(`Unsupported ProofLab deployment mode: ${configured}`);
}

export function assertLocalComputeRequest(
  mode: DeploymentMode,
  request?: Request,
): void {
  if (mode !== "local") {
    return;
  }
  if (!request) {
    throw new LocalComputeRequestError();
  }

  const url = new URL(request.url);
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  const origin = request.headers.get("origin");
  const hasTrustedOrigin = origin === null || origin === url.origin;

  if (!loopbackHosts.has(url.hostname) || !hasTrustedOrigin) {
    throw new LocalComputeRequestError();
  }
}

export async function runExclusiveLocalCompute<T>(
  task: () => T | Promise<T>,
): Promise<T> {
  const state = localComputeState();
  if (state.active) {
    throw new LocalComputeBusyError();
  }

  state.active = true;
  try {
    return await task();
  } finally {
    state.active = false;
  }
}

export async function runForDeployment<T>(
  mode: DeploymentMode,
  handlers: DeploymentHandlers<T>,
): Promise<T> {
  return mode === "replay" ? handlers.replay() : handlers.local();
}

export function deploymentResponseHeaders(
  mode: DeploymentMode,
): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "X-ProofLab-Mode": mode,
  };
}
