export default function UFPSLogo({ size = "md", light = false }) {
  const cfg = {
    sm: { icon: 38, titleSize: "11px", subSize: "9px", gap: 10 },
    md: { icon: 50, titleSize: "13px", subSize: "10px", gap: 12 },
    lg: { icon: 68, titleSize: "17px", subSize: "12px", gap: 14 },
  };
  const s = cfg[size] || cfg.md;

  const gridColor = light ? "rgba(255,255,255,0.25)" : "#7B241C";
  const emptyFill = light ? "rgba(255,255,255,0.15)" : "white";
  const bg = light ? "rgba(255,255,255,0.15)" : "#C0392B";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap }}>
      {/* Logotipo aproximado UFPS: cuadrícula 3×3 con forma de U */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 54 54"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="54" height="54" rx="5" fill={bg} />
        {/* Líneas de cuadrícula */}
        <line x1="18" y1="0" x2="18" y2="54" stroke={gridColor} strokeWidth="2" />
        <line x1="36" y1="0" x2="36" y2="54" stroke={gridColor} strokeWidth="2" />
        <line x1="0" y1="18" x2="54" y2="18" stroke={gridColor} strokeWidth="2" />
        <line x1="0" y1="36" x2="54" y2="36" stroke={gridColor} strokeWidth="2" />
        {/* Celdas vacías (blancas) → forman la U */}
        <rect x="19" y="1" width="16" height="16" fill={emptyFill} />
        <rect x="19" y="19" width="16" height="16" fill={emptyFill} />
      </svg>

      <div>
        <p
          style={{
            fontWeight: 700,
            fontSize: s.titleSize,
            color: light ? "white" : "#111827",
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          Universidad Francisco
          <br />
          de Paula Santander
        </p>
        <p
          style={{
            fontSize: s.subSize,
            color: light ? "rgba(255,255,255,0.65)" : "#6B7280",
            margin: 0,
            marginTop: 2,
          }}
        >
          Vigilada Mineducación
        </p>
      </div>
    </div>
  );
}
