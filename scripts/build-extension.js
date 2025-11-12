const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "core");
const BUILD_ROOT = path.join(ROOT, "build");
const TARGET_DIR = path.join(BUILD_ROOT, "chrome");
const MANIFESTS_DIR = path.join(ROOT, "manifests");

async function copyRecursive(src, dest) {
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

function deepMerge(target, source) {
  const output = { ...target };
  Object.entries(source || {}).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof output[key] === "object" &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

async function applyManifestOverrides(target) {
  const basePath = path.join(SOURCE_DIR, "manifest.json");
  const overridePath = path.join(MANIFESTS_DIR, `manifest.${target}.json`);
  const base = JSON.parse(await fs.readFile(basePath, "utf8"));
  let overrides = {};
  try {
    overrides = JSON.parse(await fs.readFile(overridePath, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  const merged = deepMerge(base, overrides);
  await fs.writeFile(path.join(TARGET_DIR, "manifest.json"), JSON.stringify(merged, null, 2));
  console.log(`Applied manifest overrides for ${target}`);
}

async function main() {
  const target = process.argv[2] || "chrome";
  console.log(`Building ${target} extension bundle...`);

  if (target !== "chrome") {
    throw new Error(`Unknown target "${target}"`);
  }

  await copyRecursive(SOURCE_DIR, TARGET_DIR);
  await applyManifestOverrides(target);
  console.log(`Copied ${SOURCE_DIR} -> ${TARGET_DIR}`);
}

main().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
