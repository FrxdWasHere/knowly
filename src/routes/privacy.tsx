import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Knowly" },
      { name: "description", content: "Learn what Knowly stores in your browser and how JSON backups work." },
      { property: "og:title", content: "Privacy Policy — Knowly" },
      { property: "og:description", content: "How Knowly handles study content, progress, and browser storage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your data, clearly explained"
      title="Privacy policy"
      intro="Knowly is a local study workspace. Your library lives in this browser. Knowly does not run an account service or sync your decks to a server."
    >
      <section><h2>What Knowly stores</h2><p>Knowly keeps profile preferences, decks, questions, notes, bookmarks, quiz results, study history, XP, streaks, achievements, settings, and optional wallpaper images in your browser’s persistent storage on this device.</p></section>
      <section><h2>How information is used</h2><p>That information is used only to run Knowly on this device: restore your library after a refresh, calculate progress, and personalise the interface. Knowly does not sell personal information.</p></section>
      <section><h2>AI services</h2><p>Knowly creates prompts for you to copy into an AI service of your choice. Knowly does not send those prompts or your study materials to an AI provider on your behalf. Any service you choose has its own privacy practices.</p></section>
      <section><h2>Moving data</h2><p>Use JSON export to download a backup of your library. Import that file on another browser or machine when you want a copy there. Clearing this browser’s storage deletes the local library unless you have a backup.</p></section>
      <section><h2>Hosting</h2><p>The Knowly application files may be served from a host so you can open the app in a browser. That does not include an account or a copy of your study library.</p></section>
      <section><h2>Your choices</h2><p>You can update settings, remove study content, export a backup, or erase all locally stored data from Settings. You can also stop using Knowly and clear this site’s data in your browser.</p></section>
      <section><h2>Changes</h2><p>This policy may be updated as Knowly changes. The effective date above will be revised when material updates are made.</p></section>
    </LegalPage>
  );
}
