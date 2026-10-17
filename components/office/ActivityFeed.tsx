// components/office/ActivityFeed.tsx
import type { TaskLogEntry } from "@/types";

export default function ActivityFeed({ log }: { log: TaskLogEntry[] }) {
  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #ffffff11" }}>
        <div style={{ color: "#ffffff88", fontSize: 10, letterSpacing: 2 }} className="mono">ACTIVITY LOG</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {log.map((entry, i) => (
          <div key={i} style={{ background: "#ffffff05", border: "1px solid #ffffff0a", borderRadius: 6, padding: "6px 10px", fontSize: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ color: "#00D4FF", fontWeight: 700 }}>{entry.agent}</span>
              <span style={{ color: "#ffffff33" }}>{entry.time}</span>
            </div>
            <div style={{ color: "#ffffff88", lineHeight: 1.4 }}>{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
