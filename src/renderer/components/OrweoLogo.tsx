/**
 * ORWEO Wortmarke – aus der ORWEO-Website übernommen (Design-Parität).
 * Charakteristisches E: drei horizontale Balken (weiß / champagner / weiß),
 * keine vertikale Linie beim E.
 */
export function OrweoLogo({
  className = "h-6",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark" | "champagne";
}) {
  const mainColor =
    variant === "dark" ? "#0B0B0D" : variant === "champagne" ? "#D4C3A1" : "#F3F3F0";

  const champagne = "#D4C3A1";
  const eTopColor = variant === "champagne" ? champagne : mainColor;
  const eMiddleColor = champagne;
  const eBottomColor = variant === "champagne" ? champagne : mainColor;

  return (
    <svg
      viewBox="0 0 270 50"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ORWEO"
      preserveAspectRatio="xMidYMid meet"
      style={{ transform: "scaleY(0.75)" }}
    >
      <rect x="4" y="9" width="38" height="32" rx="10" stroke={mainColor} strokeWidth="4" fill="none" />
      <g>
        <path d="M62 29V41" stroke={mainColor} strokeWidth="4" strokeLinecap="square" />
        <path
          d="M62 9H78C84 9 88 13 88 19V20C88 26 84 29 78 29H62"
          stroke={mainColor}
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M84 29L96 41" stroke={mainColor} strokeWidth="4" strokeLinecap="square" />
      </g>
      <path
        d="M108 9L118 38L129 16L140 38L150 9"
        stroke={mainColor}
        strokeWidth="4"
        strokeLinecap="square"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="170" y="9" width="28" height="4" fill={eTopColor} />
      <rect x="170" y="23" width="22" height="4" fill={eMiddleColor} />
      <rect x="170" y="38" width="28" height="4" fill={eBottomColor} />
      <rect x="220" y="9" width="38" height="32" rx="10" stroke={mainColor} strokeWidth="4" fill="none" />
    </svg>
  );
}

/**
 * ORWEO Icon – geometrisches E (drei Balken). Für kompakte Darstellungen.
 */
export function OrweoIcon({
  className = "w-8 h-8",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const bgColor = variant === "dark" ? "#F3F3F0" : "#0B0B0D";
  const barColor = variant === "dark" ? "#0B0B0D" : "#F3F3F0";
  const champagne = "#D4C3A1";

  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="ORWEO Icon">
      <rect width="64" height="64" rx="12" fill={bgColor} />
      <rect x="16" y="18" width="32" height="4" rx="2" fill={barColor} />
      <rect x="16" y="30" width="26" height="4" rx="2" fill={champagne} />
      <rect x="16" y="42" width="32" height="4" rx="2" fill={barColor} />
    </svg>
  );
}
