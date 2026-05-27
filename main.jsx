import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Check, X, MessageCircleQuestion, Sparkles,
  ChevronLeft, ArrowRight, FileText, Building2, Clock,
  ShieldOff, Search, ChevronRight, Eye
} from 'lucide-react';

// ─────────────────────────────────────────────
// CONFIG & DATA — alles synthetisch
// ─────────────────────────────────────────────

const TOTAL_INVOICES = 847;
const TOTAL_VALUE_LABEL = '€52,3 mln';
const SAMPLE_SIZE = 25;
const SAMPLE_PCT_LABEL = '3%';
const PERIOD = 'Q3 2025';

// Dot grid: 200 dots als representatie van 847 facturen
const DOT_COUNT = 200;
const SAMPLE_DOT_INDICES = [4, 17, 28, 41, 52, 67, 79, 88, 101, 113, 128, 142, 159, 171, 186];
const ANOMALY_DOT_INDICES = [56, 124, 177];

const ANOMALIES = [
  {
    id: 'A1',
    title: 'Mogelijke opdrachtsplitsing',
    teaser: 'Twee facturen, één leverancier, beide net onder de €50k-drempel.',
    severityScore: 92,
    invoiceRef: 'F-2025-08-3478 + F-2025-08-3501',
    vendor: 'Heuvels Bouw & Onderhoud B.V.',
    amounts: ['€48.500', '€49.200'],
    totalAmount: '€97.700',
    category: 'Terreinonderhoud',
    location: 'Kazerne Oirschot',
    dateline: '12-08-2025 en 16-08-2025',
    aiReasoning: [
      'Twee facturen van dezelfde leverancier voor dezelfde dienst binnen 4 dagen.',
      'Beide bedragen tussen €48k en €50k — net onder de drempel voor verplichte tweede handtekening.',
      'Patroon herhaald 3× eerder dit jaar (apr/jun/jul) bij dezelfde leverancier.',
      'Gecombineerd bedrag (€97.700) had aanbestedingsplicht moeten triggeren.',
    ],
    controlsThatMissed: [
      { code: 'IC-04', label: 'Tweede handtekening boven €50.000', note: 'Beide facturen onder drempel — controle gaf geen signaal.' },
      { code: 'IC-12', label: 'Aanbestedingsplicht-check', note: 'Per factuur beoordeeld, niet op opdrachtniveau.' },
    ],
    followUps: [
      'Hoe rechtvaardigt de inkoper de gespreide opdrachtverlening?',
      'Welke andere kazernes zijn dit jaar door deze leverancier onderhouden?',
      'Is er een raamovereenkomst die dit werk had moeten dekken?',
    ],
  },
  {
    id: 'A2',
    title: 'Grote uitgave, leverancier zonder voorgeschiedenis',
    teaser: 'Nieuwe BV. Woonadres als vestiging. €127k voor "strategisch advies".',
    severityScore: 88,
    invoiceRef: 'F-2025-09-4127',
    vendor: 'NovaTech Solutions B.V.',
    amounts: ['€127.000'],
    totalAmount: '€127.000',
    category: 'IT-advies, strategisch',
    location: 'Bestuursstaf',
    dateline: '07-09-2025',
    aiReasoning: [
      'Leverancier ingeschreven 14-03-2025 — 5,8 maanden vóór eerste factuur.',
      'KvK-vestigingsadres komt overeen met een woonadres in een wijk zonder zakelijke vestigingen.',
      'Geen voorafgaande inkooporders, geen traceerbaar offerteproces.',
      'Omschrijving zonder concrete deliverables of urenstaten in bijlage.',
    ],
    controlsThatMissed: [
      { code: 'IC-07', label: 'Leveranciersvalidatie via KvK', note: 'KvK-check uitgevoerd — oprichtingsdatum niet gewogen.' },
      { code: 'IC-15', label: 'Onderbouwing inkoopopdracht', note: 'Tekstuele onderbouwing aanwezig, niet inhoudelijk getoetst.' },
    ],
    followUps: [
      'Wie is intern opdrachtgever en hoe is deze leverancier geselecteerd?',
      'Welke concrete deliverables zijn opgeleverd en geaccepteerd?',
      'Is dezelfde dienst beschikbaar binnen een lopend raamcontract?',
    ],
  },
  {
    id: 'A3',
    title: 'Goedkeuring in 3 minuten op zaterdagavond',
    teaser: 'Spoed-aanvraag om 22:44, akkoord om 22:47. €89,4k.',
    severityScore: 74,
    invoiceRef: 'F-2025-07-2891',
    vendor: 'MariSupply Nederland B.V.',
    amounts: ['€89.400'],
    totalAmount: '€89.400',
    category: 'Spoedbestelling onderhoudsmateriaal',
    location: 'Marinekazerne Den Helder',
    dateline: '19-07-2025 — ingediend 22:44, goedgekeurd 22:47',
    aiReasoning: [
      'Goedkeuringstijd 3 minuten — historisch gemiddelde voor deze categorie: 2,4 werkdagen.',
      'Indiening én goedkeuring buiten kantoortijden (zaterdagavond).',
      'Goedkeurder handelde dit kwartaal 17 facturen van deze leverancier in <10 minuten af.',
      'Categorie "spoed" gebruikt bij 41% van facturen van deze leverancier (sectorgemiddelde: 6%).',
    ],
    controlsThatMissed: [
      { code: 'IC-09', label: 'Functiescheiding aanvrager / goedkeurder', note: 'Formeel andere personen — feitelijk patroon van rubber-stamping.' },
      { code: 'IC-22', label: 'Spoedprocedure-toets', note: 'Motivatie aanwezig in aanvraag, niet inhoudelijk getoetst.' },
    ],
    followUps: [
      'Welke fysieke spoed rechtvaardigde indiening om 22:44 op zaterdag?',
      'Wat is de werkrelatie tussen aanvrager, goedkeurder en deze leverancier?',
      'Is er een vergelijkbaar patroon rond andere weekenden?',
    ],
  },
];

