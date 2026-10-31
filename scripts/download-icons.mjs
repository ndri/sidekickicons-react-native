#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "optimized");
const TEMP_DIR = path.join(REPO_ROOT, "temp");

const repos = [
  {
    url: "https://github.com/ndri/sidekickicons.git",
    branch: "main",
    optimizedPath: "optimized",
  },
  {
    url: "https://github.com/tailwindlabs/heroicons.git",
    branch: "master",
    optimizedPath: "optimized",
  },
];

async function ensureDirectories() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    console.log(`Created directories: ${OUTPUT_DIR} and ${TEMP_DIR}`);
  } catch (error) {
    console.error(`Error creating directories: ${error.message}`);
    throw error;
  }
}

async function cloneRepository(repoUrl, branch, optimizedPath, tempDir) {
  const repoName = repoUrl.split("/").pop().replace(".git", "");
  const repoDir = path.join(tempDir, repoName);

  console.log(
    `Cloning ${repoName} repository (sparse checkout of /${optimizedPath})...`
  );

  try {
    try {
      await fs.rm(repoDir, { recursive: true, force: true });
      console.log(`Removed existing directory: ${repoDir}`);
    } catch (err) {
      // Directory doesn't exist, which is fine
    }

    // Create temporary directory for the repo
    await fs.mkdir(repoDir, { recursive: true });

    // Initialize git repo
    execSync("git init", { cwd: repoDir });

    // Make sure no remote exists (could happen if previous run failed)
    try {
      execSync("git remote remove origin", { cwd: repoDir, stdio: "ignore" });
    } catch (err) {
      // No remote exists, which is fine
    }

    execSync(`git remote add origin ${repoUrl}`, { cwd: repoDir });

    execSync("git config core.sparseCheckout true", { cwd: repoDir });

    // Set sparse checkout path
    await fs.writeFile(path.join(repoDir, ".git/info/sparse-checkout"), optimizedPath);

    // Fetch only the specific branch with depth=1 (only latest commit)
    execSync(`git fetch --depth=1 origin ${branch}`, { cwd: repoDir });

    // Checkout the fetched branch
    execSync(`git checkout ${branch}`, { cwd: repoDir });

    console.log(
      `Successfully cloned ${repoName} with sparse checkout of /${optimizedPath}`
    );

    return {
      repoDir,
      optimizedDir: path.join(repoDir, optimizedPath),
    };
  } catch (error) {
    console.error(`Error cloning repository ${repoUrl}: ${error.message}`);
    throw error;
  }
}

async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}

async function copyDirectory(sourceDir, destDir) {
  // console.log(`Copying SVG files from ${sourceDir} to ${destDir}...`);

  try {
    if (!(await directoryExists(sourceDir))) {
      console.log(`Source directory ${sourceDir} does not exist, skipping.`);
      return;
    }

    await fs.mkdir(destDir, { recursive: true });

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        await copyDirectory(sourcePath, destPath);
      } else if (entry.isFile() && entry.name.endsWith(".svg")) {
        await fs.copyFile(sourcePath, destPath);
      }
    }

    console.log(`Files copied from ${sourceDir} to ${destDir}`);
  } catch (error) {
    console.error(`Error copying directory ${sourceDir}: ${error.message}`);
    throw error;
  }
}

async function cleanup() {
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    console.log("Cleaned up temporary files");
  } catch (error) {
    console.error(`Error cleaning up: ${error.message}`);
  }
}

async function main() {
  try {
    console.log("Starting icon download...");

    console.log(`Removing existing output directory: ${OUTPUT_DIR}`);
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });

    await ensureDirectories();

    for (const { url, branch, optimizedPath } of repos) {
      const { optimizedDir } = await cloneRepository(
        url,
        branch,
        optimizedPath,
        TEMP_DIR
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      await copyDirectory(optimizedDir, OUTPUT_DIR);
    }

    await cleanup();

    console.log("Finished downloading icons into the optimized/ directory.");
  } catch (error) {
    console.error(`Error in main process: ${error.message}`);
    process.exit(1);
  }
}

main();
