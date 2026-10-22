// components/office/OfficeIsometric.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentDef } from "@/types";

function toIso(wx: number, wy: number) {
  return { sx: (wx - wy) * 50, sy: (wx + wy) * 25 };
}
const OX = 520, OY = 100;

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#00D4FF", Sales: "#FF6B35", Marketing: "#A855F7", Operations: "#10B981",
};
const DEPT_SKIN: Record<string, string> = {
  Engineering: "#FFD5A8", Sales: "#F4A261", Marketing: "#C9A0DC", Operations: "#A8D5A2",
};
const HAIR_COLORS: Record<string, string> = {
  nia: "#C8A96E", cto: "#1a1a2e", pm: "#8B4513", frontend: "#FFD700", backend: "#2F4F4F",
  devops: "#696969", qa: "#8B0000", designer: "#FF69B4", vpsales: "#000080", sdr: "#006400",
  csm: "#4B0082", cmo: "#FF4500", content: "#20B2AA", ads: "#B8860B", email: "#800000",
  scout: "#2E8B57", coo: "#1C1C1C", cfo: "#556B2F", hr: "#C71585", legal: "#191970",
};

const DEPT_AGENT_SLUGS: Record<string, string[]> = {
  Engineering: ["cto","pm","frontend","backend","devops","qa","designer"],
  Sales: ["vpsales","sdr","csm"],
  Marketing: ["cmo","content","ads","email","scout"],
  Operations: ["coo","cfo","hr","legal"],
};

// World positions for each agent slot per department
const DEPT_WORLD: Record<string, Array<{wx:number;wy:number}>> = {
  Engineering: [
    {wx:1.5,wy:1.5},{wx:2.5,wy:1.5},{wx:3.5,wy:1.5},
    {wx:4.5,wy:1.5},{wx:1.5,wy:2.5},{wx:2.5,wy:2.5},{wx:3.5,wy:2.5},
  ],
  Sales: [{wx:7.5,wy:1.5},{wx:8.5,wy:1.5},{wx:7.5,wy:2.5}],
  Marketing: [
    {wx:1.5,wy:5.5},{wx:2.5,wy:5.5},{wx:3.5,wy:5.5},{wx:4.5,wy:5.5},{wx:5.5,wy:5.5},
  ],
  Operations: [{wx:7.5,wy:5.5},{wx:8.5,wy:5.5},{wx:7.5,wy:6.5},{wx:8.5,wy:6.5}],
};
const NIA_POS = {wx:5.0,wy:-1.5};

const ROOMS = [
  {dept:"Engineering", wx:0, wy:0, ww:6, wh:4, color:"#00D4FF"},
  {dept:"Sales",       wx:7, wy:0, ww:3, wh:4, color:"#FF6B35"},
  {dept:"Marketing",   wx:0, wy:5, ww:7, wh:3, color:"#A855F7"},
  {dept:"Operations",  wx:8, wy:5, ww:2, wh:3, color:"#10B981"},
];

