import type { MissionRecord } from "@/types/portfolio";

/**
 * The mission archive. Each entry is a real, personal home lab that Dhwanit
 * built and operated end to end. Framed with an operation codename for the
 * theme, but every technical claim is honest and self-hosted (VirtualBox /
 * Cisco Packet Tracer), never presented as production or paid work.
 *
 * To add a lab later: append a record with a new id, its own codeName, a
 * distinct /projects image, and (only if a public writeup exists) a repository.
 */
export const MISSIONS: MissionRecord[] = [
  {
    id: "blackgate",
    codeName: "OPERATION BLACKGATE",
    title: "Windows Server 2022 Domain Lab",
    category: "SYSTEM ADMINISTRATION",
    status: "COMPLETED",
    year: "2025",
    description:
      "A self-hosted Windows Server 2022 domain controller running Active Directory, DNS, DHCP and Group Policy for a small virtual enterprise, built and hardened from scratch in VirtualBox.",
    technologies: [
      "Windows Server 2022",
      "Active Directory",
      "DNS",
      "DHCP",
      "Group Policy",
      "VirtualBox",
    ],
    challenges:
      "Group Policy applied inconsistently between the domain controller and joined Windows 10/11 clients on the isolated lab network, and clients intermittently failed to resolve the domain.",
    implementation:
      "Stood up authoritative DNS on the DC, fixed the client resolver order to point at the DC, structured users and machines into OUs, and scoped GPOs so password, lockout and baseline hardening policies applied predictably.",
    results:
      "A repeatable domain that authenticates clients reliably, onboards a new user with the right access in minutes, and demonstrates AD, DNS, DHCP and GPO working together.",
    image: "/projects/project-2.png",
  },
  {
    id: "wiretap",
    codeName: "OPERATION WIRETAP",
    title: "Routed Network + Traffic Analysis Lab",
    category: "NETWORK ENGINEERING",
    status: "COMPLETED",
    year: "2025",
    description:
      "A multi-VLAN routed and switched topology modeled in Cisco Packet Tracer, paired with live traffic capture and port analysis in Wireshark and Nmap to understand how the network actually behaves on the wire.",
    technologies: [
      "Cisco Packet Tracer",
      "VLANs",
      "Routing & Switching",
      "Wireshark",
      "Nmap",
      "TCP/IP",
    ],
    challenges:
      "Inter-VLAN traffic dropped intermittently from trunk and access-port mismatches, and raw captures were noisy enough to bury the packets that actually mattered.",
    implementation:
      "Standardized trunk and VLAN assignments, validated routing between segments, then used Wireshark display filters and Nmap scans to trace the handshake, confirm reachability, and map which services each host exposed.",
    results:
      "Reliable inter-VLAN routing plus a clear, repeatable workflow for capturing, filtering and reading traffic. A practical bridge between networking fundamentals and hands-on security analysis.",
    image: "/projects/project-3.png",
  },
];
