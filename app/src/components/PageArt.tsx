// One drawn illustration per tool page, sitting beside the page title.
// Each one shows the job the page does, using the page's own sample case,
// and builds itself in a few calm steps (see styles/art.css).

import type { CSSProperties, ReactNode } from "react";
import "../styles/art.css";

const step = (s: number) => ({ "--s": s }) as CSSProperties;

function Art({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="art" role="img" aria-label={label}>
      <svg viewBox="0 0 460 360" aria-hidden="true" focusable="false">
        {children}
      </svg>
    </figure>
  );
}

/** A soft drop shadow for a sheet of paper. */
const Shadow = ({ x, y, w, h, r = 10 }: { x: number; y: number; w: number; h: number; r?: number }) => (
  <rect className="art-shadow" x={x + 7} y={y + 10} width={w} height={h} rx={r} />
);

/** Quote Check: a quotation that says "3 kW", and a lens that does the arithmetic. */
export function QuoteArt() {
  return (
    <Art label="A solar quotation under a magnifying glass: it says 3 kW, but five 540 watt panels make 2.70 kWp. Grade F.">
      <g className="art-step" style={step(0)}>
        <g transform="rotate(-4 190 185)">
          <Shadow x={56} y={20} w={250} h={310} />
          <rect className="art-sheet" x={56} y={20} width={250} height={310} rx={10} />
          <text className="art-t art-t--strong" x={76} y={52}>QUOTATION</text>
          <text className="art-t" x={286} y={52} textAnchor="end">BRS/Q/1187</text>
          <line className="art-hair" x1={76} y1={64} x2={286} y2={64} />
          {[
            [110, "5 × 540 Wp"],
            [90, "1 inverter"],
            [120, "1 set"],
            [80, "1 lot"],
            [100, "1 job"],
          ].map(([w, q], i) => (
            <g key={i}>
              <line className="art-bar" x1={76} y1={88 + i * 24} x2={76 + Number(w)} y2={88 + i * 24} />
              <text className="art-t" x={286} y={92 + i * 24} textAnchor="end">{q}</text>
            </g>
          ))}
          <line className="art-hair" x1={76} y1={212} x2={286} y2={212} />
          <text className="art-t" x={76} y={238}>System capacity</text>
          <text className="art-t art-t--strong" x={286} y={238} textAnchor="end">3 kW</text>
          <text className="art-t" x={76} y={262}>Grand total</text>
          <text className="art-t art-t--strong" x={286} y={262} textAnchor="end">₹2,41,256</text>
          <text className="art-t" x={76} y={286}>Advance</text>
          <text className="art-t art-t--bad" x={286} y={286} textAnchor="end">70%</text>
          <path className="art-ink" d="M78 312c12-10 20 6 30-2s14-12 22-2 14 2 22-4" />
        </g>
      </g>

      <g className="art-step" style={step(2)}>
        <g transform="rotate(5 96 296)">
          <rect className="art-note" x={20} y={272} width={156} height={58} rx={4} />
          <text className="art-t art-t--strong" x={34} y={296}>Non-DCR panels</text>
          <text className="art-t art-t--bad" x={34} y={316}>subsidy at risk</text>
        </g>
      </g>

      <g className="art-step" style={step(1)}>
        <g className="art-float">
          <line className="art-handle" x1={388} y1={246} x2={432} y2={292} />
          <circle className="art-lens" cx={344} cy={202} r={64} />
          <circle className="art-lens-ring" cx={344} cy={202} r={56} />
          <text className="art-big" x={344} y={198} textAnchor="middle">3 kW</text>
          <line className="art-strike" x1={306} y1={188} x2={382} y2={188} pathLength={1} />
          <text className="art-t art-t--neel" x={344} y={226} textAnchor="middle">= 2.70 kWp</text>
        </g>
      </g>

      <g className="art-step art-step--stamp" style={step(3)}>
        <g transform="rotate(-8 398 66)">
          <circle className="art-stamp" cx={398} cy={66} r={32} />
          <circle className="art-stamp art-stamp--thin" cx={398} cy={66} r={26} />
          <text className="art-stamp-t" x={398} y={78} textAnchor="middle">F</text>
        </g>
      </g>
    </Art>
  );
}

