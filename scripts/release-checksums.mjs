import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = process.cwd();

function toSRI(algorithm, buffer) {
  return `${algorithm}-${createHash(algorithm).update(buffer).digest("base64")}`;
}

function toHex(algorithm, buffer) {
  return createHash(algorithm).update(buffer).digest("hex");
}

function describeFile(filePath) {
  const absPath = resolve(repoRoot, filePath);
  const buffer = readFileSync(absPath);
  return {
    path: filePath,
    size: statSync(absPath).size,
    sha1: toHex("sha1", buffer),
    sha256: toHex("sha256", buffer),
    sha512: toHex("sha512", buffer),
    integrity: toSRI("sha512", buffer),
  };
}

function findTarball() {
  const explicit = process.argv[2];
  if (explicit) return explicit;

  const candidates = readdirSync(repoRoot)
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();

  if (!candidates.length) {
    throw new Error(
      "No .tgz tarball found. Run `npm pack` first or pass a tarball path.",
    );
  }

  return candidates[candidates.length - 1];
}

const tarball = findTarball();
const distFiles = [
  "dist/umd/rcpch-imd-map.min.js",
  "dist/index.esm.js",
  tarball,
].filter((filePath) => existsSync(resolve(repoRoot, filePath)));

const output = {
  generatedAt: new Date().toISOString(),
  files: distFiles.map(describeFile),
};

const outPath = join(repoRoot, "release-checksums.json");
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
