import { useCallback, useEffect, useState } from "react";
import type { WorldView } from "@chronos/contracts";
import { GameCanvas } from "../game/GameCanvas.js";

type SavedWorld = { id:string; token:string; name:string };
const API = import.meta.env.VITE_API_URL ?? "/api";
const key = "chronos.local-worlds";
function savedWorlds(): SavedWorld[] { try { return JSON.parse(localStorage.getItem(key) ?? "[]") as SavedWorld[]; } catch { return []; } }
function money(minor:number) { return new Intl.NumberFormat("th-TH", { style:"currency",currency:"THB",maximumFractionDigits:2 }).format(minor / 100); }

export function App() {
  const [worlds,setWorlds] = useState(savedWorlds);
  const [active,setActive] = useState<SavedWorld|null>(null);
  const [world,setWorld] = useState<WorldView|null>(null);
  const [worldName,setWorldName] = useState("เมืองของฉัน");
  const [capital,setCapital] = useState(100000);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const save = (items:SavedWorld[]) => { setWorlds(items); localStorage.setItem(key,JSON.stringify(items)); };
  const load = useCallback(async (target:SavedWorld) => {
    setBusy(true); setMessage("");
    try { const res = await fetch(`${API}/v1/worlds/${target.id}`,{headers:{"x-world-token":target.token}}); if(!res.ok) throw new Error("เปิดโลกไม่สำเร็จ"); setWorld(await res.json() as WorldView); setActive(target); }
    catch(error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  },[]);
  useEffect(() => { if (!worlds.length) return; void load(worlds[0]); }, []);

  const createWorld = async (event:React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const res = await fetch(`${API}/v1/worlds`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:worldName})});
      const data = await res.json(); if(!res.ok) throw new Error(data.error?.message ?? "สร้างโลกไม่สำเร็จ");
      const item={id:data.id,token:data.accessToken,name:data.name}; const next=[item,...worlds]; save(next); await load(item);
    } catch(error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  };

  const sendCommand = useCallback(async (command:Record<string,unknown>) => {
    if(!world || !active || busy) return;
    setBusy(true); setMessage("");
    const commandId=crypto.randomUUID();
    try {
      const res=await fetch(`${API}/v1/worlds/${world.id}/commands`,{method:"POST",headers:{"content-type":"application/json","x-world-token":active.token,"idempotency-key":commandId},body:JSON.stringify({commandId,expectedRevision:world.currentRevision,command:{id:commandId,...command}})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error?.code === "REVISION_CONFLICT" ? "โลกมีการเปลี่ยนแปลง กรุณาลองอีกครั้ง" : data.error?.message ?? "คำสั่งไม่สำเร็จ");
      await load(active);
    } catch(error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  },[active,world,busy,load]);
  const move=useCallback((direction:"up"|"down"|"left"|"right")=>{void sendCommand({type:"move",direction});},[sendCommand]);

  if(!world) return <main className="setup"><div className="brand-mark">C × M</div><p className="eyebrow">A DYNAMIC WORLD OF DECISION-MAKING</p><h1>เริ่มต้นเมืองของคุณ</h1><p className="muted">สร้างโลกส่วนตัวเพื่อเริ่มการจำลอง เมืองจะหยุดเมื่อคุณออกจากเกม</p>
    <form onSubmit={createWorld} className="create-form"><label>ชื่อเมือง<input value={worldName} onChange={e=>setWorldName(e.target.value)} maxLength={80} required /></label><button disabled={busy}>{busy?"กำลังสร้าง…":"สร้างโลกส่วนตัว"}</button></form>
    {worlds.length>0&&<section className="saved-worlds"><h2>โลกที่บันทึกไว้ในอุปกรณ์นี้</h2>{worlds.map(w=><button className="world-option" key={w.id} onClick={()=>void load(w)}>{w.name} <span>เปิดโลก →</span></button>)}</section>}{message&&<p className="error">{message}</p>}<p className="fineprint">ต้นแบบพัฒนาภายใน: ข้อมูลการเข้าถึงโลกนี้เก็บไว้ในเบราว์เซอร์เครื่องนี้</p></main>;

  const nearShop=world.state.buildings.some(b=>b.kind==="shop"&&Math.abs(world.state.player.x-b.x)<=4&&Math.abs(world.state.player.y-b.y)<=4);
  const shop=world.state.shop;
  return <main className="game-shell"><header className="topbar"><div><span className="brand-mark small">C × M</span><div><strong>{world.name}</strong><small>REVISION {world.currentRevision} · WORLD PAUSED</small></div></div><button className="quiet" onClick={()=>{setActive(null);setWorld(null);}}>ออกจากโลก</button></header>
    <section className="world-layout"><div className="game-column"><div className="section-heading"><div><p className="eyebrow">เมืองจำลอง · วันที่ {shop?.day ?? 1} · {shop?.hour ?? 8}:00</p><h1>ชีวิตในเมือง</h1></div><span className="status-pill">● บันทึกแล้ว</span></div><GameCanvas state={world.state} onMove={move}/><div className="controls"><span>เคลื่อนที่</span>{(["up","left","down","right"] as const).map(d=><button key={d} aria-label={d} onClick={()=>void sendCommand({type:"move",direction:d})}>{({up:"↑",down:"↓",left:"←",right:"→"})[d]}</button>)}<small>ใช้ปุ่มลูกศรหรือ WASD ได้ด้วย</small></div></div>
    <aside className="panel"><p className="eyebrow">ธุรกิจของคุณ</p><h2>{shop?"ร้านค้าทั่วไป":"เริ่มต้นกิจการ"}</h2>{!shop?<><p className="muted">เลือกเงินทุนตั้งต้นสำหรับร้านของคุณ</p><label>ทุนตั้งต้น: {money(capital)}<input type="range" min="10000" max="1000000" step="10000" value={capital} onChange={e=>setCapital(Number(e.target.value))}/></label><button disabled={busy} onClick={()=>void sendCommand({type:"create-business",businessType:"general-store",capitalMinor:capital})}>เปิดร้าน</button></>:<><div className="balance"><span>เงินสด</span><strong>{money(shop.cashMinor)}</strong></div><div className="product-row"><div><strong>ขนมปัง</strong><small>ซื้อ {money(250)} · ขาย {money(400)} · คงเหลือ {shop.inventory.bread}</small></div><button disabled={busy||!nearShop} onClick={()=>void sendCommand({type:"buy-stock",productId:"bread",quantity:1})}>ซื้อ 1</button><button className="secondary" disabled={busy||shop.inventory.bread<1} onClick={()=>void sendCommand({type:"sell-product",productId:"bread",quantity:1})}>ขาย 1</button></div><div className="product-row"><div><strong>ชา</strong><small>ซื้อ {money(500)} · ขาย {money(800)} · คงเหลือ {shop.inventory.tea}</small></div><button disabled={busy||!nearShop} onClick={()=>void sendCommand({type:"buy-stock",productId:"tea",quantity:1})}>ซื้อ 1</button><button className="secondary" disabled={busy||shop.inventory.tea<1} onClick={()=>void sendCommand({type:"sell-product",productId:"tea",quantity:1})}>ขาย 1</button></div><p className="hint">{nearShop?"อยู่ใกล้ร้านค้า ซื้อสินค้าเข้าสต็อกได้":"เดินเข้าใกล้ร้านค้าเพื่อซื้อสินค้า"}</p></>}
    <hr/><p className="eyebrow">เวลาในเมือง</p><p className="muted">วันที่ {shop?.day ?? 1} · {String(shop?.hour ?? 8).padStart(2,"0")}:00 · {((shop?.hour ?? 8) >= 6 && (shop?.hour ?? 8) < 18)?"กลางวัน":"กลางคืน"}. โลกหยุดเมื่อคุณออก</p><div className="time-controls"><button className="secondary" disabled={busy||!shop} onClick={()=>void sendCommand({type:"advance-time",hours:4})}>+4 ชั่วโมง</button><button className="secondary" disabled={busy||!shop} onClick={()=>void sendCommand({type:"advance-day",days:1})}>+1 วัน</button></div><div className="callout"><strong>CHRONOS</strong><span>การตัดสินใจสำคัญจะถูกบันทึกในประวัติ</span></div></aside></section>
    {message&&<div className="toast" role="alert">{message}<button onClick={()=>setMessage("")}>ปิด</button></div>}
  </main>;
}
