export default function UFPSLogo({ size = "md", light = false }) {
  const cfg = {
    sm: { icon: 38, titleSize: "11px", subSize: "9px", gap: 10 },
    md: { icon: 50, titleSize: "13px", subSize: "10px", gap: 12 },
    lg: { icon: 68, titleSize: "17px", subSize: "12px", gap: 14 },
  };
  const s = cfg[size] || cfg.md;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap }}>
      <img
        src="/ufps-logo.png"
        alt="Logo UFPS"
        width={s.icon}
        height={s.icon}
        style={{ objectFit: "contain", borderRadius: 4 }}
      />

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
