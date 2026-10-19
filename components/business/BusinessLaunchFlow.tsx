"use client";

import { useState } from "react";
import { CheckCircle, Circle, ExternalLink, ChevronRight, Building2, FileText, Landmark, CreditCard } from "lucide-react";

// ── State Secretary of State portal lookup ──────────────────────────────────
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

export default function BusinessLaunchFlow({ workspaceId }: { workspaceId: string }) {
  const [step, setStep] = useState<Step>("entity");
  const [setup, setSetup] = useState<BusinessSetupState>({
    entityType: "",
    state: "",
    einStatus: "pending",
    entityStatus: "pending",
    bankStatus: "pending",
  });

  const selectedState = STATE_SOS[setup.state];

  const steps = [
    { id: "entity", label: "Business Type", icon: Building2 },
    { id: "state", label: "State", icon: Landmark },
    { id: "ein", label: "EIN Number", icon: FileText },
    { id: "status", label: "Track Progress", icon: CreditCard },
  ];

  const currentStepIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Launch Your Business</h1>
        <p className="text-sm text-gray-500 mt-1">
          We'll help you register your entity, get your EIN, and track your setup.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < currentStepIdx;
          const active = i === currentStepIdx;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  done ? "text-green-600" : active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
                }`}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Icon className={`w-4 h-4 ${active ? "text-indigo-500" : "text-gray-400"}`} />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step: Entity Type */}
      {step === "entity" && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            What type of business are you forming?
          </h2>
          <div className="grid gap-3">
            {ENTITY_TYPES.map((et) => (
              <button
                key={et.id}
                onClick={() => setSetup((s) => ({ ...s, entityType: et.id }))}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  setup.entityType === et.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{et.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{et.description}</div>
              </button>
            ))}
          </div>
          <button
            disabled={!setup.entityType}
            onClick={() => setStep("state")}
            className="w-full mt-4 py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step: State */}
      {step === "state" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            Which state do you want to register in?
          </h2>
          <p className="text-xs text-gray-500">
            Most businesses register in their home state. Delaware and Wyoming are popular for tax advantages.
          </p>
          <select
            value={setup.state}
            onChange={(e) => setSetup((s) => ({ ...s, state: e.target.value }))}
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
          >
            <option value="">Select a state...</option>
            {Object.entries(STATE_SOS).map(([code, info]) => (
              <option key={code} value={code}>
                {info.name}
              </option>
            ))}
          </select>

          {selectedState && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Filing fee</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedState.fee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Processing time</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedState.processingTime}</span>
              </div>
              <a
                href={selectedState.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium pt-1 hover:underline"
              >
                Go to {selectedState.name} Secretary of State
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("entity")}
              className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
            <button
              disabled={!setup.state}
              onClick={() => setStep("ein")}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step: EIN */}
      {step === "ein" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Get your EIN (Tax ID)</h2>
          <p className="text-xs text-gray-500">
            An Employer Identification Number is your business's federal tax ID. It's free and takes about 15 minutes through the IRS.
          </p>

          <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 space-y-3">
            <div className="font-semibold text-sm text-indigo-900 dark:text-indigo-100">
              Free — Apply directly with the IRS
            </div>
            <ul className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1 list-disc list-inside">
              <li>Instant approval — get your EIN same day</li>
              <li>Available Monday–Friday, 7am–10pm ET</li>
              <li>You'll need your SSN or ITIN to apply</li>
              <li>Have your business name and address ready</li>
            </ul>
            <a
              href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 w-full justify-center py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
            >
              Apply on IRS.gov (Free)
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">
              Premium — We file it for you
            </div>
            <p className="text-xs text-gray-500">
              Our partner handles the SS-4 form submission and delivers your EIN directly. Ideal if you're outside the US or need it handled.
            </p>
            <button
              className="w-full py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => {
                // TODO: integrate Middesk or similar EIN filing API
                alert("Premium EIN filing coming soon. Use the free IRS option for now.");
              }}
            >
              File for me — $49
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("state")}
              className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("status")}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
            >
              I'll track my progress
            </button>
          </div>
        </div>
      )}

      {/* Step: Status Tracker */}
      {step === "status" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Business Launch Tracker</h2>
          <p className="text-xs text-gray-500">
            Mark each step as you complete it. Come back anytime to update your progress.
          </p>

          <div className="space-y-3">
            {/* Entity Registration */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {setup.entityType.toUpperCase()} Registration — {selectedState?.name}
                </div>
                <select
                  value={setup.entityStatus}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, entityStatus: e.target.value as any }))
                  }
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                >
                  <option value="pending">Not started</option>
                  <option value="filed">Filed — awaiting approval</option>
                  <option value="approved">Approved ✓</option>
                </select>
              </div>
              {selectedState && (
                <a
                  href={selectedState.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  Open {selectedState.name} filing portal
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* EIN */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-gray-900 dark:text-white">EIN / Federal Tax ID</div>
                <select
                  value={setup.einStatus}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, einStatus: e.target.value as any }))
                  }
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                >
                  <option value="pending">Not started</option>
                  <option value="filed">Applied — pending</option>
                  <option value="received">Received ✓</option>
                </select>
              </div>
              <a
                href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                Apply on IRS.gov
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Business Bank Account */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-gray-900 dark:text-white">Business Bank Account</div>
                <select
                  value={setup.bankStatus}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, bankStatus: e.target.value as any }))
                  }
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                >
                  <option value="pending">Not opened yet</option>
                  <option value="opened">Account opened ✓</option>
                </select>
              </div>
            </div>

            {/* Overall progress */}
            {(() => {
              const done = [
                setup.entityStatus === "approved",
                setup.einStatus === "received",
                setup.bankStatus === "opened",
              ].filter(Boolean).length;
              return (
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Overall progress</span>
                    <span>{done}/3 complete</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${(done / 3) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Save to workspace — TODO: persist to Supabase */}
          <button
            onClick={async () => {
              // TODO: POST /api/workspace/[slug]/business-setup with setup state
              alert("Progress saved to your workspace!");
            }}
            className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Save Progress
          </button>
        </div>
      )}
    </div>
  );
}