/** Bill Audit: a net-metering bill that forgot the export units, beside the meter that counted them. */
export function BillArt() {
  return (
    <Art label="A net-metering bill that billed all 410 imported units and ignored 236 exported ones. The meter shows the export; the net should be 174 units.">
      <g className="art-step" style={step(0)}>
        <g transform="rotate(3 150 180)">
          <Shadow x={30} y={30} w={236} h={296} />
          <rect className="art-sheet" x={30} y={30} width={236} height={296} rx={10} />
          <text className="art-t art-t--strong" x={50} y={60}>NET METERING BILL</text>
          <text className="art-t" x={246} y={80} textAnchor="end">APR-2026</text>
          <line className="art-bar" x1={50} y1={76} x2={130} y2={76} />
          <line className="art-hair" x1={50} y1={94} x2={246} y2={94} />
          <text className="art-t" x={50} y={120}>Import units</text>
          <text className="art-t art-t--strong" x={246} y={120} textAnchor="end">410</text>
          <text className="art-t" x={50} y={146}>Export units</text>
          <text className="art-t art-t--strong" x={246} y={146} textAnchor="end">236</text>
          <text className="art-t" x={50} y={172}>Previous credit</text>
          <text className="art-t art-t--strong" x={246} y={172} textAnchor="end">0</text>
          <line className="art-hair" x1={50} y1={186} x2={246} y2={186} />
          <rect className="art-flag" x={42} y={194} width={212} height={30} rx={6} />
          <text className="art-t art-t--strong" x={50} y={214}>Net units billed</text>
          <text className="art-t art-t--bad" x={246} y={214} textAnchor="end">410</text>
          <text className="art-t" x={50} y={264}>Amount payable</text>
          <text className="art-t art-t--strong" x={246} y={264} textAnchor="end">₹4,374.90</text>
          <line className="art-bar" x1={50} y1={290} x2={190} y2={290} />
          <line className="art-bar" x1={50} y1={308} x2={150} y2={308} />
        </g>
      </g>

      <g className="art-step" style={step(2)}>
        <g transform="rotate(3 150 180)">
          <line className="art-strike" x1={222} y1={209} x2={250} y2={209} pathLength={1} />
          <text className="art-t art-t--good" x={246} y={242} textAnchor="end">410 − 236 = 174</text>
        </g>
      </g>

      <g className="art-step" style={step(1)}>
        <g className="art-float">
          <rect className="art-device" x={312} y={70} width={128} height={200} rx={20} />
          <rect className="art-lcd" x={328} y={92} width={96} height={56} rx={6} />
          <text className="art-lcd-t" x={416} y={124} textAnchor="end">236.0</text>
          <text className="art-lcd-s" x={416} y={140} textAnchor="end">kWh  EXPORT</text>
          <circle className="art-dial" cx={348} cy={186} r={17} />
          <path className="art-arrow art-arrow--in" d="M348 176v18m-6-6 6 6 6-6" />
          <circle className="art-dial" cx={404} cy={186} r={17} />
          <path className="art-arrow art-arrow--out art-pulse" d="M404 196v-18m-6 6 6-6 6 6" />
          <text className="art-plate" x={348} y={222} textAnchor="middle">IMP</text>
          <text className="art-plate" x={404} y={222} textAnchor="middle">EXP</text>
          <text className="art-plate" x={376} y={252} textAnchor="middle">BI-DIRECTIONAL</text>
          <circle className="art-screw" cx={326} cy={84} r={2.5} />
          <circle className="art-screw" cx={426} cy={84} r={2.5} />
          <circle className="art-screw" cx={326} cy={258} r={2.5} />
          <circle className="art-screw" cx={426} cy={258} r={2.5} />
        </g>
      </g>

      <g className="art-step" style={step(3)}>
        <rect className="art-pill art-pill--good" x={300} y={296} width={150} height={34} rx={17} />
        <path className="art-ink art-ink--good" d="M318 313l6 6 11-12" />
        <text className="art-t art-t--strong" x={344} y={318}>Letter drafted</text>
      </g>
    </Art>
  );
}

