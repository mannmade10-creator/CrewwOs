"use client";
/**
 * app/dashboard/[slug]/restaurant/onboard/page.tsx
 * CrewwOS for Restaurants — 5-step onboarding wizard
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const CUISINES = [
  "American / Burgers","BBQ","Breakfast & Brunch","Caribbean","Chinese",
  "Fast Casual","Fine Dining","Food Truck","Indian","Italian","Japanese / Sushi",
  "Mediterranean","Mexican","Pizza","Seafood","Soul Food","Thai","Vegan / Vegetarian","Other",
];

function CuisineDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:value?"#fff":"rgba(255,255,255,0.35)",fontSize:14,textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between" }}>
        {value || "Select cuisine type…"}<span>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,zIndex:9999,maxHeight:240,overflowY:"auto" }}>
          {CUISINES.map(c => <div key={c} onMouseDown={e => { e.preventDefault(); onChange(c); setOpen(false); }} style={{ padding:"10px 14px",fontSize:13,color:"#fff",cursor:"pointer",background:value===c?"rgba(249,115,22,0.08)":"transparent",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{c}</div>)}
        </div>
      )}
    </div>
  );
}

function LogoUpload({ value, onChange, accent = "#f97316" }: { value: string; onChange: (url: string) => void; accent?: string }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setErr("Please select an image."); return; }
    setUploading(true); setErr("");
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/restaurant/upload-logo", { method:"POST", body:fd });
    const { url } = await res.json(); onChange(url); setUploading(false);
  }
  return (
    <div>
      {value && <img src={value} style={{ width:72,height:72,borderRadius:8,objectFit:"cover",marginBottom:8,border:"1px solid rgba(255,255,255,0.12)" }} />}
      <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f); }} style={{ border:`1px dashed ${accent}66`,borderRadius:10,padding:"20px",textAlign:"center",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:13,background:`${accent}0a` }}>
        {uploading?"Uploading…":value?"Replace logo":"Upload restaurant logo"}
      </div>
      {err && <p style={{ color:"#ff9999",fontSize:12,marginTop:6 }}>{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
    </div>
  );
}

export default function RestaurantOnboard() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string ?? "";
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [yelpUrl, setYelpUrl] = useState("");
  const [doordashUrl, setDoordashUrl] = useState("");

  const STEPS = ["Restaurant Info","Logo & Brand","Online Presence","Delivery Platforms","All set!"];

  async function saveStep(nextStep: number, complete = false) {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/restaurant/onboard", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ restaurant_name:restaurantName, cuisine_type:cuisineType, phone_number:phone, address, website, logo_url:logoUrl, google_business_url:googleUrl, yelp_url:yelpUrl, doordash_url:doordashUrl, onboarding_step:Math.min(nextStep,5), onboarding_complete:complete }),
      });
      if (!res.ok) { const d=await res.json(); throw new Error(d.error??"Save failed"); }
      if (complete) router.push(`/dashboard/${slug}/restaurant`);
      else setStep(nextStep);
    } catch(e:any) { setError(e.message); }
    setSaving(false);
  }

  const progress = ((step-1)/(STEPS.length-1))*100;
  const ACCENT = "#f97316";

  return (
    <div style={{ minHeight:"100vh",background:"#060612",color:"#fff",fontFamily:"Inter, sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ width:"100%",maxWidth:560 }}>
        <div style={{ color:ACCENT,fontSize:12,letterSpacing:3,marginBottom:12,textAlign:"center" }}>CREWWOS · STEP {step} OF {STEPS.length}</div>
        <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:4,height:4,marginBottom:24 }}>
          <div style={{ background:`linear-gradient(90deg,${ACCENT},#ea580c)`,height:"100%",borderRadius:4,width:`${progress}%`,transition:"width 0.3s" }} />
        </div>
        <div style={{ background:"#0d0d1a",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:32,overflow:"visible" }}>
          {error && <div style={{ color:"#ff9999",fontSize:12,marginBottom:16,background:"rgba(255,0,0,0.05)",border:"1px solid rgba(255,0,0,0.15)",borderRadius:8,padding:"10px 14px" }}>{error}</div>}

          {step===1 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🍽️</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Tell us about your restaurant</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Your agents will use this to manage orders, reviews, and customer outreach.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Restaurant Name *</label><input value={restaurantName} onChange={e=>setRestaurantName(e.target.value)} placeholder="e.g. Mann's Smokehouse" style={I} /></div>
                <div><label style={L}>Cuisine Type *</label><CuisineDropdown value={cuisineType} onChange={setCuisineType} /></div>
                <div><label style={L}>Phone Number</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(405) 555-0100" style={I} /></div>
                <div><label style={L}>Address</label><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="123 Main St, Oklahoma City, OK" style={I} /></div>
                <div><label style={L}>Website (optional)</label><input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourrestaurant.com" style={I} /></div>
              </div>
            </div>
          )}
          {step===2 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🖼️</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Upload your logo</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>Used on social posts, email headers, and your agent profile.</p>
              <LogoUpload value={logoUrl} onChange={setLogoUrl} accent={ACCENT} />
            </div>
          )}
          {step===3 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>🌐</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Connect your online presence</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>ReviewAgent will monitor and automatically respond to your ratings.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>Google Business Profile URL</label><input value={googleUrl} onChange={e=>setGoogleUrl(e.target.value)} placeholder="https://business.google.com/..." style={I} /></div>
                <div><label style={L}>Yelp Profile URL (optional)</label><input value={yelpUrl} onChange={e=>setYelpUrl(e.target.value)} placeholder="https://yelp.com/biz/..." style={I} /></div>
              </div>
            </div>
          )}
          {step===4 && (
            <div>
              <div style={{ fontSize:32,marginBottom:12,textAlign:"center" }}>📲</div>
              <h2 style={{ fontSize:20,fontWeight:700,marginBottom:6,textAlign:"center" }}>Delivery platforms</h2>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,textAlign:"center",lineHeight:1.6 }}>OrderAgent tracks all your delivery channels in one place.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div><label style={L}>DoorDash Store URL (optional)</label><input value={doordashUrl} onChange={e=>setDoordashUrl(e.target.value)} placeholder="https://doordash.com/store/..." style={I} /></div>
              </div>
              <div style={{ background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:10,padding:"14px 16px",marginTop:16,fontSize:12,color:"rgba(255,255,255,0.55)",lineHeight:1.6 }}>
                <span style={{ color:ACCENT,fontWeight:700 }}>Coming soon:</span> Uber Eats, Grubhub, and Square POS integrations.
              </div>
            </div>
          )}
          {step===5 && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:48,marginBottom:16 }}>✅</div>
              <h2 style={{ fontSize:22,fontWeight:700,marginBottom:8 }}>{restaurantName} is live!</h2>
              <p style={{ color:"rgba(255,255,255,0.55)",fontSize:14,lineHeight:1.7,marginBottom:24 }}>Your crew is ready. Connect your Google Business and DMs so your agents can start managing reviews and orders.</p>
            </div>
          )}

          <div style={{ display:"flex",gap:10,marginTop:28 }}>
            {step>1 && step<5 && <button onClick={() => setStep(s=>s-1)} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>← Back</button>}
            {step<4 && <button onClick={() => saveStep(step+1)} disabled={saving||(step===1&&(!restaurantName.trim()||!cuisineType))} style={{ flex:2,background:`linear-gradient(135deg,${ACCENT},#ea580c)`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button>}
            {step===4 && (<><button onClick={() => saveStep(5)} disabled={saving} style={{ flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:12,color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:14,cursor:"pointer" }}>Skip</button><button onClick={() => saveStep(5)} disabled={saving} style={{ flex:2,background:`linear-gradient(135deg,${ACCENT},#ea580c)`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",opacity:saving?0.6:1 }}>{saving?"Saving…":"Save & Continue →"}</button></>)}
            {step===5 && <button onClick={() => saveStep(5,true)} disabled={saving} style={{ flex:1,background:`linear-gradient(135deg,${ACCENT},#ea580c)`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer" }}>{saving?"Launching…":"Go to dashboard →"}</button>}
          </div>
          {step<5 && <div style={{ textAlign:"center",marginTop:12 }}><button onClick={() => saveStep(step+1)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:12,cursor:"pointer" }}>Skip this step</button></div>}
        </div>
      </div>
    </div>
  );
}
const L: React.CSSProperties = { display:"block",fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:6,fontWeight:600,letterSpacing:0.5 };
const I: React.CSSProperties = { width:"100%",background:"#060612",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box" };
