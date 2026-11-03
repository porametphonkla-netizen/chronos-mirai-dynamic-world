import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { WorldState } from "@chronos/contracts";
import { assetManifest } from "./assetManifest.js";

const TILE = 32;
class CityScene extends Phaser.Scene {
  private currentState: WorldState | null = null;
  private ready = false;
  private disposed = false;

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.disposed) return;
    const key = event.key.toLowerCase();
    const direction = key === "arrowup" || key === "w" ? "up" : key === "arrowdown" || key === "s" ? "down" : key === "arrowleft" || key === "a" ? "left" : key === "arrowright" || key === "d" ? "right" : null;
    if (direction) this.onMove(direction);
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer) => {
    if (!this.currentState || this.disposed || !this.ready) return;
    const targetX = Math.floor(pointer.worldX / TILE);
    const targetY = Math.floor(pointer.worldY / TILE);
    const dx = targetX - this.currentState.player.x;
    const dy = targetY - this.currentState.player.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    this.onMove(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  };

  private readonly handleShutdown = () => {
    this.ready = false;
    this.input?.keyboard?.off("keydown", this.handleKeyDown);
    this.input?.off("pointerup", this.handlePointerUp);
  };

  private readonly handleDestroy = () => {
    this.dispose();
  };

  constructor(private onMove: (direction: "up"|"down"|"left"|"right") => void) { super("city"); }

  create() {
    if (this.disposed) return;

    this.cameras.main.setBackgroundColor("#263b31");
    const g = this.add.graphics();
    for (let y = 0; y < 15; y++) for (let x = 0; x < 20; x++) {
      g.fillStyle((x + y) % 2 ? 0x31513d : 0x385a43, 1); g.fillRect(x*TILE,y*TILE,TILE-1,TILE-1);
    }
    const keys = this.input.keyboard!.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;
    void keys;

    this.input.off("pointerup", this.handlePointerUp);
    this.input.on("pointerup", this.handlePointerUp);

    const keyboard = this.input.keyboard!;
    keyboard.off("keydown", this.handleKeyDown);
    keyboard.on("keydown", this.handleKeyDown);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.handleDestroy);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleDestroy);

    // Phaser injects the Scene plugins before create(); React may have supplied
    // one or more states before this point, so draw the latest pending value.
    this.ready = true;
    this.drawWorld();
  }

  set worldState(state: WorldState) {
    if (this.disposed) return;
    this.currentState = state;
    if (this.ready) this.drawWorld();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.input?.keyboard?.off("keydown", this.handleKeyDown);
    this.input?.off("pointerup", this.handlePointerUp);
  }

  private drawWorld() {
    if (!this.ready || this.disposed || !this.currentState) return;
    this.children.removeAll(true);
    const g = this.add.graphics();
    for (let y = 0; y < 15; y++) for (let x = 0; x < 20; x++) {
      g.fillStyle((x + y) % 2 ? 0x31513d : 0x385a43, 1); g.fillRect(x*TILE,y*TILE,TILE-1,TILE-1);
    }
    for (const building of this.currentState.buildings) {
      g.fillStyle(building.kind === "shop" ? 0x98633f : 0x526e85, 1);
      g.fillRect(building.x*TILE,building.y*TILE,building.width*TILE,building.height*TILE);
      g.fillStyle(0xe8c875,1); g.fillRect((building.x+1)*TILE,(building.y+1)*TILE,TILE,TILE);
      this.add.text(building.x*TILE,building.y*TILE-18,building.kind === "shop" ? "ร้านค้า" : "บ้าน", { color:"#fff2ca",fontSize:"12px",fontFamily:"sans-serif" });
    }
    g.fillStyle(0xe7c857,1); g.fillRect(this.currentState.player.x*TILE+5,this.currentState.player.y*TILE+3,22,26);
  }
}

export function GameCanvas({ state, onMove }: { state: WorldState; onMove: (direction: "up"|"down"|"left"|"right") => void }) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<CityScene | null>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  useEffect(() => {
    if (!container.current) return;
    const cityScene = new CityScene(direction => moveRef.current(direction)); scene.current = cityScene;
    const game = new Phaser.Game({ type: Phaser.AUTO, width: 640, height: 480, parent: container.current, backgroundColor: "#263b31", pixelArt: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: cityScene });
    return () => {
      cityScene.dispose();
      game.destroy(true);
      if (scene.current === cityScene) scene.current = null;
    };
  }, []);
  useEffect(() => { if (scene.current) scene.current.worldState = state; }, [state]);
  return <div className="canvas-frame" ref={container} aria-label="แผนที่เมืองจำลอง" data-assets={assetManifest.version} />;
}
