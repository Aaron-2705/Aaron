/**
 * THE RANGE — the home-lab estate, as a diagram.
 *
 * HONESTY CONTRACT (read before editing):
 * Every node carries a `state`. "built" means it exists today inside OPERATION
 * BLACKGATE (Windows Server 2022 / AD / DNS / DHCP / GPO in VirtualBox) or
 * OPERATION WIRETAP (routed + switched topology in Cisco Packet Tracer, analyzed
 * with Wireshark and Nmap). "planned" means it is designed and next on the build
 * list but is NOT yet stood up. The UI renders planned nodes dashed and stamps
 * them "PLANNED // NOT YET BUILT". Never promote a node to "built" without the
 * lab actually existing.
 */

/**
 * "built"      = exists today in BLACKGATE or WIRETAP.
 * "planned"    = designed, not yet stood up.
 * "conceptual" = the two labs are real but live in SEPARATE simulators
 *                (Packet Tracer vs VirtualBox) and are not wired to each
 *                other. Used only for links, never to claim a node exists.
 */
export type BuildState = "built" | "planned";
export type LinkState = BuildState | "conceptual";
export type ProjectRef = "blackgate" | "wiretap" | null;

export interface TopologyNode {
  id: string;
  label: string;
  kind: "cloud" | "gateway" | "switch" | "host" | "client";
  /** Position on the MAP_W x MAP_H grid. */
  x: number;
  y: number;
  role: string;
  config: string[];
  project: ProjectRef;
  state: BuildState;
  vlan?: string;
}

export interface TopologyLink {
  from: string;
  to: string;
  label?: string;
  state: LinkState;
}

export interface ThreatHotspot {
  id: string;
  nodeId: string;
  /** OWASP Top 10 (2021) identifier. */
  owasp: string;
  title: string;
  risk: string;
  mitigation: string;
}

export interface HardeningControl {
  id: string;
  control: string;
  weak: string;
  hardened: string;
  /** Contribution to the illustrative lab risk index. Weights sum to 100. */
  weight: number;
  note: string;
}

export const MAP_W = 820;
export const MAP_H = 460;

