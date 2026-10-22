"use client";
/**
 * app/dashboard/[slug]/realestate/onboard/page.tsx
 * CrewwOS for Real Estate — 5-step onboarding wizard
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const SPECIALTIES = ["Residential Buyer","Residential Seller","Luxury","Commercial","Investment/Rental","Land/Lots","New Construction","Property Management","Other"];

function SpecialtyDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:value?"#fff":"rgba(255,255,255,0.35)",fontSize:14,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between" }}>
        {value || "Select specialty…"}<span>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,zIndex:9999,maxHeight:240,overflowY:"auto" }}>
          {SPECIALTIES.map(s => <div key={s} onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false); }} style={{ padding:"10px 14px",fontSize:13,color:"#fff",cursor:"pointer",background:value===s?"rgba(16,185,129,0.08)":"transparent",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{s}</div>)}
        </div>
      )}
    </div>
  );
}

function PhotoUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErr("Please select an image."); return; }
    setUploading(true); setErr("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/realestate/upload-photo", { method:"POST", body:fd });
    const { url } = await res.json(); onChange(url); setUploading(false);
  }
  return (
    <div>
      {value && <img src={value} style={{ width:72,height:72,borderRadius:8,objectFit:"cover",marginBottom:8,border:"1px solid rgba(255,255,255,0.12)" }} />}
      <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f); }} style={{ border:"1px dashed rgba(16,185,129,0.4)",borderRadius:10,padding:"20px",textAlign:"center",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:13,background:"rgba(16,185,129,0.04)" }}>
        {uploading?"Uploading…":value?"Replace photo":"Upload headshot"}
      </div>
      {err && <p style={{ color:"#ff9999",fontSize:12,marginTop:6 }}>{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
    </div>
  );
}

export default function RealEstateOnboard() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string ?? "";
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [agentName, setAgentName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [zillowUrl, setZillowUrl] = useState("");
  const [realtorUrl, setRealtorUrl] = useState("");

  const STEPS = ["Agent Info","Photo & Brand","Specialty","Online Presence","All set!"];

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/realestate/onboard", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ agent_name:agentName, brokerage, license_number:licenseNumber, specialty, phone_number:phone, website, photo_url:photoUrl, zillow_url:zillowUrl, realtor_url:realtorUrl, onboarding_step:Math.min(nextStep,5), onboarding_complete:complete }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.error??"Save failed"); }
      if (complete) router.push(`/dashboard/${slug}/realestate`);
      else setStep(nextStep);
    } catch(e:any) { setError(e.message); }
    setSaving(false);
  }

  const progress = ((step-1)/(STEPS.length-1))*100;

  return (
    <div style={{ minHeight:"100vh",background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ width:"100%",maxWidth:560 }}>
        <div style={{ color:"#10B981",fontSize:12,letterSpacing:3,marginBottom:12,textAlign:"center" }}>CREWWOS · STEP {step} OF {STEPS.length}</div>
        <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:4,height:4,marginBottom:24 }}>
          <div style={{ background:"linear-gradient(90deg,#10B981,#059669)",height:"100%",borderRadius:4,width:`${progress}%`,transition:"width 0.3s" }} />
        </div>
        <div style={{ background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:32,overflow:"visible" }}>
          {error && <div style={{ color:"#ff9999",fontSize:12,marginBottom:16,background:"rgba(255,0,0,0.05)",border:"1px solid rgba(255,0,0,0.15)",borderRadius:8,padding:"10px 14px" }}>{error}</div>}

          {step===1 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🏡</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Your agent profile</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Your agents use this to introduce you, manage listings, and follow up with leads.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Full Name *</label><input value={agentName} onChange={e=>setAgentName(e.target.value)} placeholder="e.g. Marcus Williams" style={I} /></div>
                <div><label style={L}>Brokerage</label><input value={brokerage} onChange={e=>setBrokerage(e.target.value)} placeholder="e.g. Keller Williams OKC Metro" style={I} /></div>
                <div><label style={L}>License Number</label><input value={licenseNumber} onChange={e=>setLicenseNumber(e.target.value)} placeholder="Your state license #" style={I} /></div>
                <div><label style={L}>Phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(405) 555-0100" style={I} /></div>
                <div><label style={L}>Website (optional)</label><input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://youragentsite.com" style={I} /></div>
              </div>
            </div>
          )}
          {step===2 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>📸</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Upload your headshot</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Used on listing emails, follow-up texts, and your agent profile.</p>
              <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
            </div>
          )}
          {step===3 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🎯</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>What's your specialty?</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Your agents will be tuned to your market and client type.</p>
              <SpecialtyDropdown value={specialty} onChange={setSpecialty} />
            </div>
          )}
          {step===4 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🌐</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Your online profiles</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>ReviewAgent will monitor and respond to your ratings automatically.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Zillow Agent Profile URL</label><input value={zillowUrl} onChange={e=>setZillowUrl(e.target.value)} placeholder="https://zillow.com/profile/..." style={I} /></div>
                <div><label style={L}>Realtor.com Profile URL</label><input value={realtorUrl} onChange={e=>setRealtorUrl(e.target.value)} placeholder="https://realtor.com/realestateagents/..." style={I} /></div>
              </div>
            </div>
          )}
          {step===5 && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:22,fontWeight:700,marginBottom:8 }}>{agentName} is live!</h2>
              <p style={{ color:"rgba(255,255,255,0.55)",fontSize:14,lineHeight:1.7,marginBottom:24 }}>Your crew is ready. Connect your calendar and lead forms so your agents can start working leads 24/7.</p>
            </div>
          )}

          <div style={{ display:"flex",gap:10,marginTop:28 }}>
            {step>1 && step<5 && <button onClick={() => setStep(s=>s-1)} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>← Back</button>}
            {step<4 && <button onClick={() => saveStep(step+1)} disabled={saving||(step===1&&!agentName.trim())} style={{ flex:2,background:"linear-gradient(135deg,#10B981,#059669)",border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button>}
            {step===4 && (<><button onClick={() => saveStep(5)} disabled={saving} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>Skip</button><button onClick={() => saveStep(5)} disabled={saving} style={{ flex:2,background:"linear-gradient(135deg,#10B981,#059669)",border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button></>)}
            {step===5 && <button onClick={() => saveStep(5,true)} disabled={saving} style={{ flex:1,background:"linear-gradient(135deg,#10B981,#059669)",border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer" }}>{saving?"Launching…":"Go to dashboard →"}</button>}
          </div>
          {step<5 && <div style={{ textAlign:"center",marginTop:12 }}><button onClick={() => saveStep(step+1)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:12,cursor:"pointer" }}>Skip this step</button></div>}
        </div>
      </div>
    </div>
  );
}
const L: React.CSSProperties = { display:"block",fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:6,fontWeight:600,letterSpacing:0.5 };
const I: React.CSSProperties = { width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box" };
