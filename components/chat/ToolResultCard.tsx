// components/chat/ToolResultCard.tsx
export default function ToolResultCard({ toolName, input, result, color }: {
  toolName: string; input: any; result: string; color: string;
}) {
  let parsed: any = result;
  try { parsed = JSON.parse(result); } catch { /* keep as string */ }
  const isError = parsed && typeof parsed === "object" && "error" in parsed;

  return (
    <div style={{
      border: `1px solid ${isError ? "#ff444455" : color + "44"}`, borderRadius: 8,
      background: isError ? "#ff444411" : `${color}0d`, padding: "8px 10px", fontSize: 11, margin: "4px 0",
    }} className="mono">
      <div style={{ display: "flex", justifyContent: "space-between", color: isError ? "#ff6666" : color, fontWeight: 700, marginBottom: 4 }}>
        <span>{isError ? "✕" : "⚙"} {toolName}</span>
      </div>
      {input && Object.keys(input).length > 0 && (
        <div style={{ color: "#ffffff66", marginBottom: 4 }}>
          {Object.entries(input).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ")}
        </div>
      )}
      <div style={{ color: isError ? "#ff9999" : "#ffffff99", whiteSpace: "pre-wrap" }}>
        {isError ? parsed.error : typeof parsed === "string" ? parsed : JSON.stringify(parsed).slice(0, 300)}
      </div>
    </div>
  );
}