/** Compare: three quotes dropped onto one price-per-kW line with a fair band. */
export function CompareArt() {
  const cards = [
    { x: 30, y: 52, l: "A", cls: "warn", m: 84, note: "too cheap" },
    { x: 170, y: 32, l: "B", cls: "good", m: 232, note: "fair" },
    { x: 310, y: 60, l: "C", cls: "bad", m: 380, note: "overpriced" },
  ];
  return (
    <Art label="Three quotes, A, B and C, placed on one price per kW line. Only B falls inside the fair band, so B is the one to sign.">
      {cards.map((c, i) => (
        <g key={c.l} className="art-step" style={step(i * 0.6)}>
          <Shadow x={c.x} y={c.y} w={120} h={150} />
          <rect className="art-sheet" x={c.x} y={c.y} width={120} height={150} rx={10} />
          <circle className="art-chip-dot" cx={c.x + 24} cy={c.y + 26} r={12} />
          <text className="art-dot-t" x={c.x + 24} y={c.y + 30} textAnchor="middle">{c.l}</text>
          <line className="art-bar" x1={c.x + 16} y1={c.y + 58} x2={c.x + 96} y2={c.y + 58} />
          <line className="art-bar" x1={c.x + 16} y1={c.y + 78} x2={c.x + 76} y2={c.y + 78} />
          <line className="art-bar" x1={c.x + 16} y1={c.y + 98} x2={c.x + 88} y2={c.y + 98} />
          <line className="art-hair" x1={c.x + 16} y1={c.y + 116} x2={c.x + 104} y2={c.y + 116} />
          <line className="art-bar art-bar--ink" x1={c.x + 50} y1={c.y + 134} x2={c.x + 104} y2={c.y + 134} />
          <path className={`art-drop art-drop--${c.cls}`} d={`M${c.x + 60} ${c.y + 152} C ${c.x + 60} 236, ${c.m} 232, ${c.m} 286`} pathLength={1} />
        </g>
      ))}

      <g className="art-step" style={step(2)}>
        <rect className="art-band" x={182} y={268} width={100} height={36} rx={6} />
        <line className="art-axis" x1={30} y1={286} x2={430} y2={286} />
        <text className="art-t art-t--good" x={232} y={326} textAnchor="middle">fair band</text>
        <text className="art-t" x={30} y={308}>₹ per kW</text>
        {cards.map((c) => (
          <g key={c.l}>
            <circle className={`art-mark art-mark--${c.cls}`} cx={c.m} cy={286} r={9} />
            {c.cls !== "good" && (
              <text className={`art-t art-t--${c.cls === "bad" ? "bad" : "warn"}`} x={c.m} y={326} textAnchor="middle">
                {c.note}
              </text>
            )}
          </g>
        ))}
      </g>

      <g className="art-step art-step--stamp" style={step(3)}>
        <circle className="art-badge" cx={284} cy={34} r={20} />
        <path className="art-ink art-ink--paper" d="M275 34l6 6 12-13" />
      </g>
    </Art>
  );
}

