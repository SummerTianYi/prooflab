import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const SGC_REPOSITORY = "https://github.com/Tiiiger/SGC.git";
const SGC_COMMIT = "2c7a2727e82e462d8ef9d6e57f0b08888e16488f";
const root = path.resolve(import.meta.dirname, "..");
const cache = path.join(root, ".prooflab", "cache", "sgc");
const venv = path.resolve(root, "..", ".prooflab-runtime", "venv");
const sourcePython = process.env.PROOFLAB_PYTHON ?? "python3";

function run(executable, args, cwd = root) {
  const result = spawnSync(executable, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

mkdirSync(path.dirname(cache), { recursive: true });

if (!existsSync(cache)) {
  run("git", ["clone", SGC_REPOSITORY, cache]);
}

run("git", ["fetch", "origin", SGC_COMMIT, "--depth", "1"], cache);
run("git", ["checkout", "--detach", SGC_COMMIT], cache);

if (!existsSync(path.join(venv, "bin", "python"))) {
  run(sourcePython, ["-m", "venv", venv]);
}

const python = path.join(venv, "bin", "python");
run(python, ["-m", "pip", "install", "-r", path.join(root, "experiments", "requirements-sgc.txt")]);

console.log("ProofLab SGC environment is ready.");
