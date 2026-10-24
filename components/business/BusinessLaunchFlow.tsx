"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATE_SOS: Record<string, { name: string; url: string; fee: string; processingTime: string }> = {
  AL: { name: "Alabama", url: "https://www.sos.alabama.gov/business-services/file", fee: "$200", processingTime: "3-5 days" },
  AK: { name: "Alaska", url: "https://www.commerce.alaska.gov/web/cbpl/BusinessLicensing.aspx", fee: "$250", processingTime: "5-7 days" },
  AZ: { name: "Arizona", url: "https://azcc.gov/corporations/llcs", fee: "$50", processingTime: "Same day" },
  AR: { name: "Arkansas", url: "https://www.sos.arkansas.gov/corps/index.php", fee: "$45", processingTime: "3-5 days" },
  CA: { name: "California", url: "https://bizfileplus.sos.ca.gov", fee: "$70", processingTime: "3-5 days" },
  CO: { name: "Colorado", url: "https://mybiz.colorado.gov", fee: "$50", processingTime: "Same day" },
  CT: { name: "Connecticut", url: "https://www.concord-sots.ct.gov/CONCORD/online?sn=PublicInquiry&eid=9740", fee: "$120", processingTime: "3-5 days" },
  DE: { name: "Delaware", url: "https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx", fee: "$90", processingTime: "1-2 days" },
  FL: { name: "Florida", url: "https://dos.myflorida.com/sunbiz/start-business/", fee: "$125", processingTime: "Same day" },
  GA: { name: "Georgia", url: "https://ecorp.sos.ga.gov", fee: "$100", processingTime: "Same day" },
  HI: { name: "Hawaii", url: "https://hbe.ehawaii.gov/documents/welcome.html", fee: "$50", processingTime: "3-5 days" },
  ID: { name: "Idaho", url: "https://www.sos.idaho.gov/business/", fee: "$100", processingTime: "Same day" },
  IL: { name: "Illinois", url: "https://www.ilsos.gov/departments/business_services/home.html", fee: "$150", processingTime: "10 days" },
  IN: { name: "Indiana", url: "https://inbiz.in.gov", fee: "$95", processingTime: "Same day" },
  IA: { name: "Iowa", url: "https://sos.iowa.gov/business/", fee: "$50", processingTime: "Same day" },
  KS: { name: "Kansas", url: "https://www.sos.ks.gov/business/business.html", fee: "$160", processingTime: "3-5 days" },
  KY: { name: "Kentucky", url: "https://www.sos.ky.gov/bus/business-filings/Pages/default.aspx", fee: "$40", processingTime: "3-5 days" },
  LA: { name: "Louisiana", url: "https://www.geauxbiz.com", fee: "$100", processingTime: "3-5 days" },
  ME: { name: "Maine", url: "https://www.maine.gov/sos/cec/corp/", fee: "$175", processingTime: "3-5 days" },
  MD: { name: "Maryland", url: "https://dat.maryland.gov/businesses/Pages/default.aspx", fee: "$100", processingTime: "Same day" },
  MA: { name: "Massachusetts", url: "https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx", fee: "$500", processingTime: "Same day" },
  MI: { name: "Michigan", url: "https://www.michigan.gov/lara/bureau-list/bcs/corps", fee: "$50", processingTime: "Same day" },
  MN: { name: "Minnesota", url: "https://mblsportal.sos.state.mn.us", fee: "$135", processingTime: "Same day" },
  MS: { name: "Mississippi", url: "https://corp.sos.ms.gov", fee: "$50", processingTime: "Same day" },
  MO: { name: "Missouri", url: "https://www.sos.mo.gov/business/corporations/", fee: "$50", processingTime: "Same day" },
  MT: { name: "Montana", url: "https://sosmt.gov/business/", fee: "$35", processingTime: "3-5 days" },
  NE: { name: "Nebraska", url: "https://www.sos.ne.gov/business/corp_serv/", fee: "$100", processingTime: "Same day" },
  NV: { name: "Nevada", url: "https://esos.nv.gov/EntitySearch/OnlineEntitySearch", fee: "$425", processingTime: "Same day" },
  NH: { name: "New Hampshire", url: "https://quickstart.sos.nh.gov/online/Account/LandingPage", fee: "$100", processingTime: "Same day" },
  NJ: { name: "New Jersey", url: "https://www.njportal.com/DOR/BusinessFormation/", fee: "$125", processingTime: "Same day" },
  NM: { name: "New Mexico", url: "https://portal.sos.state.nm.us/BFS/online/CorporationMainSearch", fee: "$50", processingTime: "Same day" },
  NY: { name: "New York", url: "https://www.dos.ny.gov/corps/", fee: "$200", processingTime: "7 days" },
  NC: { name: "North Carolina", url: "https://www.sosnc.gov/online_services/search/by_title/_Business_Registration", fee: "$125", processingTime: "Same day" },
  ND: { name: "North Dakota", url: "https://sos.nd.gov/business/business-services.html", fee: "$135", processingTime: "Same day" },
  OH: { name: "Ohio", url: "https://www.ohiosos.gov/businesses/business-filing/", fee: "$99", processingTime: "Same day" },
  OK: { name: "Oklahoma", url: "https://www.sos.ok.gov/business/default.aspx", fee: "$100", processingTime: "Same day" },
  OR: { name: "Oregon", url: "https://sos.oregon.gov/business/Pages/register.aspx", fee: "$100", processingTime: "Same day" },
  PA: { name: "Pennsylvania", url: "https://www.corporations.pa.gov/search/corpsearch", fee: "$125", processingTime: "Same day" },
  RI: { name: "Rhode Island", url: "https://www.sos.ri.gov/divisions/business-portal", fee: "$150", processingTime: "Same day" },
  SC: { name: "South Carolina", url: "https://businessfilings.sc.gov", fee: "$110", processingTime: "Same day" },
  SD: { name: "South Dakota", url: "https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx", fee: "$150", processingTime: "Same day" },
  TN: { name: "Tennessee", url: "https://tnbear.tn.gov", fee: "$300", processingTime: "Same day" },
  TX: { name: "Texas", url: "https://www.sos.state.tx.us/corp/businessstructure.shtml", fee: "$300", processingTime: "Same day" },
  UT: { name: "Utah", url: "https://www.utah.gov/business/register.html", fee: "$54", processingTime: "Same day" },
  VT: { name: "Vermont", url: "https://www.vtsosonline.com/online/BusinessInquire/", fee: "$125", processingTime: "Same day" },
  VA: { name: "Virginia", url: "https://www.scc.virginia.gov/clk/busresearch.aspx", fee: "$100", processingTime: "Same day" },
  WA: { name: "Washington", url: "https://www.sos.wa.gov/corps/", fee: "$200", processingTime: "Same day" },
  WV: { name: "West Virginia", url: "https://apps.wv.gov/SOS/BusinessEntitySearch/", fee: "$100", processingTime: "Same day" },
  WI: { name: "Wisconsin", url: "https://www.wdfi.org/corporations/", fee: "$130", processingTime: "Same day" },
  WY: { name: "Wyoming", url: "https://wyobiz.wyo.gov/Business/FilingSearch.aspx", fee: "$100", processingTime: "Same day" },
  DC: { name: "Washington D.C.", url: "https://dcra.dc.gov/service/register-business", fee: "$99", processingTime: "Same day" },
};