/** Ask Chhat: a Hindi question, the tools the agent ran, and an answer with its working. */
export function AskArt() {
  return (
    <Art label="A question in Hindi, how much subsidy for 3 kW. The agent runs compute_subsidy and search_knowledge, and answers 78,000 rupees with its working.">
      <g className="art-step" style={step(0)}>
        <rect className="art-bubble art-bubble--me" x={160} y={24} width={270} height={60} rx={20} />
        <text className="art-deva" x={182} y={61}>3 kW पर कितनी सब्सिडी मिलेगी?</text>
      </g>

      <g className="art-step" style={step(1)}>
        <line className="art-trace" x1={52} y1={98} x2={52} y2={188} />
        <circle className="art-node" cx={52} cy={118} r={5} />
        <rect className="art-tool" x={68} y={102} width={196} height={32} rx={8} />
        <text className="art-t art-t--neel" x={82} y={123}>compute_subsidy(kw: 3)</text>
        <circle className="art-node" cx={52} cy={164} r={5} />
        <rect className="art-tool" x={68} y={148} width={254} height={32} rx={8} />
        <text className="art-t art-t--neel" x={82} y={169}>search_knowledge("PM Surya Ghar")</text>
      </g>

      <g className="art-step" style={step(2)}>
        <Shadow x={30} y={202} w={330} h={106} r={20} />
        <rect className="art-bubble" x={30} y={202} width={330} height={106} rx={20} />
        <circle className="art-sun" cx={62} cy={236} r={13} />
        <text className="art-big art-big--left" x={88} y={246}>₹78,000</text>
        <text className="art-t art-t--strong" x={52} y={276}>central subsidy for a 3 kW roof</text>
        <text className="art-t" x={52} y={294}>₹30,000 × 2 kW + ₹18,000 × 1 kW</text>
      </g>

      <g className="art-step" style={step(3)}>
        <rect className="art-pill" x={30} y={318} width={232} height={28} rx={14} />
        <text className="art-t" x={46} y={337}>Source: PM Surya Ghar rules</text>
        <g className="art-typing">
          <circle cx={392} cy={248} r={4} />
          <circle cx={406} cy={248} r={4} />
          <circle cx={420} cy={248} r={4} />
        </g>
      </g>
    </Art>
  );
}

/** For installers: a home with a sized system becomes a prepaid, verified request. */
export function InstallersArt() {
  return (
    <Art label="A home in Pune with a sized 3.27 kWp system becomes a verified request. The installer sees size and urgency; the phone number unlocks after a 1,500 rupee purchase.">
      <g className="art-step" style={step(0)}>
        <path className="art-roof" d="M22 196 L84 150 L146 196" />
        <rect className="art-sheet" x={34} y={192} width={100} height={92} rx={4} />
        <path className="art-panels" d="M46 186 l26-19 h34 l-26 19z" />
        <path className="art-panel-lines" d="M58 177 h34 M66 186 l26-19 M83 186 l26-19" />
        <rect className="art-door" x={74} y={242} width={22} height={42} rx={3} />
        <rect className="art-window" x={46} y={212} width={20} height={18} rx={2} />
        <rect className="art-window" x={104} y={212} width={20} height={18} rx={2} />
        <g className="art-float">
          <path className="art-pin" d="M84 136c-14 0-24-10-24-23 0-17 24-41 24-41s24 24 24 41c0 13-10 23-24 23z" />
          <circle className="art-pin-dot" cx={84} cy={112} r={8} />
        </g>
        <text className="art-t" x={84} y={308} textAnchor="middle">Pune 411038</text>
      </g>

      <g className="art-step" style={step(1)}>
        <path className="art-drop art-drop--neel" d="M150 230 C 168 230, 168 180, 190 180" pathLength={1} />
      </g>

      <g className="art-step" style={step(1.6)}>
        <Shadow x={190} y={44} w={246} h={272} r={14} />
        <rect className="art-sheet" x={190} y={44} width={246} height={272} rx={14} />
        <path className="art-ticket-head" d="M204 44 h218 a14 14 0 0 1 14 14 v30 h-246 v-30 a14 14 0 0 1 14 -14z" />
        <text className="art-t art-t--paper" x={208} y={72}>VERIFIED REQUEST</text>
        {[
          ["Where", "Pune, MH"],
          ["System", "3.27 kWp"],
          ["Quote", "F, ₹1.65 L at risk"],
          ["Best time", "evening"],
        ].map(([k, v], i) => (
          <g key={k}>
            <text className="art-t" x={208} y={120 + i * 30}>{k}</text>
            <text className="art-t art-t--strong" x={420} y={120 + i * 30} textAnchor="end">{v}</text>
          </g>
        ))}
        <rect className="art-lockrow" x={204} y={238} width={218} height={60} rx={10} />
        <rect className="art-lock" x={218} y={258} width={20} height={16} rx={3} />
        <path className="art-ink" d="M222 258v-5a6 6 0 0 1 12 0v5" />
        <text className="art-t art-t--strong" x={250} y={264}>90•• ••• •••</text>
        <text className="art-t" x={250} y={284}>unlocks after purchase</text>
      </g>

      <g className="art-step art-step--stamp" style={step(3)}>
        <g transform="rotate(8 384 30)">
          <path className="art-tag" d="M316 14 h120 a8 8 0 0 1 8 8 v26 a8 8 0 0 1 -8 8 h-120 l-16 -21z" />
          <circle className="art-tag-hole" cx={316} cy={35} r={4} />
          <text className="art-t art-t--strong" x={328} y={40}>₹1,500 prepaid</text>
        </g>
      </g>
    </Art>
  );
}

