# CHRONOS × MIRAI — Production PNG Delivery Checklist

Status: **specification only**. No production PNGs have been supplied or verified. Dimensions below are target delivery requirements, not observations of existing files. Keep every corresponding manifest entry at `loadingStatus: "missing"`, with `dimensions` and `frameDimensions` set to `null`, until the delivered PNG is inspected. Do not load or register absent files.

## Common file and Phaser rules

- Use RGBA PNG. Use transparent pixels around characters, props, buildings, furniture, icons and effects. Terrain cells must paint their outer edge completely; transparent unused atlas cells are allowed, but must not create map gaps.
- Use lowercase kebab-case filenames exactly as the paths below. The manifest ID is the stable logical key; never derive an ID from an unverified file.
- Phaser loader paths are public-root URLs beginning `/assets/`. Example: `player.male` loads from `/assets/characters/player/male/base.png` only after file and dimensions pass review.
- A frame dimension is the cell size inside an atlas. For a single static PNG, “single image” means the complete PNG is one Phaser frame; do not split it into invented frames.
- The player/NPC layouts below are explicit authoring targets requested for delivery. They are not registered Phaser animations and must not be treated as verified coordinates until actual PNGs arrive and are checked.
- Exterior and interior collision/interaction shapes are separate gameplay metadata. Do not infer them from alpha bounds or alter `WorldState` to fit artwork.
- Keep all existing fallback drawing and live UI/business interactions until assets have loaded and rendered successfully in Phaser.

## 1. Player sprites and customization layers

**Target atlas:** 32 × 32 px cells; 17 columns × 4 direction rows = **544 × 128 px**. Row order is Down, Up, Left, Right. Each row uses these column ranges: Idle 0–1 (2 frames), Walk 2–5 (4), Run 6–9 (4), Interact 10–12 (3), Work 13–16 (4). Do not register these ranges before verifying the delivered PNG dimensions and frame art.

| Manifest ID | Required PNG | Dimensions / frame | Alpha and contents |
|---|---|---|---|
| `player.male` | `/assets/characters/player/male/base.png` | 544×128; 32×32 | Transparent RGBA; full five-state, four-direction base atlas |
| `player.female` | `/assets/characters/player/female/base.png` | 544×128; 32×32 | Transparent RGBA; same atlas layout |
| `player.preset.male` | `/assets/characters/player/presets/male-default.png` | 544×128; 32×32 | Transparent RGBA; complete default preset using same layout |
| `player.preset.female` | `/assets/characters/player/presets/female-default.png` | 544×128; 32×32 | Transparent RGBA; complete default preset using same layout |
| `player.layer.hair` | `/assets/characters/player/customization/hair.png` | 544×128; 32×32 | Transparent aligned overlay; same row and frame order |
| `player.layer.eyes` | `/assets/characters/player/customization/eyes.png` | 544×128; 32×32 | Transparent aligned overlay; same row and frame order |
| `player.layer.face` | `/assets/characters/player/customization/face.png` | 544×128; 32×32 | Transparent aligned overlay; same row and frame order |
| `player.layer.clothing` | `/assets/characters/player/customization/clothing.png` | 544×128; 32×32 | Transparent aligned overlay; same row and frame order |
| `player.layer.accessories` | `/assets/characters/player/customization/accessories.png` | 544×128; 32×32 | Transparent aligned overlay; same row and frame order |

Customization sheets must have a cel at every base-sheet frame coordinate. Static facial/accessory parts may repeat across animation slots, but must preserve alignment. Hair and clothing must visibly follow the base pose. Use manifest `requiredStates`/`directions`; actual Phaser frame ranges and rates are registered only after inspection.

## 2. NPC profession sprites

**Target atlas for each profession:** 32×32 cells; 6 columns × 4 direction rows = **192×128 px**. Rows are Down, Up, Left, Right. Columns 0–1 are Idle (2 frames); columns 2–5 are Walk (4 frames). Transparent RGBA; each role must remain visually distinguishable at native scale.

