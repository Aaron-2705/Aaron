import { HEADER_CONTROLS } from "@/data/hardening";
import { MODULE_IDS, MODULES } from "@/data/modules";
import { PROFILE } from "@/data/profile";
import { MISSIONS } from "@/data/projects";
import { SITE } from "@/data/site";
import { SKILL_NODES } from "@/data/skills";
import { TIMELINE } from "@/data/timeline";
import type { ThemeName } from "@/types";

/**
 * The AARON shell.
 *
 * Everything branchy lives here as pure functions so it can be unit-tested
 * without a browser (`tests/logic.spec.ts`). The component performs effects;
 * this module only ever returns data. `runCommand` must never throw.
 */

export type LineTone = "accent" | "muted" | "alert" | "success";

export interface TerminalLine {
  text: string;
  tone?: LineTone;
}

export type TerminalAction =
  | { kind: "clear" }
  | { kind: "navigate"; id: string }
  | { kind: "theme"; name: ThemeName }
  | { kind: "exit" };

export interface CommandResult {
  lines: TerminalLine[];
  action?: TerminalAction;
}

export interface TerminalContext {
  /** Commands entered so far this session, oldest first. */
  history: string[];
}

interface Command {
  name: string;
  usage: string;
  summary: string;
  run: (args: string[], ctx: TerminalContext) => CommandResult;
}

/**
 * The single list of switchable themes, so the terminal UI and the parser
 * cannot drift apart.
 *
 * `satisfies` alone only proves every entry IS a ThemeName; it does not prove
 * every ThemeName is listed. `_AllThemesListed` below supplies the missing
 * half, so adding a theme to `types/index.ts` without adding it here fails to
 * compile.
 */
export const THEME_NAMES = [
  "steel",
  "cyber",
  "ironman",
  "matrix",
  "stealth",
  "jarvis",
  "arc",
] as const satisfies readonly ThemeName[];

/** Empty only while THEME_NAMES covers every ThemeName. */
type _AllThemesListed = Exclude<ThemeName, (typeof THEME_NAMES)[number]>;
const _themeExhaustiveness: _AllThemesListed[] = [];
void _themeExhaustiveness;

const line = (text: string, tone?: LineTone): TerminalLine => ({ text, tone });
const blank = (): TerminalLine => ({ text: "" });

/** Levenshtein distance, used only to suggest a near match on a typo. */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, i) => i);
  for (let i = 1; i < rows; i++) {
    const curr = [i, ...Array<number>(cols - 1).fill(0)];
    for (let j = 1; j < cols; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[cols - 1];
}

function nearest(input: string): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const name of COMMAND_NAMES) {
    const score = distance(input, name);
    if (score < bestScore) {
      bestScore = score;
      best = name;
    }
  }
  // Only suggest when it is plausibly a typo rather than a different word.
  return best && bestScore <= Math.max(2, Math.floor(input.length / 3)) ? best : null;
}

