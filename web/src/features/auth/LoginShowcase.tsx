/*
 * Login brand pane: the headline, then a sketch of the people ScoutHub is for —
 * an analyst / recruiter at a tactics board, scouting notes on a clipboard.
 */
export function LoginShowcase() {
  return (
    <div className="flex flex-col justify-center gap-8 py-10 short:gap-5 short:py-6">
      <div>
        {/* two fixed lines */}
        <p className="font-display text-4xl font-bold leading-[1.05] lg:text-5xl xl:text-6xl short:lg:text-5xl tiny:text-4xl tiny:lg:text-4xl">
          <span className="block">Repérez le talent</span>
          <span className="block">avant tout le monde.</span>
        </p>
        <p className="mt-3 max-w-[60ch] text-lg text-muted short:text-base tiny:hidden">
          Rapports de scouts, juste valeur expliquée et carte des profils de jeu.
        </p>
      </div>

      <TacticsSketch className="h-[min(380px,40vh)] w-auto max-w-full self-end" />
    </div>
  )
}

const CHALK = 'rgb(var(--sh-fg) / 0.75)'
const SOFT = 'rgb(var(--sh-fg) / 0.35)'
const GREEN = 'rgb(var(--sh-accent))'
const BLUE = 'rgb(var(--sh-info))'
const FILL = 'rgb(var(--sh-raised))'

/** Chalk-style line drawing: tactics board on an easel, a staff member pointing at it, clipboard in hand. */
export function TacticsSketch({ className }: { className?: string }) {
  const team = [[100, 126], [128, 92], [128, 160], [158, 126], [196, 100], [204, 154], [236, 126]]
  const opponents = [[150, 78], [150, 174], [224, 92], [252, 150], [182, 126]]
  return (
    <svg viewBox="0 0 520 370" role="img"
      aria-label="Illustration : une personne du staff présente une tactique au tableau, un dossier de scouting à la main"
      className={className}
      fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* floor */}
      <path d="M24 352 H496" stroke={SOFT} strokeWidth="1.5" />

      {/* easel legs */}
      <path d="M92 214 L70 350 M250 214 L272 350 M171 214 L171 346" stroke={CHALK} strokeWidth="3" />
      <path d="M84 266 H258" stroke={SOFT} strokeWidth="2" />

      {/* tactics board */}
      <rect x="38" y="32" width="266" height="184" rx="10" fill={FILL} stroke={CHALK} strokeWidth="2.5" />
      <rect x="56" y="50" width="230" height="148" rx="4" fill="rgb(var(--sh-accent) / 0.08)" stroke="rgb(var(--sh-accent) / 0.7)" strokeWidth="1.6" />
      <path d="M171 50 V198" stroke="rgb(var(--sh-accent) / 0.7)" strokeWidth="1.4" />
      <circle cx="171" cy="124" r="20" stroke="rgb(var(--sh-accent) / 0.7)" strokeWidth="1.4" />
      <rect x="56" y="94" width="28" height="60" stroke="rgb(var(--sh-accent) / 0.7)" strokeWidth="1.4" />
      <rect x="258" y="94" width="28" height="60" stroke="rgb(var(--sh-accent) / 0.7)" strokeWidth="1.4" />
      {/* chalk tray */}
      <path d="M48 222 H294" stroke={CHALK} strokeWidth="3" />

      {/* players: our team (dots), opponents (crosses) */}
      {team.map(([x, y]) => <circle key={`t${x}-${y}`} cx={x} cy={y} r="5.5" fill={GREEN} />)}
      {opponents.map(([x, y]) => (
        <path key={`o${x}-${y}`} d={`M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}`} stroke={BLUE} strokeWidth="2.2" />
      ))}
      {/* runs */}
      <path d="M160 120 Q176 96 190 100" stroke={CHALK} strokeWidth="1.8" strokeDasharray="4 4" />
      <path d="M186 95 L191 100 L185 104" stroke={CHALK} strokeWidth="1.8" />
      <path d="M206 150 Q226 146 232 132" stroke={CHALK} strokeWidth="1.8" strokeDasharray="4 4" />
      <path d="M227 133 L232 131 L234 137" stroke={CHALK} strokeWidth="1.8" />

      {/* person: legs and shoes */}
      <rect x="368" y="236" width="26" height="104" rx="9" fill={FILL} stroke={CHALK} strokeWidth="2" />
      <rect x="406" y="236" width="26" height="104" rx="9" fill={FILL} stroke={CHALK} strokeWidth="2" />
      <path d="M362 344 Q378 334 396 344 M404 344 Q422 334 440 344" stroke={CHALK} strokeWidth="3" />

      {/* jacket */}
      <path d="M368 130 Q400 116 432 130 L444 240 Q400 250 356 240 Z" fill="rgb(var(--sh-surface))" stroke={CHALK} strokeWidth="2.5" />
      {/* collar, lanyard and badge */}
      <path d="M390 122 L400 146 L410 122" stroke={GREEN} strokeWidth="2" />
      <rect x="394" y="146" width="12" height="16" rx="2" fill={GREEN} />

      {/* arm pointing at the board, marker in hand */}
      <path d="M372 138 Q352 166 334 168 Q320 162 310 150" stroke={CHALK} strokeWidth="11" />
      <path d="M372 138 Q352 166 334 168 Q320 162 310 150" stroke={FILL} strokeWidth="6.5" />
      <path d="M309 149 L294 134" stroke={GREEN} strokeWidth="4" />

      {/* head */}
      <path d="M400 108 V120" stroke={CHALK} strokeWidth="6" />
      <circle cx="400" cy="86" r="22" fill={FILL} stroke={CHALK} strokeWidth="2.5" />
      <path d="M378 84 Q380 60 402 60 Q424 62 422 86 Q414 72 398 72 Q386 74 378 84 Z" fill="rgb(var(--sh-fg) / 0.7)" />
      <path d="M392 92 Q396 96 401 94" stroke={CHALK} strokeWidth="1.8" />

      {/* clipboard held against the body, scouting notes */}
      <g transform="rotate(-8 432 205)">
        <rect x="404" y="160" width="62" height="86" rx="5" fill="rgb(var(--sh-fg) / 0.9)" />
        <rect x="422" y="154" width="26" height="12" rx="3" fill={CHALK} />
        <path d="M414 182 L418 186 L425 178 M432 182 H456 M414 200 L418 204 L425 196 M432 200 H452 M414 218 H456 M414 230 H444"
          stroke="rgb(var(--sh-bg))" strokeWidth="2.4" />
      </g>
      {/* arm holding it */}
      <path d="M428 138 Q452 176 440 208" stroke={CHALK} strokeWidth="11" />
      <path d="M428 138 Q452 176 440 208" stroke={FILL} strokeWidth="6.5" />
      <circle cx="438" cy="212" r="7" fill={FILL} stroke={CHALK} strokeWidth="2" />
    </svg>
  )
}
