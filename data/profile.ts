export const PROFILE = {
  name: "DHWANIT SUKHADIYA",
  roles: ["IT & Network Support", "Windows Systems & AD", "Security Home-Labs"],
  tagline:
    "Computer engineering grad building and breaking home labs to learn how Windows systems, networks, and traffic really work.",
  bootMessages: ["SYSTEM INITIALIZING...", "SECURITY ENVIRONMENT ONLINE", "WELCOME USER"],
  summary:
    "Computer Engineering graduate with hands-on experience in desktop and network support, and a genuine pull toward security. Builds and hardens Windows Server and Active Directory labs, models routed and switched networks in Packet Tracer, and analyzes live traffic with Wireshark and Nmap. Currently sharpening offensive and defensive fundamentals in a controlled home lab.",
  records: [
    { label: "DESIGNATION", value: "IT & Network Support / Security Labs" },
    { label: "LOCATION", value: "Folsom, CA" },
    { label: "CLEARANCE", value: "PUBLIC PROFILE" },
    { label: "STATUS", value: "OPEN TO OPPORTUNITIES" },
  ],
  interests: [
    "Windows Server & Active Directory",
    "Network configuration & traffic analysis",
    "Security home-labs (offense & defense)",
    "Cloud fundamentals (AWS)",
  ],
  // Honest, defensible figures only. No invented "users supported" or
  // "tools mastered" vanity metrics.
  stats: [
    { value: 2, suffix: "", label: "HOME-LAB OPERATIONS" },
    { value: 6, suffix: " MO", label: "SUPPORT FIELDWORK" },
    { value: 3, suffix: "", label: "CERTIFICATIONS ON FILE" },
    { value: 5, suffix: "", label: "OPERATIONAL DOMAINS" },
  ],
  assistantIntro: [
    "Welcome.",
    "I am AARON.",
    "I will guide you through Dhwanit's security labs and capabilities.",
  ],
} as const;