export const TOPOLOGY_NODES: TopologyNode[] = [
  {
    id: "wan",
    label: "WAN EDGE",
    kind: "cloud",
    x: 58,
    y: 230,
    role: "Simulated upstream. The boundary every packet crosses first.",
    config: [
      "Modeled as a Packet Tracer cloud and edge router, not a live internet drop",
      "Static route to the lab's inside network",
      "Used to prove routing works before anything else is trusted",
    ],
    project: "wiretap",
    state: "built",
  },
  {
    id: "pfsense",
    label: "pfSense FW",
    kind: "gateway",
    x: 195,
    y: 112,
    role: "Perimeter firewall, planned to sit inline between the edge and the core.",
    config: [
      "Default-deny inbound, explicit allow list outbound",
      "One interface per VLAN so segments cannot talk without a rule",
      "Management interface bound to the LAN only, never the WAN",
    ],
    project: null,
    state: "planned",
  },
  {
    id: "sw-core",
    label: "CORE SWITCH",
    kind: "switch",
    x: 330,
    y: 230,
    role: "Layer-3 core. Trunks the VLANs and routes between them.",
    config: [
      "802.1Q trunks to the distribution VLANs",
      "Access ports pinned to a single VLAN each",
      "Inter-VLAN routing on switched virtual interfaces",
      "Trunk and access mismatches here caused the WIRETAP packet drops",
    ],
    project: "wiretap",
    state: "built",
  },
  {
    id: "vlan10",
    label: "VLAN 10 LAN",
    kind: "switch",
    x: 510,
    y: 92,
    role: "Trusted internal segment. Domain controller and its clients live here.",
    config: [
      "Carries domain authentication, DNS and DHCP",
      "DHCP scope handed out by the domain controller",
      "Verified end to end with Wireshark captures of the DORA exchange",
    ],
    project: "wiretap",
    state: "built",
    vlan: "10",
  },
  {
    id: "vlan20",
    label: "VLAN 20 DMZ",
    kind: "switch",
    x: 510,
    y: 230,
    role: "Untrusted segment for deliberately exposed services.",
    config: [
      "No route to VLAN 10 without an explicit firewall rule",
      "Anything here is treated as already compromised",
      "Logs shipped out, nothing trusted in",
    ],
    project: null,
    state: "planned",
    vlan: "20",
  },
  {
    id: "vlan30",
    label: "VLAN 30 OPS",
    kind: "switch",
    x: 510,
    y: 362,
    role: "Monitoring and tooling segment. Collects, never serves.",
    config: [
      "Receives forwarded event logs from every host",
      "Attack tooling isolated here so it can never reach a real network",
      "One-way trust: ops can reach the lab, the lab cannot reach ops",
    ],
    project: null,
    state: "planned",
    vlan: "30",
  },
  {
    id: "dc01",
    label: "DC01",
    kind: "host",
    x: 700,
    y: 48,
    role: "Windows Server 2022 domain controller. The heart of BLACKGATE.",
    config: [
      "Active Directory Domain Services, authoritative for the lab domain",
      "DNS and DHCP roles, with the client resolver order pointed at the DC",
      "Users and machines structured into OUs",
      "Password, lockout and baseline hardening scoped by Group Policy",
    ],
    project: "blackgate",
    state: "built",
    vlan: "10",
  },
  {
    id: "clients",
    label: "WIN CLIENTS",
    kind: "client",
    x: 700,
    y: 146,
    role: "Domain-joined Windows 10 and 11 workstations.",
    config: [
      "Joined to the domain and receiving Group Policy",
      "Addressed by the DC's DHCP scope",
      "Used to prove a new user onboards with the right access in minutes",
    ],
    project: "blackgate",
    state: "built",
    vlan: "10",
  },
  {
    id: "honeypot",
    label: "HONEYPOT",
    kind: "host",
    x: 700,
    y: 230,
    role: "Deliberately exposed decoy. Planned, not yet deployed.",
    config: [
      "Low-interaction services with nothing real behind them",
      "Every connection is interesting by definition, so every one is logged",
      "Rebuilt from a snapshot after each exercise",
    ],
    project: null,
    state: "planned",
    vlan: "20",
  },
  {
    id: "siem01",
    label: "SIEM01",
    kind: "host",
    x: 700,
    y: 318,
    role: "Ubuntu log collector. Planned home for the Signal Room feed.",
    config: [
      "Central collection of Windows Security event logs",
      "Threshold rules on failed logon bursts, matching the Signal Room demo",
      "Retention long enough to reconstruct an incident after the fact",
    ],
    project: null,
    state: "planned",
    vlan: "30",
  },
  {
    id: "kali",
    label: "KALI",
    kind: "host",
    x: 700,
    y: 410,
    role: "Attacker workstation for controlled exercises. Planned, in study.",
    config: [
      "Isolated in the ops segment with no route off the lab",
      "Used to generate the telemetry the SIEM rules are tuned against",
      "Listed as learning, not as proven offensive proficiency",
    ],
    project: null,
    state: "planned",
    vlan: "30",
  },
];

/**
 * NOTE ON THE TWO "conceptual" EDGES:
 * the routed/switched fabric is modeled in Cisco Packet Tracer (WIRETAP) and
 * the AD domain runs in VirtualBox (BLACKGATE). Both are real and both were
 * built, but they are separate environments with no path between them. The
 * edges joining them show the intended estate, not a wire that exists.
 */
export const TOPOLOGY_LINKS: TopologyLink[] = [
  { from: "wan", to: "sw-core", label: "TODAY", state: "built" },
  { from: "wan", to: "pfsense", state: "planned" },
  { from: "pfsense", to: "sw-core", state: "planned" },
  { from: "sw-core", to: "vlan10", state: "built" },
  { from: "sw-core", to: "vlan20", state: "planned" },
  { from: "sw-core", to: "vlan30", state: "planned" },
  { from: "vlan10", to: "dc01", state: "conceptual" },
  { from: "vlan10", to: "clients", state: "conceptual" },
  { from: "vlan20", to: "honeypot", state: "planned" },
  { from: "vlan30", to: "siem01", state: "planned" },
  { from: "vlan30", to: "kali", state: "planned" },
];

/**
 * OWASP Top 10 (2021) hotspots pinned to the part of the estate they apply to.
 * These describe risks in this lab design, not findings against a live system.
 */
