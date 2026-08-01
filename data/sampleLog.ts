import type { LogEvent, Severity } from "@/lib/siem";

/**
 * SAMPLE DATA. Synthetic, hand-written, and shipped with the site.
 *
 * This is not a capture from a real network and is never presented as one. It
 * exists so the Signal Room has something honest to analyze: the detection in
 * `lib/siem.ts` runs over these events for real, so the alert it raises is
 * derived from the data rather than scripted alongside it.
 *
 * Timestamps are offsets in seconds from an arbitrary fixed epoch. The epoch is
 * a constant rather than `Date.now()` so the server and client render the same
 * markup, and so the feed is byte-identical on every visit.
 *
 * The narrative: routine domain traffic for three minutes, then a burst of
 * failed administrator logons from a DMZ host, ending in an account lockout.
 * That burst is what the failed-logon rule is meant to catch.
 */

/** Fixed epoch. Deterministic on purpose: never replace with Date.now(). */
export const SAMPLE_EPOCH = 1_760_000_000_000;

type Row = [
  offsetSec: number,
  source: string,
  user: string,
  action: string,
  outcome: "success" | "failure",
  severity: Severity,
  message: string,
];

const ROWS: Row[] = [
  [0, "10.10.10.24", "dsukhadiya", "auth.login", "success", "info", "Successful logon (type 2, interactive)"],
  [4, "10.10.10.24", "dsukhadiya", "dhcp.ack", "success", "info", "DHCP lease granted from scope LAB-VLAN10"],
  [7, "10.10.10.10", "-", "dns.query", "success", "info", "Forward lookup dc01.range.lab resolved"],
  [12, "10.10.10.31", "jmehta", "auth.login", "success", "info", "Successful logon (type 3, network)"],
  [15, "10.10.10.31", "jmehta", "smb.access", "success", "info", "Share \\\\DC01\\Departments accessed"],
  [19, "10.10.20.77", "-", "fw.deny", "failure", "notice", "Inbound 445/tcp from DMZ to VLAN 10 denied by policy"],
  [23, "10.10.10.42", "rpatel", "auth.login", "success", "info", "Successful logon (type 2, interactive)"],
  [27, "10.10.10.10", "-", "gpo.apply", "success", "info", "Group Policy refresh completed on 3 clients"],
  [31, "10.10.10.42", "rpatel", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [36, "10.10.10.42", "rpatel", "auth.login", "success", "info", "Successful logon after retry"],
  [40, "10.10.10.24", "dsukhadiya", "dns.query", "success", "info", "Forward lookup fileserver.range.lab resolved"],
  [45, "10.10.20.77", "-", "fw.deny", "failure", "notice", "Inbound 3389/tcp from DMZ to VLAN 10 denied by policy"],
  [49, "10.10.10.31", "jmehta", "smb.access", "success", "info", "Share \\\\DC01\\Profiles accessed"],
  [54, "10.10.10.10", "-", "dhcp.ack", "success", "info", "DHCP lease renewed for 10.10.10.31"],
  [58, "10.10.10.24", "dsukhadiya", "smb.access", "success", "info", "Share \\\\DC01\\Departments accessed"],
  [63, "10.10.10.10", "-", "ad.replicate", "success", "info", "Directory replication cycle completed"],
  [69, "10.10.10.42", "rpatel", "dns.query", "success", "info", "Forward lookup intranet.range.lab resolved"],
  [74, "10.10.20.77", "-", "port.scan", "failure", "warning", "Sequential connection attempts across 22, 80, 139, 445"],
  [79, "10.10.10.10", "-", "gpo.apply", "success", "info", "Password policy applied to OU=Workstations"],
  [84, "10.10.10.31", "jmehta", "auth.logoff", "success", "info", "User logoff, session closed"],
  [90, "10.10.10.24", "dsukhadiya", "dns.query", "success", "info", "Forward lookup dc01.range.lab resolved"],
  [96, "10.10.20.77", "-", "fw.deny", "failure", "notice", "Inbound 5985/tcp from DMZ to VLAN 10 denied by policy"],
  [101, "10.10.10.42", "rpatel", "smb.access", "success", "info", "Share \\\\DC01\\Departments accessed"],
  [107, "10.10.10.10", "-", "dhcp.ack", "success", "info", "DHCP lease granted from scope LAB-VLAN10"],
  [113, "10.10.10.24", "dsukhadiya", "auth.logoff", "success", "info", "User logoff, session closed"],
  [119, "10.10.10.31", "jmehta", "auth.login", "success", "info", "Successful logon (type 3, network)"],
  [125, "10.10.10.10", "-", "dns.query", "success", "info", "Reverse lookup 10.10.10.42 resolved"],
  [131, "10.10.20.77", "-", "port.scan", "failure", "warning", "Service enumeration against 10.10.10.10 observed"],
  [138, "10.10.10.42", "rpatel", "auth.logoff", "success", "info", "User logoff, session closed"],
  [144, "10.10.10.10", "-", "ad.replicate", "success", "info", "Directory replication cycle completed"],
  [151, "10.10.10.31", "jmehta", "smb.access", "success", "info", "Share \\\\DC01\\Profiles accessed"],
  [158, "10.10.10.24", "dsukhadiya", "auth.login", "success", "info", "Successful logon (type 2, interactive)"],
  [165, "10.10.10.10", "-", "gpo.apply", "success", "info", "Group Policy refresh completed on 3 clients"],

  // The burst. Seven failed administrator logons from one DMZ host inside 40s.
  [172, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [177, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [183, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [188, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [194, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [201, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [207, "10.10.20.77", "administrator", "auth.login", "failure", "notice", "Failed logon, bad password (0xC000006A)"],
  [209, "10.10.10.10", "administrator", "ad.lockout", "failure", "warning", "Account administrator locked out after threshold reached"],

  [216, "10.10.20.77", "-", "fw.deny", "failure", "notice", "Inbound 445/tcp from DMZ to VLAN 10 denied by policy"],
  [222, "10.10.10.10", "-", "dns.query", "success", "info", "Forward lookup dc01.range.lab resolved"],
  [228, "10.10.10.24", "dsukhadiya", "smb.access", "success", "info", "Share \\\\DC01\\Departments accessed"],
  [235, "10.10.10.10", "-", "gpo.apply", "success", "info", "Lockout policy confirmed on OU=Workstations"],
  [241, "10.10.10.31", "jmehta", "dns.query", "success", "info", "Forward lookup intranet.range.lab resolved"],
  [248, "10.10.20.77", "-", "fw.deny", "failure", "notice", "Inbound 139/tcp from DMZ to VLAN 10 denied by policy"],
  [255, "10.10.10.42", "rpatel", "auth.login", "success", "info", "Successful logon (type 2, interactive)"],
  [262, "10.10.10.10", "-", "ad.replicate", "success", "info", "Directory replication cycle completed"],
  [269, "10.10.10.24", "dsukhadiya", "dns.query", "success", "info", "Forward lookup fileserver.range.lab resolved"],
  [276, "10.10.10.31", "jmehta", "auth.logoff", "success", "info", "User logoff, session closed"],
  [283, "10.10.10.10", "-", "dhcp.ack", "success", "info", "DHCP lease renewed for 10.10.10.24"],
  [291, "10.10.10.42", "rpatel", "smb.access", "success", "info", "Share \\\\DC01\\Departments accessed"],
  [298, "10.10.20.77", "-", "port.scan", "failure", "warning", "Service enumeration against 10.10.10.10 observed"],
  [306, "10.10.10.10", "-", "gpo.apply", "success", "info", "Group Policy refresh completed on 3 clients"],
  [313, "10.10.10.24", "dsukhadiya", "auth.logoff", "success", "info", "User logoff, session closed"],
  [321, "10.10.10.10", "-", "dns.query", "success", "info", "Reverse lookup 10.10.10.31 resolved"],
  [329, "10.10.10.42", "rpatel", "auth.logoff", "success", "info", "User logoff, session closed"],
  [337, "10.10.10.10", "-", "ad.replicate", "success", "info", "Directory replication cycle completed"],
  [345, "10.10.20.77", "-", "fw.deny", "failure", "notice", "Inbound 80/tcp from DMZ to VLAN 10 denied by policy"],
  [353, "10.10.10.10", "-", "dhcp.ack", "success", "info", "DHCP lease granted from scope LAB-VLAN10"],
];

export const SAMPLE_LOG: LogEvent[] = ROWS.map(
  ([offsetSec, source, user, action, outcome, severity, message], i) => ({
    id: `evt-${String(i).padStart(3, "0")}`,
    ts: SAMPLE_EPOCH + offsetSec * 1000,
    source,
    user: user === "-" ? undefined : user,
    action,
    outcome,
    message,
    severity,
  }),
);

/** Relative capture time, e.g. "T+03:12". Avoids rendering a wall-clock date. */
export function captureTime(ts: number): string {
  const totalSeconds = Math.max(0, Math.round((ts - SAMPLE_EPOCH) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `T+${minutes}:${seconds}`;
}
