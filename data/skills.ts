import type { SkillNode } from "@/types/portfolio";

/**
 * The arsenal. Honesty tiers matter here:
 *  - "operational" = demonstrated in real support work or the two home labs
 *    (BLACKGATE, WIRETAP), aligned to the resume.
 *  - "learning" = actively studied in the lab, NOT claimed as proven
 *    proficiency. These stay clearly separated so nothing is oversold.
 */
export const SKILL_NODES: SkillNode[] = [
  {
    id: "windows",
    label: "WINDOWS & DIRECTORY",
    tier: "operational",
    skills: [
      "Windows 10 / 11",
      "Windows Server 2022",
      "Active Directory",
      "Group Policy",
      "User Management",
    ],
  },
  {
    id: "networking",
    label: "NETWORKING",
    tier: "operational",
    skills: ["TCP/IP", "DNS", "DHCP", "LAN / WAN", "VLANs", "Routing & Switching"],
  },
  {
    id: "analysis",
    label: "TRAFFIC & RECON",
    tier: "operational",
    skills: ["Wireshark", "Nmap", "Packet Analysis", "Port & Service Scanning"],
  },
  {
    id: "virtualization",
    label: "LAB & VIRTUALIZATION",
    tier: "operational",
    skills: ["VirtualBox", "Cisco Packet Tracer", "Hardware Troubleshooting"],
  },
  {
    id: "cloud",
    label: "CLOUD & SUPPORT",
    tier: "operational",
    skills: ["AWS Fundamentals", "Ticket Documentation", "Desktop Support"],
  },
  {
    id: "offensive",
    label: "OFFENSIVE SECURITY",
    tier: "learning",
    skills: ["Kali Linux", "Burp Suite", "Metasploit", "OSINT"],
  },
];
