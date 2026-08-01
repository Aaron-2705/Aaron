/**
 * Narrative spine — each section is a "module" in the AARON session.
 * Order matches the page; the id must match the section's DOM id.
 * Single source consumed by the session HUD, transition overlay, nav,
 * and AARON narration.
 */
export interface SessionModule {
  id: string;
  name: string;
  clearance: string;
  line: string;
}

export const MODULES: SessionModule[] = [
  { id: "hero", name: "IDENTITY", clearance: "ROOT", line: "Session initialized. Welcome, operator." },
  { id: "command", name: "COMMAND_CENTER", clearance: "ROOT", line: "Command center online. Systems nominal." },
  { id: "missions", name: "MISSION_ARCHIVE", clearance: "CONFIDENTIAL", line: "Accessing the mission archive…" },
  { id: "range", name: "THE_RANGE", clearance: "SECRET", line: "Mapping the home range…" },
  { id: "siem", name: "SIGNAL_ROOM", clearance: "RESTRICTED", line: "Correlating sample telemetry…" },
  { id: "skills", name: "ARSENAL", clearance: "SECRET", line: "Mapping operational capabilities…" },
  { id: "about", name: "OPERATIVE_PROFILE", clearance: "CONFIDENTIAL", line: "Decrypting operative profile…" },
  { id: "experience", name: "SERVICE_RECORD", clearance: "CONFIDENTIAL", line: "Loading service history…" },
  { id: "hardening", name: "SITE_HARDENING", clearance: "ROOT", line: "Auditing this site against itself…" },
  { id: "resume", name: "FULL_DOSSIER", clearance: "ROOT", line: "Full dossier ready for export." },
  { id: "contact", name: "SECURE_CHANNEL", clearance: "ENCRYPTED", line: "Opening encrypted channel…" },
];

export const MODULE_IDS = MODULES.map((m) => m.id);