const CONTROL_SUMMARY = [
  { code: 'IC-04', label: 'Tweede handtekening boven €50.000', timesActive: 23, caught: 0 },
  { code: 'IC-07', label: 'Leveranciersvalidatie via KvK', timesActive: 847, caught: 0 },
  { code: 'IC-09', label: 'Functiescheiding aanvrager/goedkeurder', timesActive: 847, caught: 0 },
  { code: 'IC-12', label: 'Aanbestedingsplicht-check', timesActive: 38, caught: 0 },
  { code: 'IC-15', label: 'Onderbouwing inkoopopdracht', timesActive: 847, caught: 0 },
  { code: 'IC-22', label: 'Spoedprocedure-toets', timesActive: 51, caught: 0 },
];

// ─────────────────────────────────────────────
// STYLE
// ─────────────────────────────────────────────

const stylesheet = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

:root {
  --cream: #F4F0E6;
  --cream-soft: #ECE6D6;
  --paper: #FBF8F1;
  --ink: #1A1B2E;
  --ink-2: #2B2C40;
  --ink-soft: #555668;
  --slate: #8B8B95;
  --slate-soft: #D6D2C7;
  --line: #D9D4C5;
  --rust: #B83C2F;
  --rust-soft: #EBD5CF;
  --rust-deep: #8C2D24;
  --gold: #A07A2C;
  --gold-soft: #E7DABA;
  --green: #4A6B3A;
  --green-soft: #DAE2CC;
}

.al-app {
  background: var(--cream);
  color: var(--ink);
  font-family: 'Geist', system-ui, sans-serif;
  font-feature-settings: 'ss01';
  min-height: 100vh;
}

.al-display { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.025em; }
.al-mono    { font-family: 'Geist Mono', 'SF Mono', monospace; }

.al-tag {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.al-line { border-color: var(--line); }
.al-soft { color: var(--ink-soft); }
.al-slate { color: var(--slate); }
.al-rust { color: var(--rust); }
.al-gold { color: var(--gold); }
.al-green { color: var(--green); }

.al-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 2px;
  transition: all 0.2s ease;
}
.al-card-clickable { cursor: pointer; }
.al-card-clickable:hover {
  border-color: var(--ink);
  box-shadow: 0 6px 20px rgba(26,27,46,0.06);
  transform: translateY(-1px);
}

