import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Knowly" },
      { name: "description", content: "The terms that apply when you use Knowly for study decks, quizzes, and local progress tracking." },
      { property: "og:title", content: "Terms of Service — Knowly" },
      { property: "og:description", content: "The terms governing use of Knowly and its study tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="A straightforward agreement"
      title="Terms of service"
      intro="These terms govern your use of Knowly. By using the app, you agree to use it responsibly and lawfully."
    >
      <section><h2>Using Knowly</h2><p>You may use Knowly to create, import, organise, and practise study materials. You are responsible for the accuracy of your content and for complying with laws, school rules, and third-party rights.</p></section>
      <section><h2>Local storage</h2><p>Your library is stored in this browser. It can be lost if that storage is cleared, the browser profile is reset, or the device is replaced. Keep JSON exports of important material.</p></section>
      <section><h2>Your content</h2><p>You retain ownership of the material you add to Knowly. Knowly does not claim rights to your decks beyond what is needed to display them in this app.</p></section>
      <section><h2>Acceptable use</h2><p>Do not misuse Knowly, interfere with its operation, distribute malicious content, violate intellectual-property rights, or use the app for unlawful activity.</p></section>
      <section><h2>AI-generated material</h2><p>You are responsible for reviewing prompts and material produced by third-party AI services. Knowly does not guarantee that imported content is complete, accurate, or suitable for an assessment.</p></section>
      <section><h2>Availability</h2><p>Knowly may change or discontinue features. Uninterrupted access and permanent preservation of local data are not guaranteed. Keep copies of important study material.</p></section>
      <section><h2>Disclaimer and liability</h2><p>Knowly is provided on an “as is” and “as available” basis to the extent permitted by law. It is a study aid, not professional or academic advice. Liability is limited to the fullest extent permitted by applicable law.</p></section>
      <section><h2>Changes</h2><p>You may stop using Knowly at any time. Updated terms will show a revised effective date, and continued use after an update constitutes acceptance.</p></section>
    </LegalPage>
  );
}
