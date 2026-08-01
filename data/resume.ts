import resume from "./resume.json";

/**
 * The resume, typed for the on-page dossier viewer.
 *
 * `data/resume.json` is the single source: `scripts/build-resume-pdf.py` renders
 * the same file to `public/resume/dhwanit-sukhadiya-resume.pdf`, so the record
 * shown on the page and the file a recruiter downloads cannot disagree. Edit the
 * JSON and re-run the generator; never edit one side alone.
 */

export interface ResumeContact {
  /**
   * Optional, and currently unset. This file is published and the PDF it
   * produces is downloadable by anyone, so the number is kept out of both.
   * Email and LinkedIn are the reachable channels.
   */
  phone?: string;
  email: string;
  location: string;
  linkedin: string;
}

export interface ResumeEducation {
  institution: string;
  credential: string;
  detail: string;
  location: string;
  period: string;
}

export interface ResumeExperience {
  role: string;
  org: string;
  period: string;
  bullets: string[];
}

export interface ResumeSkillGroup {
  label: string;
  items: string;
}

export interface ResumeProject {
  name: string;
  bullets: string[];
}

export interface Resume {
  name: string;
  title: string;
  contact: ResumeContact;
  summary: string;
  education: ResumeEducation[];
  experience: ResumeExperience[];
  skills: ResumeSkillGroup[];
  projects: ResumeProject[];
  certifications: string[];
}

export const RESUME: Resume = resume;

/** Path to the generated PDF. Keep in step with the generator's OUTPUT. */
export const RESUME_PDF = "/resume/dhwanit-sukhadiya-resume.pdf";
