export function parsePythonVersion(output) {
  const match = output.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unable to parse Python version: ${output.trim() || "<empty>"}`);
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
}

export function assertSupportedGcnPython(output) {
  const version = parsePythonVersion(output);
  if (version.major !== 3 || (version.minor !== 10 && version.minor !== 11)) {
    throw new Error(
      `GCN requires Python 3.10 or 3.11; received ${version.major}.${version.minor}.${version.patch}.`,
    );
  }

  return version;
}