| Manifest ID | Required PNG | Dimensions / frame |
|---|---|---|
| `npc.resident` | `/assets/characters/npc/resident.png` | 192×128 / 32×32 |
| `npc.student` | `/assets/characters/npc/student.png` | 192×128 / 32×32 |
| `npc.teacher` | `/assets/characters/npc/teacher.png` | 192×128 / 32×32 |
| `npc.doctor` | `/assets/characters/npc/doctor.png` | 192×128 / 32×32 |
| `npc.nurse` | `/assets/characters/npc/nurse.png` | 192×128 / 32×32 |
| `npc.police` | `/assets/characters/npc/police.png` | 192×128 / 32×32 |
| `npc.shopkeeper` | `/assets/characters/npc/shopkeeper.png` | 192×128 / 32×32 |
| `npc.restaurant-staff` | `/assets/characters/npc/restaurant-staff.png` | 192×128 / 32×32 |
| `npc.bank-employee` | `/assets/characters/npc/bank-employee.png` | 192×128 / 32×32 |
| `npc.office-worker` | `/assets/characters/npc/office-worker.png` | 192×128 / 32×32 |
| `npc.factory-worker` | `/assets/characters/npc/factory-worker.png` | 192×128 / 32×32 |
| `npc.entrepreneur` | `/assets/characters/npc/entrepreneur.png` | 192×128 / 32×32 |

## 3. Buildings

Each is a separate transparent RGBA PNG, with one static Phaser frame equal to the whole image. Dimensions are target canvases in 32 px multiples, not collision footprints. Supply a separate collision/interaction metadata proposal with each asset; it must be reviewed against the map before use.

| Manifest ID | Required PNG | Dimensions / frame |
|---|---|---|
| `building.house` | `/assets/buildings/residential/house.png` | 96×96 / single image |
| `building.apartment` | `/assets/buildings/residential/apartment.png` | 192×192 / single image |
| `building.cafe` | `/assets/buildings/commercial/cafe.png` | 128×96 / single image |
| `building.convenience-store` | `/assets/buildings/commercial/convenience-store.png` | 128×96 / single image |
| `building.restaurant` | `/assets/buildings/commercial/restaurant.png` | 160×128 / single image |
| `building.shop` | `/assets/buildings/commercial/shop.png` | 96×96 / single image |
| `building.bank` | `/assets/buildings/public/bank.png` | 192×128 / single image |
| `building.school` | `/assets/buildings/public/school.png` | 256×192 / single image |
| `building.hospital` | `/assets/buildings/public/hospital.png` | 256×192 / single image |
| `building.office` | `/assets/buildings/industrial/office.png` | 256×256 / single image |
| `building.factory` | `/assets/buildings/industrial/factory.png` | 256×192 / single image |

## 4. Terrain, roads and water

Terrain transitions use a 47-tile blob/autotile set packed into a 7×7 atlas (**224×224 px**, 32×32 cells; nine unused cells must be transparent). Provide a mask-to-cell mapping alongside the PNG when delivering it. Tile faces must meet edge-to-edge with no transparent seams.

| Manifest ID | Required PNG | Dimensions / frame | Notes |
|---|---|---|---|
| `terrain.grass` | `/assets/environment/terrain/grass.png` | 224×224 / 32×32 | Base grass and edge variants |
| `terrain.dirt` | `/assets/environment/terrain/dirt.png` | 224×224 / 32×32 | Dirt transitions |
| `terrain.stone` | `/assets/environment/terrain/stone.png` | 224×224 / 32×32 | Stone transitions |
| `terrain.road` | `/assets/environment/terrain/road.png` | 224×224 / 32×32 | Straight, corner, T, cross and end connections represented by the 47-tile mask set |
| `terrain.sidewalk` | `/assets/environment/terrain/sidewalk.png` | 224×224 / 32×32 | Same connection coverage; align road/sidewalk seams |
| `water.river` | `/assets/environment/water/river.png` | 128×32 / 32×32 | Four horizontal water animation frames; opaque water interior |
| `water.riverbank` | `/assets/environment/water/riverbank.png` | 224×224 / 32×32 | 47-tile river-edge/shore transition set and mask mapping |
| `water.bridge` | `/assets/environment/water/bridge.png` | 128×64 / single image | Transparent bridge art; collision remains separate metadata |
| `water.water-decorations` | `/assets/environment/water/water-decorations.png` | 128×32 / 32×32 | Four static decoration variants in horizontal cells; no animation implied |

## 5. Nature and town decorations

All assets use transparent RGBA. Static props use the complete PNG as one frame. Multi-cell files below are variation atlases, not animations unless explicitly stated.

