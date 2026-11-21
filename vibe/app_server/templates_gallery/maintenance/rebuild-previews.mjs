// From the repository root: node vibe/app_server/templates_gallery/maintenance/rebuild-previews.mjs
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const assets = fileURLToPath(new URL("../assets/", import.meta.url));
const workspace = await mkdtemp(join(tmpdir(), "vibe-ui-previews-"));

function npm(args, cwd = workspace) {
  // npm.cmd needs cmd.exe on Windows. Arguments below are fixed, never user input.
  const windows = process.platform === "win32";
  const result = spawnSync(
    windows ? "cmd.exe" : "npm",
    windows ? ["/d", "/c", "npm.cmd", ...args] : args,
    { cwd, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("npm " + args.join(" ") + " failed");
}

try {
  await cp(join(assets, "shared"), workspace, { recursive: true });
  npm(["ci", "--no-audit", "--no-fund"]);
  const templates = await readdir(join(assets, "starters"), {
    withFileTypes: true,
  });
  const destinations = [];
  for (const entry of templates.filter((entry) => entry.isDirectory())) {
    // Each project starts from its own clean source tree and can resolve the
    // shared locked dependencies from the parent workspace.
    const project = join(workspace, entry.name);
    await cp(join(assets, "shared"), project, { recursive: true });
    await cp(join(assets, "starters", entry.name), project, {
      recursive: true,
    });
    npm(["run", "build"], project);
    destinations.push([entry.name, join(project, "dist")]);
  }
  // Replace shipped previews only after every project passes type-checking and builds.
  const previews = join(assets, "previews");
  await mkdir(previews, { recursive: true });
  for (const [id, output] of destinations) {
    const destination = join(previews, id);
    await rm(destination, { recursive: true, force: true });
    await cp(output, destination, { recursive: true });
  }
} finally {
  await rm(workspace, { recursive: true, force: true });
}