export const THREAT_HOTSPOTS: ThreatHotspot[] = [
  {
    id: "a05-pfsense",
    nodeId: "pfsense",
    owasp: "A05",
    title: "Security Misconfiguration",
    risk: "A perimeter device left on defaults is the fastest way in. Permissive any-any rules, an exposed management interface and unchanged credentials turn the firewall into a doorway instead of a boundary.",
    mitigation:
      "Default-deny inbound with an explicit allow list. Bind management to the LAN interface only, never the WAN. Change the default credentials before the device ever sees traffic, and review rules against what each segment actually needs.",
  },
  {
    id: "a04-vlan20",
    nodeId: "vlan20",
    owasp: "A04",
    title: "Insecure Design",
    risk: "A flat network means one compromised host reaches everything. Without segmentation, the DMZ box an attacker lands on has a straight path to the domain controller.",
    mitigation:
      "Segment by trust level and enforce it at the routed boundary, not by convention. The DMZ gets no route to VLAN 10 without an explicit rule, so lateral movement needs a second, visible failure.",
  },
  {
    id: "a07-dc01",
    nodeId: "dc01",
    owasp: "A07",
    title: "Identification and Authentication Failures",
    risk: "The domain controller is the credential store. LLMNR poisoning captures NetNTLM hashes off the wire, NTLMv1 responses crack quickly, and a short password policy with no lockout lets a burst of guesses run unopposed.",
    mitigation:
      "Disable LLMNR and NBT-NS by Group Policy, refuse NTLMv1, require SMB signing, and enforce a long password policy with account lockout. The Attack vs Defense panel below shows this exact diff.",
  },
  {
    id: "a01-clients",
    nodeId: "clients",
    owasp: "A01",
    title: "Broken Access Control",
    risk: "A shared local administrator password across workstations turns one compromised machine into all of them. Users running as local admin hand an attacker privilege for free.",
    mitigation:
      "Unique per-host local admin passwords, day-to-day accounts as standard users, and a tiered admin model so domain-admin credentials never touch a workstation.",
  },
  {
    id: "a06-honeypot",
    nodeId: "honeypot",
    owasp: "A06",
    title: "Vulnerable and Outdated Components",
    risk: "A decoy running deliberately weak services is a real, exploitable host. If it is not isolated, the lab has helpfully deployed an attacker's foothold.",
    mitigation:
      "Keep it in the DMZ with no trust path inward, treat it as compromised at all times, and rebuild it from a clean snapshot after every exercise.",
  },
  {
    id: "a09-siem01",
    nodeId: "siem01",
    owasp: "A09",
    title: "Security Logging and Monitoring Failures",
    risk: "Without central collection, a failed-logon burst is a few lines in one machine's local event log that nobody reads. The attack succeeds and leaves no story behind it.",
    mitigation:
      "Forward Security event logs off every host, alert on thresholds rather than eyeballing volume, and retain long enough to reconstruct an incident. The rule in the Signal Room below is exactly this.",
  },
];

/**
 * The six Active Directory controls the Attack vs Defense panel diffs.
 * Weights sum to 100 and are shown on screen, so the risk index the panel
 * displays is arithmetic the visitor can check rather than an invented rating.
 */
export const HARDENING_CONTROLS: HardeningControl[] = [
  {
    id: "llmnr",
    control: "LLMNR / NBT-NS",
    weak: "Enabled (Windows default)",
    hardened: "Disabled by Group Policy",
    weight: 20,
    note: "Left on, a poisoner answers name lookups the DNS server missed and collects NetNTLM hashes off the wire.",
  },
  {
    id: "ntlmv1",
    control: "NTLM version",
    weak: "NTLMv1 permitted",
    hardened: "NTLMv2 only (LmCompatibilityLevel 5)",
    weight: 20,
    note: "NTLMv1 responses reduce to DES and fall to offline cracking in hours.",
  },
  {
    id: "smb-signing",
    control: "SMB signing",
    weak: "Not required",
    hardened: "Required on the DC and all clients",
    weight: 15,
    note: "Unsigned SMB lets a captured authentication be relayed to another host instead of cracked.",
  },
  {
    id: "password-policy",
    control: "Password policy",
    weak: "7 characters, no complexity, never expires",
    hardened: "14 characters, complexity, common-password screening",
    weight: 15,
    note: "Length is the control that actually costs an attacker time.",
  },
  {
    id: "lockout",
    control: "Account lockout",
    weak: "No lockout threshold",
    hardened: "5 attempts / 15 min window / 15 min lockout",
    weight: 20,
    note: "This is the control the Signal Room detection rule below assumes. Without it, a logon burst simply keeps going.",
  },
  {
    id: "local-admin",
    control: "Local administrator",
    weak: "Same password on every workstation",
    hardened: "Unique per host; users are standard accounts",
    weight: 10,
    note: "One shared local admin password turns a single compromised client into every client.",
  },
];

export const RISK_INDEX_TOTAL = HARDENING_CONTROLS.reduce((sum, c) => sum + c.weight, 0);
