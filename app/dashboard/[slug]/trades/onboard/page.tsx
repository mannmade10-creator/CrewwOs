"use client";
/**
 * app/dashboard/[slug]/trades/onboard/page.tsx
 * CrewwOS for Trades — 5-step onboarding wizard
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const TRADE_TYPES = [
  "HVAC","Electrician","Plumber","Roofer","General Contractor","Painter",
  "Landscaper / Lawn Care","Cleaner / Janitorial","Pest Control","Pool Service",
  "Handyman","Concrete / Masonry","Fencing","Flooring","Other",
];

const ACCENT = "#F59E0B";

function TradeDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:value?"#fff":"rgba(255,255,255,0.35)",fontSize:14,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between" }}>
        {value||"Select your trade…"}<span>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{ position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,zIndex:9999,maxHeight:240,overflowY:"auto" }}>
          {TRADE_TYPES.map(t=><div key={t} onMouseDown={e=>{e.preventDefault();onChange(t);setOpen(false);}} style={{ padding:"10px 14px",fontSize:13,color:"#fff",cursor:"pointer",background:value===t?`${ACCENT}14`:"transparent",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{t}</div>)}
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
    const res = await fetch("/api/trades/upload-logo", { method:"POST", body:fd });
    const { url } = await res.json(); onChange(url); setUploading(false);
  }
  return (
    <div>
      {value&&<img src={value} style={{ width:72,height:72,borderRadius:8,objectFit:"cover",marginBottom:8,border:"1px solid rgba(255,255,255,0.12)" }} />}
      <div onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f)handleFile(f);}} style={{ border:`1px dashed ${ACCENT}66`,borderRadius:10,padding:"20px",textAlign:"center",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:13,background:`${ACCENT}0a` }}>
        {uploading?"Uploading…":value?"Replace logo":"Upload business logo"}
      </div>
      {err&&<p style={{ color:"#ff9999",fontSize:12,marginTop:6 }}>{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}} />
    </div>
  );
}

export default function TradesOnboard() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string ?? "";
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [website, setWebsite] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");

  const STEPS = ["Business Info","License & Insurance","Logo & Brand","Online Presence","All set!"];

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/trades/onboard", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ business_name:businessName, trade_type:tradeType, phone_number:phone, service_area:serviceArea, website, license_number:licenseNumber, logo_url:logoUrl, google_business_url:googleUrl, yelp_url:yelpUrl, onboarding_step:Math.min(nextStep,5), onboarding_complete:complete }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.error??"Save failed"); }
      if (complete) router.push(`/dashboard/${slug}/trades`);
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
          <div style={{ background:`linear-gradient(90deg,${ACCENT},#D97706)`,height:"100%",borderRadius:4,width:`${progress}%`,transition:"width 0.3s" }} />
        </div>
        <div style={{ background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:32,overflow:"visible" }}>
          {error&&<div style={{ color:"#ff9999",fontSize:12,marginBottom:16,background:"rgba(255,0,0,0.05)",border:"1px solid rgba(255,0,0,0.15)",borderRadius:8,padding:"10px 14px" }}>{error}</div>}

          {step===1&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🔧</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Tell us about your business</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Your agents will use this to send estimates, invoices, and manage your jobs.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Business Name *</label><input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="e.g. Mann's HVAC Services" style={I} /></div>
                <div><label style={L}>Trade *</label><TradeDropdown value={tradeType} onChange={setTradeType} /></div>
                <div><label style={L}>Phone Number</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(405) 555-0100" style={I} /></div>
                <div><label style={L}>Service Area</label><input value={serviceArea} onChange={e=>setServiceArea(e.target.value)} placeholder="e.g. Oklahoma City metro, 50-mile radius" style={I} /></div>
                <div><label style={L}>Website (optional)</label><input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourbusiness.com" style={I} /></div>
              </div>
            </div>
          )}
          {step===2&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>📄</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>License & credentials</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>LegalAgent tracks your license renewals and puts your license number on estimates.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>License Number (optional)</label><input value={licenseNumber} onChange={e=>setLicenseNumber(e.target.value)} placeholder="Your state contractor license #" style={I} /></div>
              </div>
              <div style={{ background:`${ACCENT}0d`,border:`1px solid ${ACCENT}33`,borderRadius:10,padding:"14px 16px",marginTop:16,fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.6 }}>
                <span style={{ color:ACCENT,fontWeight:700 }}>Coming soon:</span> Automatic license renewal reminders and insurance expiration tracking.
              </div>
            </div>
          )}
          {step===3&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🖼️</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Upload your logo</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Used on estimates, invoices, and customer-facing communications.</p>
              <LogoUpload value={logoUrl} onChange={setLogoUrl} />
            </div>
          )}
          {step===4&&(
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🌐</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Connect your reviews</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>ReviewAgent will automatically request & respond to reviews after every completed job.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Google Business Profile URL</label><input value={googleUrl} onChange={e=>setGoogleUrl(e.target.value)} placeholder="https://business.google.com/..." style={I} /></div>
                <div><label style={L}>Yelp Profile URL (optional)</label><input value={yelpUrl} onChange={e=>setYelpUrl(e.target.value)} placeholder="https://yelp.com/biz/..." style={I} /></div>
              </div>
            </div>
          )}
          {step===5&&(
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:22,fontWeight:700,marginBottom:8 }}>{businessName} is live!</h2>
              <p style={{ color:"rgba(255,255,255,0.55)",fontSize:14,lineHeight:1.7,marginBottom:24 }}>Your crew is ready. Connect your Google Business so ReviewAgent can start collecting 5-star reviews after every job.</p>
            </div>
          )}

          <div style={{ display:"flex",gap:10,marginTop:28 }}>
            {step>1&&step<5&&<button onClick={()=>setStep(s=>s-1)} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>← Back</button>}
            {step<4&&<button onClick={()=>saveStep(step+1)} disabled={saving||(step===1&&(!businessName.trim()||!tradeType))} style={{ flex:2,background:`linear-gradient(135deg,${ACCENT},#D97706)`,border:"none",borderRadius:10,padding:12,color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button>}
            {step===4&&(<><button onClick={()=>saveStep(5)} disabled={saving} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>Skip</button><button onClick={()=>saveStep(5)} disabled={saving} style={{ flex:2,background:`linear-gradient(135deg,${ACCENT},#D97706)`,border:"none",borderRadius:10,padding:12,color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button></>)}
            {step===5&&<button onClick={()=>saveStep(5,true)} disabled={saving} style={{ flex:1,background:`linear-gradient(135deg,${ACCENT},#D97706)`,border:"none",borderRadius:10,padding:12,color:"#000",fontWeight:700,fontSize:14,cursor:"pointer" }}>{saving?"Launching…":"Go to dashboard →"}</button>}
          </div>
          {step<5&&<div style={{ textAlign:"center",marginTop:12 }}><button onClick={()=>saveStep(step+1)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:12,cursor:"pointer" }}>Skip this step</button></div>}
        </div>
      </div>
    </div>
  );
}
const L: React.CSSProperties = { display:"block",fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:6,fontWeight:600,letterSpacing:0.5 };
const I: React.CSSProperties = { width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box" };
