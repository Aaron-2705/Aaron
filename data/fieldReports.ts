/**
 * Curated "field reports" — a deterministic activity log shown in the mission
 * database. Static by design so the panel always renders cleanly with no
 * external dependency (the old live GitHub feed rate-limited / 403'd, which is
 * unacceptable for an unattended site). To go live again, set
 * NEXT_PUBLIC_GITHUB_USER and the component will augment these with real events.
 */
export interface FieldReport {
  id: string;
  action: string;
  repo: string;
  date: string;
}

export const FIELD_REPORTS: FieldReport[] = [
  { id: "f1", action: "HARDENED", repo: "AD baseline + Group Policy", date: "Jul 18" },
  { id: "f2", action: "CONFIGURED", repo: "DNS zones + DHCP scopes", date: "Jul 11" },
  { id: "f3", action: "ROUTED", repo: "VLAN trunking + inter-VLAN routing", date: "Jul 04" },
  { id: "f4", action: "CAPTURED", repo: "Wireshark + Nmap traffic sweep", date: "Jun 27" },
  { id: "f5", action: "STUDYING", repo: "Kali offensive basics", date: "Jun 20" },
];