function IsoAgent({agent,color,skinTone,isActive,isBusy,isLocked,onSelect,scale=1}:{
  agent:AgentDef;color:string;skinTone:string;
  isActive:boolean;isBusy:boolean;isLocked:boolean;
  onSelect:(a:AgentDef)=>void;scale?:number;
}) {
  const [walkFrame,setWalkFrame] = useState(0);
  const [isWalking,setIsWalking] = useState(false);
  const [jitter,setJitter] = useState({x:0,y:0});
  const walkRef = useRef<ReturnType<typeof setInterval>>();
  const moveRef = useRef<ReturnType<typeof setTimeout>>();
  const hairColor = HAIR_COLORS[agent.slug] ?? "#1a1a2e";

  useEffect(() => {
    if (isWalking) walkRef.current = setInterval(()=>setWalkFrame(f=>(f+1)%4),180);
    else { clearInterval(walkRef.current); setWalkFrame(0); }
    return ()=>clearInterval(walkRef.current);
  },[isWalking]);

  useEffect(() => {
    const wander = () => {
      if (!isBusy && !isActive) {
        setJitter({x:(Math.random()-.5)*12,y:(Math.random()-.5)*8});
        setIsWalking(true);
        setTimeout(()=>setIsWalking(false),700);
      }
      moveRef.current = setTimeout(wander,3000+Math.random()*4000);
    };
    moveRef.current = setTimeout(wander,Math.random()*3000);
    return ()=>clearTimeout(moveRef.current);
  },[isBusy,isActive]);

  const lL=walkFrame%2===0?-6:6, lR=walkFrame%2===0?6:-6;
  const aL=walkFrame%2===0?8:-8, aR=walkFrame%2===0?-8:8;
  const glow = isActive
    ? `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 10px ${color}88)`
    : isBusy ? `drop-shadow(0 0 3px ${color}88)` : "none";

  return (
    <div onClick={()=>onSelect(agent)} style={{
      position:"absolute", transform:`translate(${jitter.x}px,${jitter.y}px)`,
      transition:"transform 0.8s ease",
      display:"flex",flexDirection:"column",alignItems:"center",
      cursor:"pointer", opacity:isLocked?.45:1,
      filter:isLocked?"grayscale(0.8)":"none",
      userSelect:"none", zIndex:isActive?20:5,
    }}>
      {isActive && (
        <div style={{position:"absolute",inset:-5,borderRadius:"50%",
          border:`2px solid ${color}`,animation:"pulseRing 1.5s ease-out infinite",
          pointerEvents:"none"}} />
      )}
      <svg width={34*scale} height={56*scale} viewBox="0 0 34 56"
        style={{filter:glow,transition:"filter 0.3s"}}>
        <ellipse cx={17} cy={54} rx={9} ry={2} fill="#00000044"/>
        <g transform={`rotate(${lL},14,38)`}>
          <rect x={10} y={38} width={6} height={14} rx={3} fill={color}/>
          <ellipse cx={13} cy={52} rx={4} ry={2} fill="#111"/>
        </g>
        <g transform={`rotate(${lR},20,38)`}>
          <rect x={18} y={38} width={6} height={14} rx={3} fill={color}/>
          <ellipse cx={21} cy={52} rx={4} ry={2} fill="#111"/>
        </g>
        <rect x={9} y={24} width={16} height={16} rx={4} fill={color}/>
        <rect x={14} y={19} width={6} height={7} rx={3} fill={skinTone}/>
        <g transform={`rotate(${aL},9,26)`}>
          <rect x={3} y={26} width={6} height={11} rx={3} fill={color}/>
          <circle cx={6} cy={37} r={2.5} fill={skinTone}/>
        </g>
        <g transform={`rotate(${aR},25,26)`}>
          <rect x={25} y={26} width={6} height={11} rx={3} fill={color}/>
          <circle cx={28} cy={37} r={2.5} fill={skinTone}/>
        </g>
        <circle cx={17} cy={14} r={9} fill={skinTone}/>
        <path d="M8,11 Q9,3 17,3 Q25,3 26,11 Q23,6 17,6 Q11,6 8,11Z" fill={hairColor}/>
        <circle cx={14} cy={13} r={1.5} fill="#111"/>
        <circle cx={20} cy={13} r={1.5} fill="#111"/>
        <circle cx={14.6} cy={12.5} r={0.5} fill="#fff"/>
        <circle cx={20.6} cy={12.5} r={0.5} fill="#fff"/>
        <path d={isActive?"M13,17 Q17,21 21,17":"M14,17 Q17,20 20,17"}
          stroke="#111" strokeWidth={1.2} fill="none" strokeLinecap="round"/>
        {isBusy&&!isActive&&(
          <g><circle cx={28} cy={4} r={5} fill="#FFD700"/><text x={28} y={7.5} textAnchor="middle" fontSize={6} fill="#000">⚡</text></g>
        )}
      </svg>
      <div style={{textAlign:"center",pointerEvents:"none",marginTop:1}}>
        <div style={{fontSize:8,fontWeight:700,color,whiteSpace:"nowrap",fontFamily:"monospace",textShadow:`0 0 6px ${color}`}}>
          {agent.name}
        </div>
        <div style={{fontSize:6.5,color:"#ffffff44",whiteSpace:"nowrap",fontFamily:"monospace"}}>
          {agent.role}
        </div>
      </div>
      {isLocked&&(
        <div style={{position:"absolute",top:0,right:-6,background:"#ffffff22",borderRadius:"50%",width:12,height:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7}}>🔒</div>
      )}
    </div>
  );
}

