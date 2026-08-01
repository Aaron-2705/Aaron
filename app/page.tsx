import { CursorSpotlight } from "@/components/animations/CursorSpotlight";
import { RisingLinesBackground } from "@/components/animations/RisingLinesBackground";
import { SectionShell } from "@/components/animations/SectionShell";
import { StatusTicker } from "@/components/animations/StatusTicker";
import { Footer } from "@/components/layout/Footer";
import { AaronAssistant } from "@/components/sections/AaronAssistant";
import { AdminTerminal } from "@/components/sections/AdminTerminal";
import { BootSequence } from "@/components/sections/BootSequence";
import { AboutProfile } from "@/components/sections/AboutProfile";
import { ContactTerminal } from "@/components/sections/ContactTerminal";
import { ExperienceTimeline } from "@/components/sections/ExperienceTimeline";
import { HeroEnvironment } from "@/components/sections/HeroEnvironment";
import { HeroPrime } from "@/components/sections/HeroPrime";
import { MissionDatabase } from "@/components/sections/MissionDatabase";
import { ResumeSection } from "@/components/sections/ResumeSection";
import { SecurityPosture } from "@/components/sections/SecurityPosture";
import { SessionHud } from "@/components/sections/SessionHud";
import { SignalRoom } from "@/components/sections/SignalRoom";
import { SkillsConstellation } from "@/components/sections/SkillsConstellation";
import { TheRange } from "@/components/sections/TheRange";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <HeroPrime />
        <HeroEnvironment />
        {/* Content scrolls over the fixed 3D environment on a carbon backdrop.
            z-30 keeps it above the portal fade overlay (z-20). */}
        <div className="relative z-30 bg-background">
          <RisingLinesBackground />
          <div className="relative z-10">
            <StatusTicker />
          <SectionShell>
            <MissionDatabase />
          </SectionShell>
          <SectionShell>
            <TheRange />
          </SectionShell>
          <SectionShell>
            <SignalRoom />
          </SectionShell>
          <SectionShell>
            <SkillsConstellation />
          </SectionShell>
          <SectionShell>
            <AboutProfile />
          </SectionShell>
          <SectionShell>
            <ExperienceTimeline />
          </SectionShell>
          <SectionShell>
            <SecurityPosture />
          </SectionShell>
          <SectionShell>
            <ResumeSection />
          </SectionShell>
          <SectionShell>
            <ContactTerminal />
          </SectionShell>
          </div>
        </div>
        <Footer />
      </main>
      <AaronAssistant />
      <AdminTerminal />
      <CursorSpotlight />
      <SessionHud />
      <BootSequence />
    </>
  );
}