.al-btn-primary {
  background: var(--ink);
  color: var(--cream);
  font-weight: 500;
  letter-spacing: 0.01em;
  border: 1px solid var(--ink);
  transition: all 0.2s ease;
  cursor: pointer;
}
.al-btn-primary:hover { background: var(--ink-2); }
.al-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.al-btn-rust {
  background: var(--rust);
  color: var(--cream);
  font-weight: 500;
  letter-spacing: 0.01em;
  border: 1px solid var(--rust);
  transition: all 0.2s ease;
  cursor: pointer;
}
.al-btn-rust:hover { background: var(--rust-deep); }

.al-btn-ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--ink);
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}
.al-btn-ghost:hover { background: var(--ink); color: var(--cream); }
.al-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

.al-btn-text {
  background: transparent;
  color: var(--ink-soft);
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}
.al-btn-text:hover { color: var(--ink); }

.al-badge {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.al-badge-rust { background: var(--rust-soft); color: var(--rust-deep); }
.al-badge-gold { background: var(--gold-soft); color: var(--gold); }
.al-badge-green{ background: var(--green-soft); color: var(--green); }
.al-badge-ink  { background: var(--ink); color: var(--cream); }
.al-badge-line { border: 1px solid var(--line); color: var(--ink-soft); }

.al-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--slate-soft);
  transition: all 0.5s ease;
  flex-shrink: 0;
}
.al-dot-sample {
  background: var(--paper);
  box-shadow: inset 0 0 0 2px var(--ink-soft);
}
.al-dot-scanning {
  animation: scanPulse 1.4s ease-in-out infinite;
}
.al-dot-scanning-sample {
  animation: scanPulse 1.4s ease-in-out infinite;
  box-shadow: inset 0 0 0 2px var(--ink-soft);
}
.al-dot-anomaly {
  background: var(--rust);
  box-shadow: 0 0 0 4px var(--rust-soft), 0 0 16px rgba(184,60,47,0.5);
  transform: scale(1.5);
  animation: anomalyAppear 0.6s ease-out;
}
@keyframes scanPulse {
  0%, 100% { background: var(--slate-soft); }
  50% { background: var(--gold-soft); }
}
@keyframes anomalyAppear {
  0% { transform: scale(0); background: var(--gold); }
  60% { transform: scale(1.9); background: var(--rust); }
  100% { transform: scale(1.5); background: var(--rust); }
}

.al-fadein { animation: alFadeIn 0.5s ease forwards; opacity: 0; }
.al-fadein-1 { animation-delay: 0.1s; }
.al-fadein-2 { animation-delay: 0.3s; }
.al-fadein-3 { animation-delay: 0.5s; }
@keyframes alFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.al-statusline {
  font-family: 'Geist Mono', monospace;
  font-size: 13px;
  color: var(--ink-soft);
}
.al-statusline-active { color: var(--ink); }

.al-divider-h { height: 1px; background: var(--line); width: 100%; }

.al-pulse-cursor::after {
  content: '▮';
  margin-left: 4px;
  animation: blink 1s infinite;
  color: var(--gold);
}
@keyframes blink { 50% { opacity: 0; } }

