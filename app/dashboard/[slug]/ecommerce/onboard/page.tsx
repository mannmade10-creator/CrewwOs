"use client";
/**
 * app/dashboard/[slug]/ecommerce/onboard/page.tsx
 * CrewwOS for E-Commerce — 5-step onboarding wizard
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const PLATFORMS = ["Shopify","WooCommerce","BigCommerce","Etsy","Amazon","TikTok Shop","Squarespace","Custom / Other"];

const ACCENT = "#8B5CF6";

function PlatformDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button type="button" onClick={() => setOpen(o=>!o)} style={{ width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:value?"#fff":"rgba(255,255,255,0.35)",fontSize:14,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between" }}>
        {value||"Select your platform…"}<span>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{ position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,zIndex:9999,maxHeight:240,overflowY:"auto" }}>
          {PLATFORMS.map(p=><div key={p} onMouseDown={e=>{e.preventDefault();onChange(p);setOpen(false);}} style={{ padding:"10px 14px",fontSize:13,color:"#fff",cursor:"pointer",background:value===p?`${ACCENT}14`:"transparent",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{p}</div>)}
        </div>
      )}
    </div>
  );
}

function LogoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErr("Please select an image."); return; }
    setUploading(true); setErr("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/ecommerce/upload-logo", { method:"POST", body:fd });
    const { url } = await res.json(); onChange(url); setUploading(false);
  }
  return (
    <div>
      {value&&<img src={value} style={{ width:72,height:72,borderRadius:8,objectFit:"cover",marginBottom:8,border:"1px solid rgba(255,255,255,0.12)" }} />}
      <div onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)handleFile(f);}} style={{ border:`1px dashed ${ACCENT}66`,borderRadius:10,padding:"20px",textAlign:"center",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:13,background:`${ACCENT}0a` }}>
        {uploading?"Uploading…":value?"Replace logo":"Upload store logo"}
      </div>
      {err&&<p style={{ color:"#ff9999",fontSize:12,marginTop:6 }}>{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}} />
    </div>
  );
}

export default function EcommerceOnboard() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string ?? "";
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [storeName, setStoreName] = useState("");
  const [platform, setPlatform] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [metaAdsId, setMetaAdsId] = useState("");

  const STEPS = ["Store Info","Logo & Brand","Online Presence","Marketing Setup","All set!"];

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/ecommerce/onboard", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ store_name:storeName, platform, store_url:storeUrl, logo_url:logoUrl, google_merchant_url:googleUrl, instagram_url:instagramUrl, meta_ads_id:metaAdsId, onboarding_step:Math.min(nextStep,5), onboarding_complete:complete }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.error??"Save failed"); }
      if (complete) router.push(`/dashboard/${slug}/ecommerce`);
      else setStep(nextStep);
    } catch(e:any) { setError(e.message); }
    setSaving(false);
  }

  const progress = ((step-1)/(STEPS.length-1))*100;

  return (
    <div style={{ minHeight:"100vh",background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ width:"100%",maxWidth:560 }}>
        <div style={{ color:ACCENT,fontSize:12,letterSpacing:3,marginBottom:12,textAlign:"center" }}>CREWWOS · STEP {step} OF {STEPS.length}</div>
        <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:4,height:4,marginBottom:24 }}>
          <div style={{ background:`linear-gradient(90deg,${ACCENT},#7C3AED)`,height:"100%",borderRadius:4,width:`${progress}%`,transition:"width 0.3s" }} />
        </div>
        <div style={{ background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:32,overflow:"visible" }}>
          {error&&<div style={{ color:"#ff9999",fontSize:12,marginBottom:16,background:"rgba(255,0,0,0.05)",border:"1px solid rgba(255,0,0,0.15)",borderRadius:8,padding:"10px 14px" }}>{error}</div>}

          {step===1&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🛍️</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Tell us about your store</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Your agents will use this to manage orders, ads, and customer outreach.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Store Name *</label><input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="e.g. Mann's Apparel" style={I} /></div>
                <div><label style={L}>Platform *</label><PlatformDropdown value={platform} onChange={setPlatform} /></div>
                <div><label style={L}>Store URL</label><input value={storeUrl} onChange={e=>setStoreUrl(e.target.value)} placeholder="https://yourstore.com" style={I} /></div>
              </div>
            </div>
          )}
          {step===2&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🖼️</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Upload your logo</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Used on emails, ads, and your agent profile.</p>
              <LogoUpload value={logoUrl} onChange={setLogoUrl} />
            </div>
          )}
          {step===3&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🌐</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Connect your channels</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>SocialAgent and ReviewAgent will monitor and post to these automatically.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Google Merchant Center URL (optional)</label><input value={googleUrl} onChange={e=>setGoogleUrl(e.target.value)} placeholder="https://merchants.google.com/..." style={I} /></div>
                <div><label style={L}>Instagram Profile URL (optional)</label><input value={instagramUrl} onChange={e=>setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourstore" style={I} /></div>
              </div>
            </div>
          )}
          {step===4&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>📈</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Marketing setup</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>AdAgent uses your Meta Ads account to run and optimize campaigns.</p>
              <div>
                <label style={L}>Meta Ads Account ID (optional)</label>
                <input value={metaAdsId} onChange={e=>setMetaAdsId(e.target.value)} placeholder="e.g. act_123456789" style={I} />
              </div>
              <div style={{ background:`${ACCENT}0d`,border:`1px solid ${ACCENT}33`,borderRadius:10,padding:"14px 16px",marginTop:16,fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.6 }}>
                <span style={{ color:ACCENT,fontWeight:700 }}>Coming soon:</span> Google Ads, TikTok Ads, and Klaviyo email integration.
              </div>
            </div>
          )}
          {step===5&&(
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:22,fontWeight:700,marginBottom:8 }}>{storeName} is live!</h2>
              <p style={{ color:"rgba(255,255,255,0.55)",fontSize:14,lineHeight:1.7,marginBottom:24 }}>Your crew is ready. Connect your store's webhook so OrderAgent can start processing orders in real time.</p>
            </div>
          )}

          <div style={{ display:"flex",gap:10,marginTop:28 }}>
            {step>1&&step<5&&<button onClick={()=>setStep(s=>s-1)} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>← Back</button>}
            {step<4&&<button onClick={()=>saveStep(step+1)} disabled={saving||(step===1&&(!storeName.trim()||!platform))} style={{ flex:2,background:`linear-gradient(135deg,${ACCENT},#7C3AED)`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button>}
            {step===4&&(<><button onClick={()=>saveStep(5)} disabled={saving} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>Skip</button><button onClick={()=>saveStep(5)} disabled={saving} style={{ flex:2,background:`linear-gradient(135deg,${ACCENT},#7C3AED)`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button></>)}
            {step===5&&<button onClick={()=>saveStep(5,true)} disabled={saving} style={{ flex:1,background:`linear-gradient(135deg,${ACCENT},#7C3AED)`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer" }}>{saving?"Launching…":"Go to dashboard →"}</button>}
          </div>
          {step<5&&<div style={{ textAlign:"center",marginTop:12 }}><button onClick={()=>saveStep(step+1)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:12,cursor:"pointer" }}>Skip this step</button></div>}
        </div>
      </div>
    </div>
  );
}
const L: React.CSSProperties = { display:"block",fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:6,fontWeight:600,letterSpacing:0.5 };
const I: React.CSSProperties = { width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box" };
