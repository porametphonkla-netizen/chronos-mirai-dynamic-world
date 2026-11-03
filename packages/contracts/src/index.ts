export type Locale = "th";

export interface WorldSummary {
  id: string;
  name: string;
  seed: string;
  currentRevision: number;
  createdAt: string;
}

export interface ShopState {
  cashMinor: number;
  day: number;
  hour: number;
  inventory: Record<string, number>;
  pricesMinor: Record<string, number>;
}

export interface WorldState {
  schemaVersion: 1;
  player: { x: number; y: number };
  shop: ShopState | null;
  buildings: Array<{ id: string; kind: "shop" | "home"; x: number; y: number; width: number; height: number }>;
  seed: string;
}

export interface WorldView extends WorldSummary {
  state: WorldState;
}

export interface ApiError {
  error: { code: string; message: string };
}
