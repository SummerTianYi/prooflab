import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { assertSupportedGcnPython } from "./gcn-python-version.mjs";

const GCN_REPOSITORY = "https://github.com/tkipf/gcn.git";
const GCN_COMMIT = "39a4089fe72ad9f055ed6fdb9746abdcfebc4d81";
const root = path.resolve(import.meta.dirname, "..");
const cache = path.join(root, ".prooflab", "cache", "gcn");
const venv = path.resolve(root, "..", ".prooflab-runtime", "gcn-legacy-venv");
const sourcePython = process.env.PROOFLAB_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const venvPython = path.join(
  venv,
  process.platform === "win32" ? "Scripts" : "bin",
  process.platform === "win32" ? "python.exe" : "python",
);

function run(executable, args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function inspectPythonVersion(executable) {
  const result = spawnSync(
    executable,
    ["-c", "import platform; print(platform.python_version())"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr?.trim() ?? "unknown error";
    throw new Error(`Unable to inspect GCN Python interpreter: ${detail}`);
  }

  return assertSupportedGcnPython(result.stdout);
}

const selectedPython = existsSync(venvPython) ? venvPython : sourcePython;
try {
  inspectPythonVersion(selectedPython);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "Set PROOFLAB_PYTHON to a Python 3.10 or 3.11 executable. If the existing GCN environment uses another version, remove it before rerunning setup.",
  );
  process.exit(1);
}

mkdirSync(path.dirname(cache), { recursive: true });

if (!existsSync(cache)) {
  run("git", ["clone", GCN_REPOSITORY, cache]);
}

run("git", ["fetch", "origin", GCN_COMMIT, "--depth", "1"], cache);
run("git", ["checkout", "--detach", GCN_COMMIT], cache);

if (!existsSync(venvPython)) {
  run(sourcePython, ["-m", "venv", venv]);
}

run(venvPython, [
  "-m",
  "pip",
  "install",
  "--disable-pip-version-check",
  "-r",
  path.join(root, "experiments", "requirements-gcn.txt"),
]);

console.log("ProofLab GCN legacy-repair environment is ready.");