const COMMANDS: Command[] = [
  {
    name: "help",
    usage: "help",
    summary: "List every available command.",
    run: () => ({
      lines: [
        line("AVAILABLE COMMANDS", "accent"),
        blank(),
        ...COMMANDS.map((c) => line(`  ${c.name.padEnd(12)} ${c.summary}`)),
        blank(),
        line("  Arrow up / down walks command history.", "muted"),
      ],
    }),
  },
  {
    name: "whoami",
    usage: "whoami",
    summary: "Identify the operator behind this site.",
    run: () => ({
      lines: [
        line(SITE.owner, "accent"),
        blank(),
        ...PROFILE.roles.map((role) => line(`  ${role}`)),
        blank(),
        line(`  LOCATION   ${SITE.location}`, "muted"),
        line(`  CONTACT    ${SITE.email}`, "muted"),
        blank(),
        line(PROFILE.tagline),
      ],
    }),
  },
  {
    name: "projects",
    usage: "projects",
    summary: "List the home-lab operations on file.",
    run: () => ({
      lines: [
        line("MISSION ARCHIVE", "accent"),
        blank(),
        ...MISSIONS.flatMap((m) => [
          line(`  ${m.codeName}  [${m.status}]`, "success"),
          line(`    ${m.title} // ${m.year ?? "undated"}`, "muted"),
          line(`    id: ${m.id}`, "muted"),
        ]),
        blank(),
        line("  Run 'project <id>' for the full record.", "muted"),
        line("  Both are personal labs, not production or paid work.", "muted"),
      ],
    }),
  },
  {
    name: "project",
    usage: "project <id>",
    summary: "Print one lab record in full.",
    run: (args) => {
      const id = (args[0] ?? "").toLowerCase();
      const mission = MISSIONS.find((m) => m.id === id);
      if (!mission) {
        return {
          lines: [
            line("usage: project <id>", "alert"),
            blank(),
            ...MISSIONS.map((m) => line(`  ${m.id.padEnd(12)} ${m.codeName}`)),
          ],
        };
      }
      return {
        lines: [
          line(mission.codeName, "accent"),
          line(`${mission.title} // ${mission.category}`, "muted"),
          blank(),
          line(mission.description),
          blank(),
          line("  STACK", "success"),
          ...mission.technologies.map((t) => line(`    - ${t}`)),
          blank(),
          line("  PROBLEM", "success"),
          line(`    ${mission.challenges}`),
          blank(),
          line("  APPROACH", "success"),
          line(`    ${mission.implementation}`),
          blank(),
          line("  OUTCOME", "success"),
          line(`    ${mission.results}`),
        ],
      };
    },
  },
  {
    name: "skills",
    usage: "skills",
    summary: "Print the arsenal, split by honesty tier.",
    run: () => {
      const operational = SKILL_NODES.filter((n) => n.tier !== "learning");
      const learning = SKILL_NODES.filter((n) => n.tier === "learning");
      return {
        lines: [
          line("ARSENAL // OPERATIONAL", "accent"),
          ...operational.flatMap((n) => [
            blank(),
            line(`  ${n.label}`, "success"),
            ...n.skills.map((s) => line(`    - ${s}`)),
          ]),
          blank(),
          line("ARSENAL // LEARNING", "accent"),
          line("  Actively studied in the lab. Not claimed as proven proficiency.", "muted"),
          ...learning.flatMap((n) => [
            blank(),
            line(`  ${n.label}`, "muted"),
            ...n.skills.map((s) => line(`    - ${s}`, "muted")),
          ]),
        ],
      };
    },
  },
  {
    name: "experience",
    usage: "experience",
    summary: "Print the service record.",
    run: () => ({
      lines: [
        line("SERVICE RECORD", "accent"),
        ...TIMELINE.flatMap((entry) => [
          blank(),
          line(`  ${entry.period}  ${entry.title}`, "success"),
          line(`    ${entry.organization} // ${entry.kind}`, "muted"),
          ...entry.details.map((d) => line(`    - ${d}`)),
        ]),
      ],
    }),
  },
  {
    name: "contact",
    usage: "contact",
    summary: "Open the secure channel.",
    run: () => ({
      lines: [
        line("SECURE CHANNEL", "accent"),
        blank(),
        line(`  EMAIL      ${SITE.email}`),
        line(`  GITHUB     ${SITE.socials.github}`),
        line(`  LINKEDIN   ${SITE.socials.linkedin}`),
        blank(),
        line("  Routing to the contact form...", "muted"),
      ],
      action: { kind: "navigate", id: "contact" },
    }),
  },
  {
    name: "resume",
    usage: "resume",
    summary: "Jump to the full dossier.",
    run: () => ({
      lines: [line("Opening the full dossier...", "muted")],
      action: { kind: "navigate", id: "resume" },
    }),
  },
  {
    name: "headers",
    usage: "headers",
    summary: "List the security headers this site enforces.",
    run: () => ({
      lines: [
        line("RESPONSE HARDENING // enforced in next.config.ts", "accent"),
        blank(),
        ...HEADER_CONTROLS.map((c) =>
          line(
            `  ${c.label.padEnd(26)} ${c.acceptedRisk ? "[ACCEPTED RISK] " : ""}${c.requirement}`,
            c.acceptedRisk ? "muted" : undefined,
          ),
        ),
        blank(),
        line("Run the live audit at #hardening; it grades the real response.", "muted"),
      ],
      action: { kind: "navigate", id: "hardening" },
    }),
  },
  {
    name: "goto",
    usage: "goto <section>",
    summary: "Navigate to a section of the site.",
    run: (args) => {
      const id = (args[0] ?? "").toLowerCase();
      if (MODULE_IDS.includes(id)) {
        return {
          lines: [line(`Routing to #${id}...`, "muted")],
          action: { kind: "navigate", id },
        };
      }
      return {
        lines: [
          line("usage: goto <section>", "alert"),
          blank(),
          ...MODULES.map((m) => line(`  ${m.id.padEnd(12)} ${m.name}`)),
        ],
      };
    },
  },
  {
    name: "ls",
    usage: "ls",
    summary: "List the site's sections.",
    run: () => ({
      lines: [
        line("SESSION MODULES", "accent"),
        blank(),
        ...MODULES.map((m) => line(`  ${m.id.padEnd(12)} ${m.name.padEnd(20)} ${m.clearance}`)),
      ],
    }),
  },
  {
    name: "theme",
    usage: "theme <name>",
    summary: "Switch the interface theme.",
    run: (args) => {
      const requested = (args[0] ?? "").toLowerCase();
      const match = THEME_NAMES.find((t) => t === requested);
      if (!match) {
        return {
          lines: [
            line("usage: theme <name>", "alert"),
            blank(),
            ...THEME_NAMES.map((t) => line(`  ${t}`)),
          ],
        };
      }
      return {
        lines: [line(`Theme set to ${match}.`, "success")],
        action: { kind: "theme", name: match },
      };
    },
  },
  {
    name: "history",
    usage: "history",
    summary: "Show this session's command history.",
    run: (_args, ctx) => {
      if (ctx.history.length === 0) {
        return { lines: [line("No commands yet this session.", "muted")] };
      }
      return {
        lines: ctx.history.map((cmd, i) => line(`  ${String(i + 1).padStart(3)}  ${cmd}`)),
      };
    },
  },
  {
    name: "clear",
    usage: "clear",
    summary: "Clear the scrollback.",
    run: () => ({ lines: [], action: { kind: "clear" } }),
  },
  {
    name: "sudo",
    usage: "sudo <anything>",
    summary: "Attempt privilege escalation.",
    run: (args) => ({
      lines: [
        line(`aaron: user is not in the sudoers file.`, "alert"),
        line("This incident has been reported.", "alert"),
        blank(),
        args.length > 0
          ? line(`  Nice try with '${args.join(" ")}'. Least privilege is the point.`, "muted")
          : line("  Least privilege is the point.", "muted"),
      ],
    }),
  },
  {
    name: "aaron",
    usage: "aaron",
    summary: "Ask AARON who it is.",
    run: () => ({
      lines: [
        line(SITE.fullName, "accent"),
        blank(),
        line("  I am the interface, not the operator."),
        line(`  ${SITE.owner} built the labs. I just index them.`),
        blank(),
        line(`  ${PROFILE.stats.map((s) => `${s.value}${s.suffix} ${s.label}`).join("  //  ")}`, "muted"),
      ],
    }),
  },
  {
    name: "exit",
    usage: "exit",
    summary: "Close the shell.",
    run: () => ({
      lines: [line("Closing session.", "muted")],
      action: { kind: "exit" },
    }),
  },
];

export const COMMAND_NAMES: string[] = COMMANDS.map((c) => c.name);

/**
 * Parse and execute one line of terminal input.
 * Total over its input: unknown commands and bad arguments return lines, never
 * an exception.
 */
export function runCommand(input: string, ctx: TerminalContext): CommandResult {
  const trimmed = input.trim();
  if (trimmed === "") return { lines: [] };

  const [rawName, ...args] = trimmed.split(/\s+/);
  const name = rawName.toLowerCase();
  const command = COMMANDS.find((c) => c.name === name);

  if (!command) {
    const suggestion = nearest(name);
    return {
      lines: [
        line(`aaron: command not found: ${rawName}`, "alert"),
        suggestion
          ? line(`  Did you mean '${suggestion}'? Run 'help' for the full list.`, "muted")
          : line("  Run 'help' for the full list.", "muted"),
      ],
    };
  }

  try {
    return command.run(args, ctx);
  } catch {
    return { lines: [line(`aaron: ${name} failed unexpectedly.`, "alert")] };
  }
}