/** Built with AI: two briefs go in, Claude Code works through the stages, a rooftop startup comes out. */
export function BuiltArt() {
  const orbit = ["research", "code", "tests", "deck"];
  return (
    <Art label="Two written briefs go into Claude Code, which researched, coded, tested and made the deck, and a rooftop solar startup, Chhat, comes out.">
      <g className="art-step" style={step(0)}>
        {[0, 1].map((i) => (
          <g key={i} transform={`rotate(${i ? 5 : -5} 70 170)`}>
            <Shadow x={18 + i * 16} y={96 + i * 22} w={100} h={130} r={8} />
            <rect className="art-sheet" x={18 + i * 16} y={96 + i * 22} width={100} height={130} rx={8} />
            {i === 1 && (
              <text className="art-t art-t--strong" x={48} y={144}>
                2 briefs
              </text>
            )}
            <line className="art-bar" x1={32 + i * 16} y1={142 + i * 22} x2={100 + i * 16} y2={142 + i * 22} />
            <line className="art-bar" x1={32 + i * 16} y1={160 + i * 22} x2={88 + i * 16} y2={160 + i * 22} />
            <line className="art-bar" x1={32 + i * 16} y1={178 + i * 22} x2={96 + i * 16} y2={178 + i * 22} />
          </g>
        ))}
      </g>

      <g className="art-step" style={step(1)}>
        <path className="art-drop art-drop--neel" d="M140 184 C 160 184, 160 180, 176 180" pathLength={1} />
        <g className="art-orbit">
          <circle className="art-orbit-ring" cx={230} cy={180} r={66} />
          {orbit.map((o, i) => {
            const a = (i / orbit.length) * Math.PI * 2 - (Math.PI * 3) / 4;
            const x = 230 + Math.cos(a) * 66;
            const y = 180 + Math.sin(a) * 66;
            return <circle key={o} className="art-orbit-dot" cx={x} cy={y} r={5} />;
          })}
        </g>
        <circle className="art-core" cx={230} cy={180} r={42} />
        <path className="art-spark" d="M230 160v40M210 180h40M216 166l28 28M244 166l-28 28" />
        <text className="art-t art-t--strong" x={230} y={276} textAnchor="middle">Claude Code</text>
        {orbit.map((o, i) => {
          const pos = [
            [176, 114, "end"],
            [284, 114, "start"],
            [284, 252, "start"],
            [176, 252, "end"],
          ][i] as [number, number, "start" | "end"];
          return (
            <text key={o} className="art-t art-t--small" x={pos[0]} y={pos[1]} textAnchor={pos[2]}>
              {o}
            </text>
          );
        })}
      </g>

      <g className="art-step" style={step(2)}>
        <path className="art-drop art-drop--neel" d="M300 180 C 316 180, 318 196, 334 196" pathLength={1} />
        <circle className="art-sun" cx={420} cy={86} r={16} />
        <rect className="art-sheet" x={340} y={170} width={96} height={110} rx={4} />
        <rect className="art-slab" x={334} y={162} width={108} height={10} rx={2} />
        <path className="art-panels" d="M346 160 l10-26 h56 l10 26z" />
        <path className="art-panel-lines" d="M352 147 h66 M370 160 l8-26 M392 160 l6-26" />
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => <rect key={`${r}${c}`} className="art-window" x={354 + c * 42} y={186 + r * 30} width={26} height={18} rx={2} />),
        )}
      </g>

      <g className="art-step" style={step(3)}>
        <text className="art-word" x={388} y={318} textAnchor="middle">chhat</text>
        <text className="art-deva art-deva--ink" x={388} y={344} textAnchor="middle">छत</text>
      </g>
    </Art>
  );
}
