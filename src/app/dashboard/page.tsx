import { MissionControlClient } from "./MissionControlClient";

export const metadata = {
  title: "Mission Control | Hunt Deck",
  description: "Institutional career workspace, velocity tracking, and priority outreach radar.",
};

export default function DashboardPage() {
  return <MissionControlClient />;
}
