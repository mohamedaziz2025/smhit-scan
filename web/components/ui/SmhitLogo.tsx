/** Identité visuelle SMHIT recréée (§12) — pas de logo tiers. */
export function SmhitLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl shadow-brand"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #FF8A3D, #F26A21, #D2551A)",
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z"
          fill="white"
          fillOpacity={0.95}
        />
      </svg>
    </div>
  );
}
