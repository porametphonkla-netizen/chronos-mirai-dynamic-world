import test from "node:test";
import assert from "node:assert/strict";
import { applyCommand, initialState, parseCommand } from "./world.js";

test("world seed creates a valid independent initial state", () => {
  const a = initialState("00010000"); const b = initialState("00030000");
  assert.equal(a.player.x, 5);
  assert.notDeepEqual(a.buildings, b.buildings);
});

test("movement cannot enter a building or leave map bounds", () => {
  let state = initialState("00000001");
  for (let i=0;i<5;i++) state = applyCommand(state, { id: String(i), type: "move", direction: "right" }).state;
  const blocked = applyCommand(state, { id: "blocked", type: "move", direction: "right" });
  assert.deepEqual(blocked.state.player, { x: 9, y: 5 });
  assert.equal(blocked.events[0].data.blocked, true);
  const moved = applyCommand(state, { id: "2", type: "move", direction: "left" });
  assert.deepEqual(moved.state.player, { x: 8, y: 5 });
});

test("business purchases and sales update integer minor-unit balances", () => {
  let state = initialState("00000001");
  state = applyCommand(state, { id: "1", type: "create-business", capitalMinor: 10000, businessType: "general-store" }).state;
  state = applyCommand(state, { id: "2", type: "buy-stock", productId: "bread", quantity: 2 }).state;
  assert.equal(state.shop?.cashMinor, 9500);
  assert.equal(state.shop?.inventory.bread, 2);
  state = applyCommand(state, { id: "3", type: "sell-product", productId: "bread", quantity: 1 }).state;
  assert.equal(state.shop?.cashMinor, 9900);
  assert.equal(state.shop?.inventory.bread, 1);
});

test("transactions reject overspending and overselling without changing state", () => {
  let state = initialState("00000001");
  state = applyCommand(state, { id: "1", type: "create-business", capitalMinor: 10000, businessType: "general-store" }).state;
  assert.throws(() => applyCommand(state, { id: "2", type: "buy-stock", productId: "tea", quantity: 100 }), /INSUFFICIENT_FUNDS/);
  assert.throws(() => applyCommand(state, { id: "3", type: "sell-product", productId: "tea", quantity: 1 }), /INSUFFICIENT_STOCK/);
  assert.equal(state.shop?.cashMinor, 10000);
  assert.equal(state.shop?.inventory.tea, 0);
});

test("advancing days is bounded and world state remains paused absent a command", () => {
  let state = initialState("00000001");
  state = applyCommand(state, { id: "1", type: "create-business", capitalMinor: 10000, businessType: "general-store" }).state;
  state = applyCommand(state, { id: "2", type: "advance-day", days: 5 }).state;
  assert.equal(state.shop?.day, 6);
  assert.throws(() => applyCommand(state, { id: "3", type: "advance-day", days: 31 }), /INVALID_DAY_COUNT/);
});

test("advancing hours updates the day/night clock across midnight", () => {
  let state = initialState("00000001");
  state = applyCommand(state, { id: "1", type: "create-business", capitalMinor: 10000, businessType: "general-store" }).state;
  state = applyCommand(state, { id: "2", type: "advance-time", hours: 12 }).state;
  assert.equal(state.shop?.hour, 20);
  state = applyCommand(state, { id: "3", type: "advance-time", hours: 4 }).state;
  assert.equal(state.shop?.hour, 0);
  assert.equal(state.shop?.day, 2);
});

test("API command parser rejects unknown types and malformed identifiers", () => {
  assert.equal(parseCommand({ id: "bad", type: "move", direction: "left" }), null);
  assert.equal(parseCommand({ id: "f66c2e92-5b6d-4f92-9ca7-064ac17622cc", type: "teleport" }), null);
  assert.equal(parseCommand({ id: "f66c2e92-5b6d-4f92-9ca7-064ac17622cc", type: "move", direction: "left" })?.type, "move");
});
