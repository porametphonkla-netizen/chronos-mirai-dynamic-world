import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assetManifest } from "./assetManifest.js";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));

test("asset requirements have stable IDs, paths, categories, and honest loading status", () => {
  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const asset of assetManifest.assets) {
    assert.ok(asset.id.length > 0);
    assert.ok(asset.filePath.startsWith("/assets/"));
    assert.ok(asset.intendedUsage.length > 0);
    assert.ok(!ids.has(asset.id), `duplicate asset ID: ${asset.id}`);
    assert.ok(!paths.has(asset.filePath), `duplicate asset path: ${asset.filePath}`);
    ids.add(asset.id);
    paths.add(asset.filePath);

    const fileExists = existsSync(join(publicDirectory, asset.filePath.slice(1)));
    assert.equal(asset.loadingStatus, fileExists ? "available" : "missing", asset.id);
    if (!fileExists) {
      assert.equal(asset.dimensions, null, `${asset.id} must not claim unverified dimensions`);
      assert.equal(asset.frameDimensions, null, `${asset.id} must not claim unverified frame dimensions`);
    }
  }
});

test("player requirements preserve the 32px cell target without inventing animation frames", () => {
  assert.equal(assetManifest.tileSize, 32);
  const player = assetManifest.assets.find(asset => asset.id === "player.male");
  assert.ok(player);
  assert.deepEqual(player.animations.requiredStates, ["idle", "walk", "run", "interact", "work"]);
  assert.deepEqual(player.animations.directions, ["down", "up", "left", "right"]);
  assert.equal(player.animations.status, "unverified");
  assert.equal(player.frameDimensions, null);
});
