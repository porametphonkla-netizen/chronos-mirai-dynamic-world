import type { WorldState } from "@chronos/contracts";
import { randomUUID } from "node:crypto";

export type Command =
  | { id: string; type: "move"; direction: "up" | "down" | "left" | "right" }
  | { id: string; type: "create-business"; capitalMinor: number; businessType: "general-store" }
  | { id: string; type: "buy-stock"; productId: "bread" | "tea"; quantity: number }
  | { id: string; type: "sell-product"; productId: "bread" | "tea"; quantity: number }
  | { id: string; type: "advance-time"; hours: number }
  | { id: string; type: "advance-day"; days: number };

export function parseCommand(value: unknown): Command | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.id)) return null;
  if (candidate.type === "move" && ["up","down","left","right"].includes(String(candidate.direction))) return candidate as Command;
  if (candidate.type === "create-business" && candidate.businessType === "general-store" && Number.isSafeInteger(candidate.capitalMinor)) return candidate as Command;
  if ((candidate.type === "buy-stock" || candidate.type === "sell-product") && ["bread","tea"].includes(String(candidate.productId)) && Number.isSafeInteger(candidate.quantity)) return candidate as Command;
  if (candidate.type === "advance-time" && Number.isSafeInteger(candidate.hours)) return candidate as Command;
  if (candidate.type === "advance-day" && Number.isSafeInteger(candidate.days)) return candidate as Command;
  return null;
}

export const products = {
  bread: { label: "ขนมปัง", purchaseMinor: 250, saleMinor: 400 },
  tea: { label: "ชา", purchaseMinor: 500, saleMinor: 800 },
} as const;

export function initialState(seed: string): WorldState {
  const offset = Number.parseInt(seed.slice(0, 4), 16) % 4;
  return {
    schemaVersion: 1,
    seed,
    player: { x: 5, y: 5 },
    shop: null,
    buildings: [
      { id: "town-shop", kind: "shop", x: 10 + offset, y: 5, width: 3, height: 3 },
      { id: "town-home", kind: "home", x: 3 + offset, y: 10, width: 3, height: 3 },
    ],
  };
}

export function worldId(): string { return randomUUID(); }

export function applyCommand(input: WorldState, command: Command): { state: WorldState; events: Array<{ type: string; data: Record<string, unknown> }> } {
  const state = structuredClone(input);
  const events: Array<{ type: string; data: Record<string, unknown> }> = [];
  switch (command.type) {
    case "move": {
      const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[command.direction];
      const next = { x: Math.max(0, Math.min(19, state.player.x + delta[0])), y: Math.max(0, Math.min(14, state.player.y + delta[1])) };
      const blocked = state.buildings.some(b => next.x >= b.x && next.x < b.x + b.width && next.y >= b.y && next.y < b.y + b.height);
      if (!blocked) state.player = next;
      events.push({ type: "player.moved", data: { ...next, blocked } });
      break;
    }
    case "create-business":
      if (state.shop) throw new Error("BUSINESS_ALREADY_EXISTS");
      if (!Number.isSafeInteger(command.capitalMinor) || command.capitalMinor < 10_000 || command.capitalMinor > 1_000_000) throw new Error("INVALID_STARTING_CAPITAL");
      state.shop = { cashMinor: command.capitalMinor, day: 1, hour: 8, inventory: { bread: 0, tea: 0 }, pricesMinor: { bread: products.bread.saleMinor, tea: products.tea.saleMinor } };
      events.push({ type: "business.created", data: { businessType: command.businessType, capitalMinor: command.capitalMinor } });
      break;
    case "buy-stock": {
      const shop = requireShop(state);
      validateQuantity(command.quantity);
      const total = products[command.productId].purchaseMinor * command.quantity;
      if (shop.cashMinor < total) throw new Error("INSUFFICIENT_FUNDS");
      shop.cashMinor -= total;
      shop.inventory[command.productId] += command.quantity;
      events.push({ type: "business.stock-purchased", data: { productId: command.productId, quantity: command.quantity, totalMinor: total } });
      break;
    }
    case "sell-product": {
      const shop = requireShop(state);
      validateQuantity(command.quantity);
      if (shop.inventory[command.productId] < command.quantity) throw new Error("INSUFFICIENT_STOCK");
      const total = shop.pricesMinor[command.productId] * command.quantity;
      shop.inventory[command.productId] -= command.quantity;
      shop.cashMinor += total;
      events.push({ type: "business.sale", data: { productId: command.productId, quantity: command.quantity, totalMinor: total } });
      break;
    }
    case "advance-day": {
      const shop = requireShop(state);
      if (!Number.isInteger(command.days) || command.days < 1 || command.days > 30) throw new Error("INVALID_DAY_COUNT");
      for (let i=0;i<command.days;i++) {
        shop.day += 1;
        shop.hour = 8;
        events.push({ type: "world.day-advanced", data: { currentDay: shop.day, hour: shop.hour } });
      }
      break;
    }
    case "advance-time": {
      const shop = requireShop(state);
      if (!Number.isInteger(command.hours) || command.hours < 1 || command.hours > 12) throw new Error("INVALID_HOUR_COUNT");
      for (let i=0;i<command.hours;i++) {
        shop.hour += 1;
        if (shop.hour >= 24) { shop.hour = 0; shop.day += 1; events.push({ type: "world.day-advanced", data: { currentDay: shop.day, hour: shop.hour } }); }
      }
      events.push({ type: "world.time-advanced", data: { hours: command.hours, day: shop.day, hour: shop.hour } });
      break;
    }
    default: throw new Error("COMMAND_INVALID");
  }
  return { state, events };
}

function requireShop(state: WorldState) { if (!state.shop) throw new Error("BUSINESS_NOT_CREATED"); return state.shop; }
function validateQuantity(quantity: number) { if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) throw new Error("INVALID_QUANTITY"); }