| Manifest ID | Required PNG | Dimensions / frame | Contents |
|---|---|---|---|
| `nature.tree` | `/assets/environment/vegetation/tree.png` | 96×128 / single image | Three-tile-wide, four-tile-high tree canvas |
| `nature.flowers` | `/assets/environment/vegetation/flowers.png` | 128×32 / 32×32 | Four flower variants |
| `nature.bush` | `/assets/environment/vegetation/bush.png` | 96×32 / 32×32 | Three bush variants |
| `nature.garden` | `/assets/environment/vegetation/garden.png` | 96×96 / 32×32 | 3×3 garden tile set; seams verified across edges |
| `decoration.streetlight` | `/assets/environment/decorations/streetlight.png` | 32×64 / single image | Two-tile-high streetlight |
| `decoration.bench` | `/assets/environment/decorations/bench.png` | 64×32 / single image | Two-tile-wide bench |
| `decoration.sign` | `/assets/environment/decorations/sign.png` | 32×32 / single image | Sign; text remains localizable/game data where possible |
| `decoration.fence` | `/assets/environment/decorations/fence.png` | 96×32 / 32×32 | Horizontal, end and join pieces; atlas mapping supplied |
| `decoration.trash-bin` | `/assets/environment/decorations/trash-bin.png` | 32×32 / single image | One-tile prop |
| `decoration.flower-pot` | `/assets/environment/decorations/flower-pot.png` | 32×32 / single image | One-tile prop |

## 6. Furniture and interior props

Transparent RGBA; each image is a single static frame. Interior PNGs are independent from exterior building sprites. Dimensions are canvas targets; walkability and collision are authored separately.

| Manifest ID | Required PNG | Dimensions / frame |
|---|---|---|
| `furniture.bed` | `/assets/furniture/residential/bed.png` | 64×64 / single image |
| `furniture.table` | `/assets/furniture/residential/table.png` | 64×32 / single image |
| `furniture.chair` | `/assets/furniture/residential/chair.png` | 32×32 / single image |
| `furniture.shelf` | `/assets/furniture/commercial/shelf.png` | 32×64 / single image |
| `furniture.shop-counter` | `/assets/furniture/commercial/shop-counter.png` | 96×32 / single image |
| `furniture.product-display` | `/assets/furniture/commercial/product-display.png` | 64×64 / single image |
| `furniture.office-desk` | `/assets/furniture/office/office-desk.png` | 64×32 / single image |
| `furniture.computer` | `/assets/furniture/office/computer.png` | 32×32 / single image |

## 7. UI icons, panels and effects

Use transparent RGBA. Icons are 32×32 PNGs. Panel PNGs are decorative frames/backgrounds only: keep text, money, inventory and controls live in the Thai React UI; do not bake dynamic values or labels into art.

| Manifest ID | Required PNG | Dimensions / frame |
|---|---|---|
| `ui.money` | `/assets/ui/hud/money.png` | 32×32 / single image |
| `ui.clock` | `/assets/ui/hud/clock.png` | 32×32 / single image |
| `ui.calendar` | `/assets/ui/hud/calendar.png` | 32×32 / single image |
| `ui.inventory` | `/assets/ui/icons/inventory.png` | 32×32 / single image |
| `ui.map` | `/assets/ui/icons/map.png` | 32×32 / single image |
| `ui.business` | `/assets/ui/menus/business.png` | 256×192 / single image; background/frame only |
| `ui.decision-history` | `/assets/ui/chronos/decision-history.png` | 256×192 / single image; CHRONOS background/frame only |
| `ui.forecasting` | `/assets/ui/mirai/forecasting.png` | 256×192 / single image; MIRAI background/frame only |
| `effect.interaction` | `/assets/effects/interaction.png` | 128×32 / 32×32 | Four horizontal transparent feedback frames |

## Delivery and acceptance checklist

- [ ] Every manifest path has a real PNG at the exact public path; no concept-board composite is used as a texture.
- [ ] PNG dimensions match this target. Record actual dimensions and set manifest `dimensions` only after inspection.
- [ ] Cell size, row/column order, transparency and animation sequences are verified at native pixel scale. Set actual frame dimensions only after verification.
- [ ] Terrain/river connection maps and fence atlas mapping are included and seam-tested.
- [ ] Building/furniture collision and interaction metadata is reviewed independently of image transparency.
- [ ] Phaser load succeeds; each verified asset is rendered in the existing scene before any fallback is replaced.
- [ ] Existing world creation, revision updates, business UI, API and PostgreSQL behavior remain unchanged.

## Exact missing inventory at specification time

Every row above is still missing. Current manifest contains 68 expected assets: 9 player/base/preset/customization entries, 12 NPC roles, 11 buildings, 5 terrain sets, 4 water assets, 4 nature assets, 6 decorations, 8 furniture items, 8 UI assets and 1 effect. No PNG is registered as loaded.
