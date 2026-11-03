export type AssetCategory =
  | "character"
  | "npc"
  | "building"
  | "terrain"
  | "nature"
  | "water"
  | "decoration"
  | "furniture"
  | "ui"
  | "effect";

export interface AssetSpec {
  id: string;
  filePath: string;
  category: AssetCategory;
  dimensions: { width: number; height: number } | null;
  frameDimensions: { width: number; height: number } | null;
  animations: {
    status: "unverified" | "not-applicable";
    requiredStates: string[];
    directions: string[];
  };
  intendedUsage: string;
  loadingStatus: "missing" | "available";
}

function missingAsset(
  id: string,
  category: AssetCategory,
  filePath: string,
  intendedUsage: string,
  requiredStates: string[] = [],
  directions: string[] = [],
): AssetSpec {
  return {
    id,
    filePath,
    category,
    dimensions: null,
    frameDimensions: null,
    animations: {
      status: requiredStates.length || directions.length ? "unverified" : "not-applicable",
      requiredStates,
      directions,
    },
    intendedUsage,
    loadingStatus: "missing",
  };
}

const fourDirections = ["down", "up", "left", "right"];
const playerStates = ["idle", "walk", "run", "interact", "work"];

// Entries are requirements, not registered Phaser textures. Dimensions and
// animation frames remain unknown until actual production files are supplied.
export const assetManifest = {
  version: 2,
  tileSize: 32,
  assets: [
    missingAsset("player.male", "character", "/assets/characters/player/male/base.png", "Base male player sprite sheet", playerStates, fourDirections),
    missingAsset("player.female", "character", "/assets/characters/player/female/base.png", "Base female player sprite sheet", playerStates, fourDirections),
    missingAsset("player.preset.male", "character", "/assets/characters/player/presets/male-default.png", "Default male preset", playerStates, fourDirections),
    missingAsset("player.preset.female", "character", "/assets/characters/player/presets/female-default.png", "Default female preset", playerStates, fourDirections),
    missingAsset("player.layer.hair", "character", "/assets/characters/player/customization/hair.png", "Hair customization layer", playerStates, fourDirections),
    missingAsset("player.layer.eyes", "character", "/assets/characters/player/customization/eyes.png", "Eye color customization layer", [], fourDirections),
    missingAsset("player.layer.face", "character", "/assets/characters/player/customization/face.png", "Face customization layer", [], fourDirections),
    missingAsset("player.layer.clothing", "character", "/assets/characters/player/customization/clothing.png", "Clothing customization layer", playerStates, fourDirections),
    missingAsset("player.layer.accessories", "character", "/assets/characters/player/customization/accessories.png", "Accessory customization layer", [], fourDirections),

    ...[
      ["resident", "Residents"], ["student", "Students"], ["teacher", "Teachers"],
      ["doctor", "Doctors"], ["nurse", "Nurses"], ["police", "Police officers"],
      ["shopkeeper", "Shopkeepers"], ["restaurant-staff", "Restaurant staff"],
      ["bank-employee", "Bank employees"], ["office-worker", "Office workers"],
      ["factory-worker", "Factory workers"], ["entrepreneur", "Entrepreneurs"],
    ].map(([id, label]) => missingAsset(`npc.${id}`, "npc", `/assets/characters/npc/${id}.png`, `${label}; four-direction rendering`, ["idle", "walk"], fourDirections)),

    ...[
      ["house", "residential", "Residential house"], ["apartment", "residential", "Apartment building"],
      ["cafe", "commercial", "Cafe"], ["convenience-store", "commercial", "Convenience store"],
      ["restaurant", "commercial", "Restaurant"], ["shop", "commercial", "General shop"],
      ["bank", "public", "Bank"], ["school", "public", "School"], ["hospital", "public", "Hospital"],
      ["office", "industrial", "Office building"], ["factory", "industrial", "Factory"],
    ].map(([id, folder, label]) => missingAsset(`building.${id}`, "building", `/assets/buildings/${folder}/${id}.png`, `${label} with collision bounds and interaction points`)),

    ...[
      ["grass", "terrain", "Grass ground tile"], ["dirt", "terrain", "Dirt ground tile"],
      ["stone", "terrain", "Stone ground tile"], ["road", "terrain", "Road tile set"],
      ["sidewalk", "terrain", "Sidewalk tile set"],
    ].map(([id, folder, usage]) => missingAsset(`terrain.${id}`, "terrain", `/assets/environment/${folder}/${id}.png`, usage)),
    ...[
      ["river", "River water tiles"], ["riverbank", "Riverbank transition tiles"],
      ["bridge", "Bridge"], ["water-decorations", "Water decorations"],
    ].map(([id, usage]) => missingAsset(`water.${id}`, "water", `/assets/environment/water/${id}.png`, usage)),
    ...[
      ["tree", "Trees"], ["flowers", "Flowers"], ["bush", "Bushes"], ["garden", "Garden tiles"],
    ].map(([id, usage]) => missingAsset(`nature.${id}`, "nature", `/assets/environment/vegetation/${id}.png`, usage)),
    ...[
      ["streetlight", "Streetlights"], ["bench", "Benches"], ["sign", "Town signs"],
      ["fence", "Fences"], ["trash-bin", "Trash bins"], ["flower-pot", "Flower pots"],
    ].map(([id, usage]) => missingAsset(`decoration.${id}`, "decoration", `/assets/environment/decorations/${id}.png`, usage)),

    ...[
      ["bed", "residential", "Bed"], ["table", "residential", "Table"],
      ["chair", "residential", "Chair"], ["shelf", "commercial", "Shelf"],
      ["shop-counter", "commercial", "Shop counter"], ["product-display", "commercial", "Product display"],
      ["office-desk", "office", "Office desk"], ["computer", "office", "Computer"],
    ].map(([id, folder, usage]) => missingAsset(`furniture.${id}`, "furniture", `/assets/furniture/${folder}/${id}.png`, usage)),

    ...[
      ["money", "hud", "Money indicator"], ["clock", "hud", "Clock"],
      ["calendar", "hud", "Calendar"], ["inventory", "icons", "Inventory icon"],
      ["map", "icons", "Map icon"], ["business", "menus", "Business management UI"],
      ["decision-history", "chronos", "CHRONOS decision history UI"],
      ["forecasting", "mirai", "MIRAI forecasting UI"],
    ].map(([id, folder, usage]) => missingAsset(`ui.${id}`, "ui", `/assets/ui/${folder}/${id}.png`, usage)),
    missingAsset("effect.interaction", "effect", "/assets/effects/interaction.png", "Interaction feedback effect"),
  ],
} as const;
