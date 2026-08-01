export type MissionStatus = "COMPLETED" | "ACTIVE" | "IN_PROGRESS";

export interface MissionRecord {
  id: string;
  codeName: string;
  title: string;
  category: string;
  status: MissionStatus;
  /** Short human timeframe for the lab, e.g. "2025". */
  year?: string;
  description: string;
  technologies: string[];
  challenges: string;
  implementation: string;
  results: string;
  image: string;
  /**
   * Public repository URL. Optional: the real labs are personal VirtualBox /
   * Packet Tracer environments with no public repo, so the card shows a
   * "personal lab" stamp instead of a link when this is absent.
   */
  repository?: string;
}

export interface SkillNode {
  id: string;
  label: string;
  skills: string[];
  /**
   * Honesty tier. "operational" = demonstrated in real work or the two labs.
   * "learning" = actively studying in the lab, NOT presented as proven
   * proficiency. Defaults to "operational" when omitted.
   */
  tier?: "operational" | "learning";
}

export interface TimelineEntry {
  id: string;
  period: string;
  title: string;
  organization: string;
  kind: "education" | "experience" | "certification" | "project";
  details: string[];
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}