export default function OfficeIsometric({
  agents, nia, activeAgent, busyAgents, allowedSlugs, onSelect,
}:{
  agents:AgentDef[];nia:AgentDef;activeAgent:AgentDef|null;
  busyAgents:Set<string>;allowedSlugs:Set<string>;onSelect:(a:AgentDef)=>void;
}) {
  const agentPositions: Array<{agent:AgentDef;wx:number;wy:number;color:string;skinTone:string}> = [];
  for (const dept of Object.keys(DEPT_AGENT_SLUGS)) {
    const slugs = DEPT_AGENT_SLUGS[dept];
    const positions = DEPT_WORLD[dept];
    const color = DEPT_COLORS[dept];
    const skinTone = DEPT_SKIN[dept];
    slugs.forEach((slug,i) => {
      const agent = agents.find(a=>a.slug===slug);
      if (agent && positions[i]) agentPositions.push({agent,...positions[i],color,skinTone});
    });
  }

  return (
    <div style={{
      position:"relative", width:"100%", height:"100%", overflow:"auto",
      background:"radial-gradient(ellipse at 50% 20%, #0d0d25 0%, #060612 70%)",
    }}>
      <style>{`@keyframes pulseRing{0%{transform:scale(1);opacity:1;}100%{transform:scale(2.5);opacity:0;}}`}</style>

      {/* SVG: rooms + desks */}
      <svg style={{position:"absolute",left:0,top:0,width:"100%",height:"900px",overflow:"visible",pointerEvents:"none"}}
        viewBox="0 0 1040 900" preserveAspectRatio="xMidYMid meet">

        {/* Reception */}
        {(()=>{
          const rx=3.5,ry=-2.5,rw=3,rh=1.8,rc="#F5C842";
          const pts = [[rx,ry],[rx+rw,ry],[rx+rw,ry+rh],[rx,ry+rh]].map(([x,y])=>{const p=toIso(x,y);return`${OX+p.sx},${OY+p.sy}`;}).join(" ");
          const ctr = toIso(rx+rw/2,ry+rh/2);
          const dk = toIso(rx+rw/2,ry+rh-0.3);
          return (
            <g key="reception">
              <polygon points={pts} fill={`${rc}12`} stroke={`${rc}80`} strokeWidth={2}/>
              <ellipse cx={OX+dk.sx} cy={OY+dk.sy} rx={30} ry={13} fill={`${rc}25`} stroke={`${rc}80`} strokeWidth={1.5}/>
              <text x={OX+ctr.sx} y={OY+ctr.sy-2} textAnchor="middle" fontSize={8} fill={`${rc}90`} fontFamily="monospace" fontWeight="700">★ RECEPTION</text>
            </g>
          );
        })()}

        {/* Dept rooms */}
        {ROOMS.map(r=>{
          const pts=[[r.wx,r.wy],[r.wx+r.ww,r.wy],[r.wx+r.ww,r.wy+r.wh],[r.wx,r.wy+r.wh]]
            .map(([x,y])=>{const p=toIso(x,y);return`${OX+p.sx},${OY+p.sy}`;}).join(" ");
          const ctr=toIso(r.wx+r.ww/2,r.wy+r.wh/2);
          // Vertical grid lines
          const vLines=Array.from({length:Math.floor(r.ww)-1},(_,i)=>{
            const a=toIso(r.wx+i+1,r.wy),b=toIso(r.wx+i+1,r.wy+r.wh);
            return <line key={`v${i}`} x1={OX+a.sx} y1={OY+a.sy} x2={OX+b.sx} y2={OY+b.sy} stroke={`${r.color}18`} strokeWidth={0.5}/>;
          });
          const hLines=Array.from({length:Math.floor(r.wh)-1},(_,i)=>{
            const a=toIso(r.wx,r.wy+i+1),b=toIso(r.wx+r.ww,r.wy+i+1);
            return <line key={`h${i}`} x1={OX+a.sx} y1={OY+a.sy} x2={OX+b.sx} y2={OY+b.sy} stroke={`${r.color}18`} strokeWidth={0.5}/>;
          });
          return (
            <g key={r.dept}>
              <polygon points={pts} fill={`${r.color}0d`} stroke={`${r.color}55`} strokeWidth={1.5}/>
              {vLines}{hLines}
              <text x={OX+ctr.sx} y={OY+ctr.sy+4} textAnchor="middle" fontSize={9} fill={`${r.color}60`} fontFamily="monospace" fontWeight="700" letterSpacing={1.5}>
                {r.dept.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Desk markers — small ellipses at each agent slot */}
        {agentPositions.map(({agent,wx,wy,color})=>{
          const p=toIso(wx,wy);
          return (
            <g key={`desk-${agent.slug}`}>
              <ellipse cx={OX+p.sx} cy={OY+p.sy+6} rx={16} ry={8} fill={`${color}1a`} stroke={`${color}45`} strokeWidth={1}/>
              <ellipse cx={OX+p.sx-5} cy={OY+p.sy} rx={4} ry={2.5} fill={`${color}35`} stroke={`${color}55`} strokeWidth={0.8}/>
            </g>
          );
        })}
      </svg>

      {/* DOM: agent characters */}
      {agentPositions.map(({agent,wx,wy,color,skinTone})=>{
        const pos=toIso(wx,wy);
        return (
          <div key={agent.slug} style={{
            position:"absolute",
            left: OX+pos.sx-17,
            top:  OY+pos.sy-62,
          }}>
            <IsoAgent
              agent={agent} color={color} skinTone={skinTone}
              isActive={activeAgent?.slug===agent.slug}
              isBusy={busyAgents.has(agent.slug)}
              isLocked={!allowedSlugs.has(agent.slug)}
              onSelect={onSelect}
            />
          </div>
        );
      })}

      {/* Nia */}
      {(()=>{
        const pos=toIso(NIA_POS.wx,NIA_POS.wy);
        return (
          <div style={{position:"absolute",left:OX+pos.sx-20,top:OY+pos.sy-75}}>
            <IsoAgent
              agent={nia} color="#F5C842" skinTone="#C68642"
              isActive={activeAgent?.slug===nia.slug}
              isBusy={busyAgents.has(nia.slug)}
              isLocked={!allowedSlugs.has(nia.slug)}
              onSelect={onSelect} scale={1.2}
            />
          </div>
        );
      })()}

      <div style={{
        position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",
        color:"#ffffff33",fontSize:11,fontFamily:"monospace",letterSpacing:2,
        pointerEvents:"none",textAlign:"center",
      }}>
        ISOMETRIC VIEW · Click any agent to chat
      </div>
    </div>
  );
}
