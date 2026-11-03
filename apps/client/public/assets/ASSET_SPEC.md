# CHRONOS × MIRAI asset specification

The source artwork is not present in this repository. `src/game/assetManifest.ts` is therefore a requirement catalog: every entry is marked `missing`, and image/frame dimensions remain unknown until the real files are supplied and inspected. Do not treat this document or the reference concept board as a sprite atlas.

## Shared production rules

- World view is 2D top-down orthographic, never isometric.
- Character cells target 32 × 32 pixels. Keep the same pixel scale across characters, tiles and props.
- Use separate transparent PNGs or verified sprite sheets. Record actual canvas and frame dimensions after file delivery; do not infer frame coordinates from a concept board.
- Player animation requirements are idle, walk, run, interact and work in down, up, left and right directions. Target authoring dimensions and row/column layout are documented in `PRODUCTION_ASSET_CHECKLIST.md`; they are requirements for future delivery, not verified file facts or registered Phaser frames.
- Compose customization from aligned base, hair, eyes, face, clothing and accessory layers. All layers must share verified canvas, cell dimensions and direction/frame order.
- NPC definitions must include role, asset ID, four-direction support, collision footprint and future behavior metadata. Movement/AI is outside this asset-only phase.
- Building art is separate by asset. Supply explicit collision bounds and interaction points as metadata; do not derive them from visible transparent margins.
- Terrain transitions must provide a verified connection set for grass, dirt, stone, road, sidewalk, river edges and bridges. Validate edge continuity at 1:1 scale.
- Keep furniture and interior assets independent from exterior building art so future interiors can be composed without changing world state or API contracts.
- UI remains Thai-first and must continue to use live business/world state; art integration must not replace working controls with static mockups.

## Required directory map

```text
characters/player/{male,female,presets,customization}/
characters/npc/
buildings/{residential,commercial,public,industrial}/
environment/{tilesets,terrain,water,vegetation,decorations}/
furniture/{residential,commercial,office}/
ui/{hud,icons,menus,chronos,mirai}/
effects/
```

## Acceptance before registration

For each delivered image, verify file presence, actual pixel dimensions, alpha/transparency, pixel scale, tile edge continuity, frame alignment and animation order. Register only verified frames in Phaser. Render each candidate in the game at native scale before replacing any current fallback drawing. Keep the current map and gameplay fallback until the replacement town passes those checks.

The first town layout is an expandable map specification: Old Town Residential, Modern Business, Public Park, Riverside, Cafe and Restaurant, Convenience Store, and Public Services districts connected by roads and walking paths. Map coordinates, building footprints and collision shapes should be authored only after the corresponding assets are available.

See [PRODUCTION_ASSET_CHECKLIST.md](./PRODUCTION_ASSET_CHECKLIST.md) for the per-asset PNG delivery dimensions, manifest IDs and Phaser paths.