.al-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  transition: all 0.4s ease;
}
.al-control-row:last-child { border-bottom: none; }
.al-control-row-missed {
  background: linear-gradient(90deg, transparent 0%, var(--rust-soft) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: missedSweep 0.8s ease;
}
@keyframes missedSweep {
  0%   { background-position: 200% 0%; }
  100% { background-position: -100% 0%; }
}

.al-status-pill {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
}
`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function DotGrid({ phase, decidedIds }) {
  const showAnomalies = phase === 'revealed_anomalies';
  return (
    <div className="grid gap-2 max-w-3xl" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const isSample = SAMPLE_DOT_INDICES.includes(i);
        const anomalyIdx = ANOMALY_DOT_INDICES.indexOf(i);
        const isAnomaly = anomalyIdx >= 0;
        const anomalyId = isAnomaly ? ANOMALIES[anomalyIdx].id : null;
        const decided = anomalyId && decidedIds.includes(anomalyId);

        let cls = 'al-dot';
        if ((phase === 'sample' || phase === 'revealed_controls') && isSample) cls += ' al-dot-sample';
        if (phase === 'scanning') {
          cls += isSample ? ' al-dot-scanning-sample' : ' al-dot-scanning';
        }
        if (showAnomalies) {
          if (isAnomaly && !decided) cls += ' al-dot-anomaly';
          else if (isSample) cls += ' al-dot-sample';
        }
        return <div key={i} className={cls} />;
      })}
    </div>
  );
}

function SeverityBar({ score }) {
  return (
    <div className="flex items-center gap-3">
      <div className="al-mono text-xs al-soft">RISICOSCORE</div>
      <div className="flex-1 h-1 max-w-[120px]" style={{ background: 'var(--slate-soft)' }}>
        <div className="h-full" style={{ width: `${score}%`, background: 'var(--rust)' }} />
      </div>
      <div className="al-mono text-sm" style={{ color: 'var(--rust-deep)' }}>{score}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────

export default function App() {
  // phase: idle | sample | scanning | revealed_controls | revealed_anomalies
  const [phase, setPhase] = useState('idle');
  const [selected, setSelected] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [scanMsgIdx, setScanMsgIdx] = useState(0);
  const [followUpsRevealed, setFollowUpsRevealed] = useState({});

  const scanMessages = [
    'AI toetst werking van 6 controles op 847 transacties…',
    'Vergelijkt met historische patronen…',
    'Identificeert gevallen die de controles níet afdekken…',
    'Onderbouwt elk signaal in natuurlijke taal…',
  ];

  useEffect(() => {
    if (phase === 'scanning') {
      let i = 0;
      setScanMsgIdx(0);
      const interval = setInterval(() => {
        i += 1;
        if (i >= scanMessages.length) {
          clearInterval(interval);
          setTimeout(() => setPhase('revealed_controls'), 600);
        } else {
          setScanMsgIdx(i);
        }
      }, 700);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const handleStartSample = () => setPhase('sample');
  const handleStartAI = () => setPhase('scanning');
  const handleRevealAnomalies = () => setPhase('revealed_anomalies');
  const handleReset = () => {
    setPhase('idle');
    setSelected(null);
    setDecisions({});
    setFollowUpsRevealed({});
  };
  const decide = (id, kind) => setDecisions(prev => ({ ...prev, [id]: kind }));
  const selectedAnomaly = selected ? ANOMALIES.find(a => a.id === selected) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: stylesheet }} />
      <div className="al-app">
        <header className="border-b al-line">
          <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="al-display text-2xl font-medium">AuditLens</div>
              <div className="al-tag">Prototype · Defensie · Controles op inkoopproces</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="al-badge al-badge-line">DEMO · synthetische data</span>
              {phase !== 'idle' && (
                <button onClick={handleReset} className="al-btn-text text-sm">↺ opnieuw</button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-8 py-12">
          {!selectedAnomaly && <OverviewView
            phase={phase}
            scanMessages={scanMessages}
            scanMsgIdx={scanMsgIdx}
            decisions={decisions}
            onStartSample={handleStartSample}
            onStartAI={handleStartAI}
            onRevealAnomalies={handleRevealAnomalies}
            onSelectAnomaly={(id) => setSelected(id)}
          />}

          {selectedAnomaly && <DetailView
            anomaly={selectedAnomaly}
            decision={decisions[selectedAnomaly.id]}
            followUpsRevealed={!!followUpsRevealed[selectedAnomaly.id]}
            onBack={() => setSelected(null)}
            onDecide={(kind) => decide(selectedAnomaly.id, kind)}
            onRevealFollowUps={() => setFollowUpsRevealed(prev => ({ ...prev, [selectedAnomaly.id]: true }))}
          />}
        </main>

        <footer className="border-t al-line mt-12">
          <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between al-tag">
            <span>IIA Congres 2026 · Pride &amp; Prejudice</span>
            <span>Van vinken naar vonken</span>
          </div>
        </footer>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────

function OverviewView({ phase, scanMessages, scanMsgIdx, decisions, onStartSample, onStartAI, onRevealAnomalies, onSelectAnomaly }) {
  const decidedIds = Object.keys(decisions);
  const isControls = phase === 'revealed_controls';
  const isAnomalies = phase === 'revealed_anomalies';
  const isRevealed = isControls || isAnomalies;

  return (
    <div>
      {/* ─── HERO ─── */}
      <div className="mb-10">
        <div className="al-tag mb-3">Inkoopproces · {PERIOD}</div>

        {phase === 'idle' && (
          <>
            <h1 className="al-display text-5xl font-medium leading-tight mb-3" style={{ maxWidth: '880px' }}>
              6 interne controles. 847 transacties.<br/>
              Werken die controles voor de risico's die u denkt af te dekken?
            </h1>
            <p className="al-soft text-lg" style={{ maxWidth: '720px' }}>
              Data-analyse op volledige populaties doet u misschien al. Wat AI hier toevoegt: uitleg in natuurlijke taal en suggesties voor vervolgvragen — voor u als derde lijn.
            </p>
          </>
        )}

        {phase === 'sample' && (
          <>
            <h1 className="al-display text-5xl font-medium leading-tight mb-3" style={{ maxWidth: '880px' }}>
              25 willekeurige facturen. <span className="al-soft">0 bevindingen.</span>
            </h1>
            <p className="al-soft text-lg" style={{ maxWidth: '720px' }}>
              De steekproef werkt zoals altijd. Niets opmerkelijks. Laten we nu de andere kant op kijken.
            </p>
          </>
        )}

        {phase === 'scanning' && (
          <>
            <h1 className="al-display text-5xl font-medium leading-tight mb-3" style={{ maxWidth: '880px' }}>
              AuditLens toetst de werking…
            </h1>
            <p className="al-soft text-lg" style={{ maxWidth: '720px' }}>
              Niet of de controles bestaan — of ze afdekken wat ze moeten afdekken.
            </p>
          </>
        )}

        {isControls && (
          <>
            <h1 className="al-display text-5xl font-medium leading-tight mb-3" style={{ maxWidth: '880px' }}>
              Zes controles. 847 transacties.<br/>
              <span className="al-green">Nul bevindingen.</span>
            </h1>
            <p className="al-soft text-lg" style={{ maxWidth: '720px' }}>
              Op papier draait het systeem perfect. Maar de vraag is niet of de controles vuren — de vraag is of ze de juiste dingen zien.
            </p>
          </>
        )}

        {isAnomalies && (
          <>
            <h1 className="al-display text-5xl font-medium leading-tight mb-3" style={{ maxWidth: '880px' }}>
              Drie gevallen. <span className="al-rust">Geen van deze controles</span> zou ze hebben opgemerkt.
            </h1>
            <p className="al-soft text-lg" style={{ maxWidth: '720px' }}>
              AuditLens analyseerde de volledige populatie in <span className="al-mono">2,7 sec</span>. Klik op een geval om de redenering te zien.
            </p>
          </>
        )}
      </div>

      {/* ─── STAT ROW ─── */}
      <div className="grid grid-cols-4 gap-px mb-12" style={{ background: 'var(--line)' }}>
        <Stat label="Populatie" value={TOTAL_INVOICES.toLocaleString('nl-NL')} sub="transacties" />
        <Stat label="Controles" value="6" sub="raamwerk Q3 2025" highlight={isControls} />
        <Stat label="Steekproef" value={SAMPLE_SIZE.toString()} sub={`${SAMPLE_PCT_LABEL} · willekeurig`} dimmed={phase === 'idle'} highlight={phase === 'sample'} />
        <Stat
          label="AI-bevindingen"
          value={isAnomalies ? '3' : (isControls ? '?' : '—')}
          sub={isAnomalies ? 'binnen 2,7 sec' : (isControls ? 'nog te onthullen' : 'nog niet gedraaid')}
          highlight={isAnomalies}
          rust={isAnomalies}
        />
      </div>

      {/* ─── DOT GRID ─── */}
      <div className="al-card p-10 mb-8 flex flex-col items-center">
        <DotGrid phase={phase} decidedIds={decidedIds} />
        <div className="mt-8 flex items-center justify-between w-full max-w-3xl">
          <div className="flex items-center gap-6 al-tag">
            <span className="flex items-center gap-2">
              <span className="al-dot" style={{ width: 10, height: 10 }} /> transactie
            </span>
            <span className="flex items-center gap-2">
              <span className="al-dot al-dot-sample" style={{ width: 10, height: 10 }} /> in steekproef
            </span>
            {isAnomalies && (
              <span className="flex items-center gap-2">
                <span className="al-dot" style={{ width: 10, height: 10, background: 'var(--rust)', boxShadow: '0 0 0 2px var(--rust-soft)' }} /> niet afgedekt door controles
              </span>
            )}
          </div>
          <div className="al-tag al-slate">1 punt ≈ 4 transacties</div>
        </div>
      </div>

      {/* ─── STATUS / ACTION ─── */}
      <div className="al-card p-6 mb-12">
        {phase === 'idle' && (
          <div className="flex items-center justify-between gap-6">
            <div className="al-statusline">
              Hoe wilt u beginnen — de gebruikelijke steekproef, of AI op de werking van het hele raamwerk?
            </div>
            <div className="flex gap-3">
              <button onClick={onStartSample} className="al-btn-ghost px-5 py-3 text-sm">
                Toon traditionele steekproef
              </button>
              <button onClick={onStartAI} className="al-btn-primary px-5 py-3 text-sm flex items-center gap-2">
                <Sparkles size={14} /> Toets controles met AI
              </button>
            </div>
          </div>
        )}

        {phase === 'sample' && (
          <div className="flex items-center justify-between gap-6">
            <div>
              <div className="al-tag mb-1">Steekproef getrokken</div>
              <div className="text-lg">
                Inhoudelijke toets levert <span className="al-mono">0 bevindingen</span> op. <span className="al-soft">Geen rode vlaggen.</span>
              </div>
            </div>
            <button onClick={onStartAI} className="al-btn-primary px-5 py-3 text-sm flex items-center gap-2">
              <Sparkles size={14} /> Toets nu de werking van de controles
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {phase === 'scanning' && (
          <div className="flex items-center gap-4">
            <div className="al-mono text-xs px-2 py-1" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>
              AI
            </div>
            <div className="al-statusline al-statusline-active al-pulse-cursor">
              {scanMessages[scanMsgIdx]}
            </div>
          </div>
        )}

        {isControls && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Check size={16} className="al-green" />
              <span className="al-mono text-sm">analyse voltooid · 2,7 sec · 6 controles getoetst · 0 formele bevindingen</span>
            </div>
            <button onClick={onRevealAnomalies} className="al-btn-rust px-5 py-3 text-sm flex items-center gap-2">
              <Eye size={14} /> Toon wat deze controles níet hebben gezien
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {isAnomalies && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="al-rust" />
              <span className="al-mono text-sm">3 gevallen onthuld · niet afgedekt door bestaande controles</span>
            </div>
            <div className="al-soft text-sm">
              Handmatig vergelijkbaar werk: ± <span className="al-mono">14 werkdagen</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── CONTROLES-BLOK (prominent bij revealed_controls, secundair bij revealed_anomalies) ─── */}
      {isRevealed && (
        <ControlsBlock phase={phase} />
      )}

      {/* ─── ANOMALY CARDS (alleen na tweede reveal) ─── */}
      {isAnomalies && (
        <>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="al-display text-2xl font-medium">De drie gevallen</h2>
            <div className="al-tag">AI signaleert · u beoordeelt</div>
          </div>
          <div className="space-y-4 mb-12">
            {ANOMALIES.map((a, idx) => (
              <AnomalyCard
                key={a.id}
                anomaly={a}
                decision={decisions[a.id]}
                onClick={() => onSelectAnomaly(a.id)}
                fadeClass={`al-fadein al-fadein-${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTROLES-BLOK
// ─────────────────────────────────────────────

function ControlsBlock({ phase }) {
  const isControls = phase === 'revealed_controls';
  const isAnomalies = phase === 'revealed_anomalies';

  return (
    <div className={`al-card p-8 mb-12 ${isControls ? '' : ''}`} style={{ background: isControls ? 'var(--cream-soft)' : 'var(--paper)' }}>
      <div className="flex items-start gap-4 mb-6">
        {isControls ? (
          <Check size={20} className="al-green mt-1" />
        ) : (
          <ShieldOff size={20} className="al-gold mt-1" />
        )}
        <div>
          <div className="al-tag mb-2">
            {isControls ? 'Werking interne controles Q3 2025' : 'Diezelfde controles, opnieuw bekeken'}
          </div>
          <h3 className="al-display text-2xl font-medium mb-2">
            {isControls
              ? 'Zes controles. Een kwartaal lang actief. Nul bevindingen.'
              : 'Zes controles. Geen één van deze drie gevallen gesignaleerd.'}
          </h3>
          <p className="al-soft" style={{ maxWidth: '680px' }}>
            {isControls
              ? 'Het controleraamwerk doet wat het moet doen — formeel. Alle zes controles vuurden, geen overtredingen geconstateerd. Auditrapport zou hier kunnen stoppen.'
              : 'De controles hebben dit kwartaal naar behoren gewerkt — formeel niets misgegaan. Maar geen ervan zou de drie hierboven hebben opgemerkt.'
            }
          </p>
        </div>
      </div>
      <div className="al-divider-h mb-2" />
      <div>
        {CONTROL_SUMMARY.map((c, idx) => (
          <div key={c.code} className={`al-control-row ${isAnomalies ? 'al-control-row-missed' : ''}`} style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="flex items-center gap-4">
              <span className="al-mono al-soft text-sm w-12">{c.code}</span>
              <span className="text-sm">{c.label}</span>
            </div>
            <div className="flex items-center gap-6 al-mono text-xs">
              <span className="al-soft">{c.timesActive.toLocaleString('nl-NL')}× actief</span>
              {isControls ? (
                <span className="al-status-pill" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                  <Check size={10} className="inline mr-1" />in orde
                </span>
              ) : (
                <span className="al-status-pill" style={{ background: 'var(--rust-soft)', color: 'var(--rust-deep)' }}>
                  <X size={10} className="inline mr-1" />heeft het niet onderkend
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT TILE
// ─────────────────────────────────────────────

function Stat({ label, value, sub, dimmed, highlight, rust }) {
  return (
    <div className="p-6" style={{
      background: highlight ? (rust ? 'var(--rust-soft)' : 'var(--cream-soft)') : 'var(--paper)',
      opacity: dimmed ? 0.6 : 1,
      transition: 'all 0.3s ease',
    }}>
      <div className="al-tag mb-2">{label}</div>
      <div className={`al-display text-3xl font-medium leading-none mb-1 ${rust ? 'al-rust' : ''}`}>{value}</div>
      <div className="al-soft text-xs al-mono">{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ANOMALY CARD
// ─────────────────────────────────────────────

function AnomalyCard({ anomaly, decision, onClick, fadeClass }) {
  const decisionLabel = {
    accepted: 'Bevinding geaccepteerd',
    rejected: 'Verworpen',
    investigating: 'Onderzoek loopt',
  }[decision];

  return (
    <div onClick={onClick} className={`al-card al-card-clickable p-6 ${fadeClass}`}>
      <div className="flex items-start gap-6">
        <div className="al-mono text-xs al-soft pt-1 w-8">{anomaly.id}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-6 mb-2">
            <h3 className="al-display text-xl font-medium leading-snug">{anomaly.title}</h3>
            {decision && <span className="al-badge al-badge-ink">{decisionLabel}</span>}
          </div>
          <p className="al-soft mb-4">{anomaly.teaser}</p>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-sm al-soft">
              <span className="flex items-center gap-2"><Building2 size={13} /> {anomaly.vendor}</span>
              <span className="flex items-center gap-2 al-mono">{anomaly.totalAmount}</span>
            </div>
            <SeverityBar score={anomaly.severityScore} />
          </div>
        </div>
        <ChevronRight size={18} className="al-slate mt-1" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DETAIL VIEW
// ─────────────────────────────────────────────

function DetailView({ anomaly, decision, followUpsRevealed, onBack, onDecide, onRevealFollowUps }) {
  return (
    <div>
      <button onClick={onBack} className="al-btn-text text-sm mb-8 flex items-center gap-2">
        <ChevronLeft size={14} /> terug naar overzicht
      </button>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="al-tag">{anomaly.id}</span>
          <span className="al-badge al-badge-rust">
            <AlertTriangle size={11} /> Niet afgedekt door huidige controles
          </span>
        </div>
        <h1 className="al-display text-4xl font-medium leading-tight mb-3" style={{ maxWidth: '780px' }}>
          {anomaly.title}
        </h1>
        <p className="al-soft text-lg">{anomaly.teaser}</p>
      </div>

      <div className="grid grid-cols-3 gap-10 mb-12">
        <div>
          <div className="al-tag mb-4">Transactiegegevens</div>
          <div className="space-y-4">
            <Field label="Leverancier" value={anomaly.vendor} />
            <Field label="Bedrag" value={anomaly.totalAmount} mono />
            <Field label="Splitsing" value={anomaly.amounts.join(' + ')} mono dimIfSingle />
            <Field label="Categorie" value={anomaly.category} />
            <Field label="Locatie" value={anomaly.location} />
            <Field label="Datum" value={anomaly.dateline} mono />
            <Field label="Referentie" value={anomaly.invoiceRef} mono />
          </div>
        </div>

        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="al-badge al-badge-gold"><Sparkles size={11} /> AI-redenering</span>
            <span className="al-mono text-xs al-soft">risicoscore {anomaly.severityScore} / 100</span>
          </div>
          <ol className="space-y-3 mb-8">
            {anomaly.aiReasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="al-mono text-xs al-soft pt-1 w-5">{(i + 1).toString().padStart(2, '0')}</span>
                <span className="text-base leading-relaxed">{r}</span>
              </li>
            ))}
          </ol>

          <div className="al-card p-6 mb-6" style={{ background: 'var(--cream-soft)' }}>
            <div className="flex items-start gap-3 mb-4">
              <ShieldOff size={16} className="al-gold mt-1" />
              <div>
                <div className="al-tag mb-1">Welke controles hadden dit moeten zien?</div>
                <div className="text-base">Bestaande controles gaven geen signaal — niet omdat ze faalden, maar omdat ze niet zo zijn ontworpen.</div>
              </div>
            </div>
            <div className="space-y-3 pl-7">
              {anomaly.controlsThatMissed.map((c) => (
                <div key={c.code} className="flex items-start gap-4 text-sm">
                  <span className="al-mono al-soft pt-1 w-12">{c.code}</span>
                  <div className="flex-1">
                    <div className="font-medium">{c.label}</div>
                    <div className="al-soft mt-1">{c.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!followUpsRevealed && (
            <button onClick={onRevealFollowUps} className="al-btn-ghost px-5 py-3 text-sm flex items-center gap-2">
              <MessageCircleQuestion size={14} /> Vraag door · genereer onderzoeksvragen
            </button>
          )}
          {followUpsRevealed && (
            <div className="al-fadein">
              <div className="al-tag mb-3 flex items-center gap-2">
                <Sparkles size={11} className="al-gold" /> Voorgestelde onderzoeksvragen
              </div>
              <ol className="space-y-2 mb-2">
                {anomaly.followUps.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="al-mono al-soft pt-0.5">→</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
              <div className="al-soft text-xs italic mt-3">U beoordeelt. De AI vraagt niet — die suggereert.</div>
            </div>
          )}
        </div>
      </div>

      <div className="al-card p-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="al-tag mb-1">Uw oordeel als derde lijn</div>
            <div className="text-base mb-1">
              AI signaleert. Het management herstelt. <span className="al-soft">U beoordeelt of het stelsel werkt.</span>
            </div>
          </div>
          <div className="flex gap-3">
            <DecisionButton
              active={decision === 'rejected'}
              onClick={() => onDecide('rejected')}
              icon={<X size={14} />}
              label="Verwerpen"
            />
            <DecisionButton
              active={decision === 'investigating'}
              onClick={() => onDecide('investigating')}
              icon={<Search size={14} />}
              label="Onderzoek openen"
            />
            <DecisionButton
              active={decision === 'accepted'}
              onClick={() => onDecide('accepted')}
              icon={<Check size={14} />}
              label="Bevinding accepteren"
              primary
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, dimIfSingle }) {
  const isSingle = dimIfSingle && !value.includes('+');
  return (
    <div>
      <div className="al-tag mb-1">{label}</div>
      <div className={`${mono ? 'al-mono' : ''} ${isSingle ? 'al-slate' : ''}`}>
        {isSingle ? '—' : value}
      </div>
    </div>
  );
}

function DecisionButton({ active, onClick, icon, label, primary }) {
  const base = 'px-5 py-3 text-sm flex items-center gap-2 transition-all';
  const cls = active
    ? (primary ? 'al-btn-primary' : 'al-btn-primary')
    : 'al-btn-ghost';
  return (
    <button onClick={onClick} className={`${base} ${cls}`}>
      {icon} {label}
    </button>
  );
}
