# AARON — Advanced Autonomous Responsive Operations Network

Interactive AI-powered cybersecurity portfolio of **Dhwanit Sukhadiya**.
An immersive 3D command center built with Next.js, React Three Fiber, GSAP,
Framer Motion and Lenis.

## Running the site

**In VS Code: open the `aaron` folder, then press F5.** That starts the server
and opens the browser at it. Nothing else to configure.

There is no single file you "run". A Next.js app is compiled and served on
demand from `app/`, `components/` and `data/`, so the entry point is the dev
server rather than a script. F5 is the one action that stands in for it.

Two launch configurations are available from the Run and Debug panel:

| Configuration | What it does | Use it for |
|---|---|---|
| **Run AARON website** | `npm run dev` | Everyday work. Hot reload on save. |
| **Run AARON website (production build)** | `npm run serve` | Before shipping, and for any Lighthouse or security audit. |

Audit against the production build, never the dev server: `next dev` relaxes the
Content-Security-Policy with `'unsafe-eval'` so Turbopack can hot-reload, which
makes a scan report a finding that does not exist in what actually deploys.

### From a terminal instead

```bash
cd aaron
npm install     # first time only
npm run dev     # http://localhost:3000
```

### If the site ends up on two ports

`next dev` does **not** fail when 3000 is busy. It prints a warning and quietly
moves to the next free port:

```
⚠ Port 3000 is in use by process 22340, using available port 3001 instead.
- Local:   http://localhost:3001
```

So a server left running from an earlier session does not block the next one, it
just splits the site across two addresses, and the warning scrolls past. If you
are ever unsure which one you are looking at, stop everything and start once:

```bash
npx kill-port 3000 3001
```

To see what is actually listening before killing anything:

```bash
netstat -ano | findstr LISTENING | findstr :300
```

## Commands

```bash
npm run dev        # development server
npm run serve      # production build, then serve it (one step)
npm run build      # production build only
npm run start      # serve an existing production build
npm run lint       # eslint
npm run typecheck  # strict TypeScript check
npm run test       # Playwright suite
npm run format     # prettier
```

## Architecture

- `app/` — Next.js App Router entry (layout, page, global theme CSS)
- `components/three/` — 3D engine: `CommandCenterScene`, `CameraRig`,
  `LightingSystem`, material library, object `registry`, room components
- `components/sections/` — portfolio sections (hero, missions, skills, about,
  timeline, resume, contact, boot sequence, assistant, admin terminal)
- `components/ui|animations|layout|providers` — shared building blocks
- `data/` — **all content lives here** (projects, skills, timeline, profile,
  site config, camera targets, 3D theme tokens)
- `hooks/`, `lib/` — reusable hooks and utilities

### Replacing the placeholder room with a GLB

The room is composed from primitives in `components/three/room/`. To swap in a
production GLB: load it in a new component that registers the same object
names from `components/three/registry.ts` (`main_monitor`, `desk`,
`server_rack`, …) and mount it in `CommandCenterScene` instead of
`Room`/`Workstation`/`ServerRack`. Camera, lighting, scroll and UI logic stay
untouched. Camera waypoints are configured in `data/cameraTargets.ts`.

### Easter egg

`CTRL + SHIFT + D`, then `ENTER` → AARON root shell.

## Deployment

Standard Next.js deployment (Vercel recommended):

1. Push the repo to GitHub.
2. Import into Vercel — zero config needed.
3. Update `metadataBase` in `app/layout.tsx` to the final domain.
4. Drop the real resume PDF into `public/resume/` and update
   `RESUME_URL` in `components/sections/ResumeSection.tsx`.