const ENTITY_TYPES = [
  { id: "llc", label: "LLC", description: "Limited Liability Company — most popular for small businesses" },
  { id: "sole_prop", label: "Sole Proprietorship", description: "Simplest structure, no state filing required" },
  { id: "s_corp", label: "S-Corporation", description: "Pass-through taxation with corporate structure" },
  { id: "c_corp", label: "C-Corporation", description: "Best for investors and venture funding" },
];

type Step = "entity" | "state" | "ein" | "status";

interface BusinessSetupState {
  entityType: string;
  state: string;
  einStatus: "pending" | "filed" | "received";
  entityStatus: "pending" | "filed" | "approved";
  bankStatus: "pending" | "opened";
}

const IconExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 600, margin: "0 auto", padding: "24px 16px" },
  card: { background: "#0d0d1a", border: "1px solid #ffffff18", borderRadius: 16, padding: 28, marginBottom: 12 },
  heading: { color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 6 },
  sub: { color: "#ffffff66", fontSize: 13, marginBottom: 20, lineHeight: 1.6 },
  btn: { width: "100%", background: "linear-gradient(135deg,#00D4FF,#A855F7)", border: "none", borderRadius: 10, padding: "11px", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnOutline: { width: "100%", background: "transparent", border: "1px solid #ffffff22", borderRadius: 10, padding: "11px", color: "#ffffff88", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  label: { color: "#00D4FF", fontSize: 11, letterSpacing: 3, marginBottom: 8, textAlign: "center" },
  row: { display: "flex", gap: 10 },
  select: { width: "100%", padding: "10px 12px", background: "#060612", border: "1px solid #ffffff22", borderRadius: 10, color: "#fff", fontSize: 13, marginBottom: 16 },
  infoBox: { background: "#060612", border: "1px solid #ffffff15", borderRadius: 12, padding: "14px 16px", marginBottom: 16 },
  link: { color: "#00D4FF", fontSize: 12, display: "flex", alignItems: "center", gap: 4, textDecoration: "none", marginTop: 6 },
  progressBar: { height: 6, background: "#ffffff15", borderRadius: 99, overflow: "hidden", marginTop: 8 },
};

export default function BusinessLaunchFlow({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("entity");
  const [saving, setSaving] = useState(false);
  const [setup, setSetup] = useState<BusinessSetupState>({
    entityType: "",
    state: "",
    einStatus: "pending",
    entityStatus: "pending",
    bankStatus: "pending",
  });

  const selectedState = STATE_SOS[setup.state];

  const stepLabels: Record<Step, string> = {
    entity: "STEP 1 OF 4 · BUSINESS TYPE",
    state: "STEP 2 OF 4 · STATE",
    ein: "STEP 3 OF 4 · EIN NUMBER",
    status: "STEP 4 OF 4 · TRACK PROGRESS",
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      // Persist progress to the API (best-effort — don't block navigation on failure)
      await fetch(`/api/workspaces/${workspaceId}/business-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setup),
      }).catch(() => {
        // Silently swallow — we still navigate even if the save fails
      });
    } finally {
      setSaving(false);
      router.push(`/dashboard/${workspaceId}`);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.label}>{stepLabels[step]}</div>

      {step === "entity" && (
        <div style={s.card}>
          <div style={s.heading}>What type of business are you forming?</div>
          <div style={s.sub}>This affects your taxes, liability, and paperwork.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ENTITY_TYPES.map((et) => (
              <button key={et.id} onClick={() => setSetup((p) => ({ ...p, entityType: et.id }))}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  background: setup.entityType === et.id ? "#00D4FF15" : "#060612",
                  border: `1.5px solid ${setup.entityType === et.id ? "#00D4FF" : "#ffffff18"}` }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{et.label}</div>
                <div style={{ color: "#ffffff55", fontSize: 12, marginTop: 2 }}>{et.description}</div>
              </button>
            ))}
          </div>
          <button style={{ ...s.btn, opacity: setup.entityType ? 1 : 0.4 }} disabled={!setup.entityType} onClick={() => setStep("state")}>
            Continue →
          </button>
        </div>
      )}

      {step === "state" && (
        <div style={s.card}>
          <div style={s.heading}>Which state do you want to register in?</div>
          <div style={s.sub}>Most businesses register in their home state. Delaware and Wyoming are popular for tax advantages.</div>
          <select style={s.select} value={setup.state} onChange={(e) => setSetup((p) => ({ ...p, state: e.target.value }))}>
            <option value="">Select a state...</option>
            {Object.entries(STATE_SOS).map(([code, info]) => (
              <option key={code} value={code}>{info.name}</option>
            ))}
          </select>
          {selectedState && (
            <div style={s.infoBox}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#ffffff55", fontSize: 12 }}>Filing fee</span>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{selectedState.fee}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#ffffff55", fontSize: 12 }}>Processing time</span>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{selectedState.processingTime}</span>
              </div>
              <a href={selectedState.url} target="_blank" rel="noopener noreferrer" style={s.link}>
                Go to {selectedState.name} Secretary of State <IconExternal />
              </a>
            </div>
          )}
          <div style={s.row}>
            <button style={s.btnOutline} onClick={() => setStep("entity")}>← Back</button>
            <button style={{ ...s.btn, opacity: setup.state ? 1 : 0.4 }} disabled={!setup.state} onClick={() => setStep("ein")}>Continue →</button>
          </div>
        </div>
      )}

      {step === "ein" && (
        <div style={s.card}>
          <div style={s.heading}>Get your EIN (Tax ID)</div>
          <div style={s.sub}>Your EIN is your business federal tax ID. Free and takes about 15 minutes through the IRS.</div>
          <div style={{ ...s.infoBox, border: "1.5px solid #00D4FF44", marginBottom: 12 }}>
            <div style={{ color: "#00D4FF", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Free — Apply directly with the IRS</div>
            <ul style={{ color: "#ffffff88", fontSize: 12, paddingLeft: 16, lineHeight: 1.8, margin: 0 }}>
              <li>Instant approval — get your EIN same day</li>
              <li>Available Mon–Fri, 7am–10pm ET</li>
              <li>You will need your SSN or ITIN</li>
              <li>Have your business name and address ready</li>
            </ul>
            <a href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
              target="_blank" rel="noopener noreferrer" style={{ ...s.link, marginTop: 12, fontWeight: 700 }}>
              Apply on IRS.gov (Free) <IconExternal />
            </a>
          </div>
          <div style={{ ...s.infoBox, marginBottom: 20 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Premium — We file it for you · $49</div>
            <div style={{ color: "#ffffff55", fontSize: 12, marginBottom: 10 }}>
              Our partner handles the SS-4 submission and delivers your EIN directly.
            </div>
            <button style={{ ...s.btnOutline, padding: "8px" }} onClick={() => alert("Premium EIN filing coming soon. Use the free IRS option for now.")}>
              File for me — $49
            </button>
          </div>
          <div style={s.row}>
            <button style={s.btnOutline} onClick={() => setStep("state")}>← Back</button>
            <button style={s.btn} onClick={() => setStep("status")}>Track my progress →</button>
          </div>
        </div>
      )}

      {step === "status" && (
        <div style={s.card}>
          <div style={s.heading}>Business Launch Tracker</div>
          <div style={s.sub}>Mark each step as you complete it. Come back anytime to update.</div>

          <div style={{ ...s.infoBox, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>
                {setup.entityType.toUpperCase()} — {selectedState?.name ?? setup.state}
              </div>
              <select value={setup.entityStatus} onChange={(e) => setSetup((p) => ({ ...p, entityStatus: e.target.value as any }))}
                style={{ fontSize: 11, background: "#0d0d1a", border: "1px solid #ffffff22", color: "#fff", borderRadius: 6, padding: "3px 6px" }}>
                <option value="pending">Not started</option>
                <option value="filed">Filed — awaiting approval</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            {selectedState && (
              <a href={selectedState.url} target="_blank" rel="noopener noreferrer" style={s.link}>
                Open {selectedState.name} filing portal <IconExternal />
              </a>
            )}
          </div>

          <div style={{ ...s.infoBox, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>EIN / Federal Tax ID</div>
              <select value={setup.einStatus} onChange={(e) => setSetup((p) => ({ ...p, einStatus: e.target.value as any }))}
                style={{ fontSize: 11, background: "#0d0d1a", border: "1px solid #ffffff22", color: "#fff", borderRadius: 6, padding: "3px 6px" }}>
                <option value="pending">Not started</option>
                <option value="filed">Applied — pending</option>
                <option value="received">Received</option>
              </select>
            </div>
            <a href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
              target="_blank" rel="noopener noreferrer" style={s.link}>
              Apply on IRS.gov <IconExternal />
            </a>
          </div>

          <div style={{ ...s.infoBox, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>Business Bank Account</div>
              <select value={setup.bankStatus} onChange={(e) => setSetup((p) => ({ ...p, bankStatus: e.target.value as any }))}
                style={{ fontSize: 11, background: "#0d0d1a", border: "1px solid #ffffff22", color: "#fff", borderRadius: 6, padding: "3px 6px" }}>
                <option value="pending">Not opened yet</option>
                <option value="opened">Account opened</option>
              </select>
            </div>
          </div>

          {(() => {
            const done = [setup.entityStatus === "approved", setup.einStatus === "received", setup.bankStatus === "opened"].filter(Boolean).length;
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#ffffff55", fontSize: 12, marginBottom: 4 }}>
                  <span>Overall progress</span><span>{done}/3 complete</span>
                </div>
                <div style={s.progressBar}>
                  <div style={{ height: "100%", width: `${(done / 3) * 100}%`, background: "linear-gradient(90deg,#00D4FF,#A855F7)", transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })()}

          <button
            style={{ ...s.btn, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={handleSaveAndContinue}
          >
            {saving ? "Saving…" : "Save Progress →"}
          </button>
        </div>
      )}
    </div>
  );
}