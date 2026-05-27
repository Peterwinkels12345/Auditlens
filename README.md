# AuditLens

Live AI-prototype voor internal auditors — gebouwd voor IIA Congres 2026, 4 juni, AFAS-theater Leusden.

**Thema keynote:** *Van vinken naar vonken* — Maarten Schurink, Secretaris-Generaal Defensie.

## Wat doet dit prototype?

AuditLens demonstreert wat AI toevoegt boven traditionele data-analyse voor internal auditors als derde lijn:

1. **Toets de werking van controles** op een volledige populatie (847 synthetische inkooptransacties, €52,3 mln)
2. **Onthul wat formeel-werkende controles níet zien** — met uitleg in gewoon Nederlands waaróm een geval verdacht is
3. **Ondersteun het auditoroordeel** — AI signaleert, de auditor beslist (verwerpen / onderzoek openen / accepteren)

Alle data is synthetisch en Defensie-context-geïnspireerd. Geen echte leveranciers, geen echte transacties.

## Lokaal draaien

```bash
npm install
npm run dev
```

Open dan [http://localhost:5173](http://localhost:5173).

## Tech

- React 18 + Vite
- Tailwind CSS (CDN)
- Lucide React (iconen)
- Geen backend, geen externe API — werkt volledig offline
