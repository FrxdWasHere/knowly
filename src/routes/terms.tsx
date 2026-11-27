import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Knowly" },
      {
        name: "description",
        content:
          "Terms for using Knowly's study tools, optional account sync, and sharing features. Knowly is free to use with no subscription.",
      },
      { property: "og:title", content: "Terms of Service — Knowly" },
      {
        property: "og:description",
        content:
          "Knowly's terms for study tools, optional online accounts, cloud sync, and share links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms for using Knowly"
      title="Terms of service"
      intro="These terms cover the Knowly app, optional online accounts and cloud sync, and resources you choose to share. Please read them before using those features."
    >
      <section>
        <h2>1. Agreement and eligibility</h2>
        <p>
          These terms are an agreement between you and Knowly, developed and operated by Frederic
          Liam De Guzman (“Knowly,” “we,” “us,” or “our”). By accessing or using Knowly, you agree
          to these terms. If you do not agree, do not use the service.
        </p>
        <p>
          Our{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          explains how information is handled when you use Knowly.
        </p>
        <p>
          You must be old enough to use online services under the law where you live. If you are
          under the age of majority, use Knowly with permission from a parent or legal guardian.
          Your email provider may impose additional requirements.
        </p>
      </section>
      <section>
        <h2>2. Knowly is free</h2>
        <p>
          Knowly is free to use. There is no subscription, paid tier, or trial, and we do not charge
          for accounts or online sync. The core study service will remain free for as long as Knowly
          is offered. Internet access, devices, and third-party services you choose may have their
          own costs.
        </p>
      </section>
      <section>
        <h2>3. Local use and online accounts</h2>
        <p>
          You can use Knowly locally without an online account. Email accounts are provided through
          Supabase Auth, and may require email confirmation. Keep your sign-in details secure,
          provide accurate account information, and tell us promptly if you believe someone has used
          your account without permission.
        </p>
        <p>
          When you sign in, your account can sync your library and notebook data across devices. You
          are responsible for choosing which local or cloud copy to keep when prompted and for
          keeping separate backups of anything important. Signing out does not delete your account
          or cloud data. Account deletion requests must be sent to the contact listed in our Privacy
          Policy.
        </p>
      </section>
      <section>
        <h2>4. Your content and permissions</h2>
        <p>
          You keep ownership of the study materials and other content you create or add. You are
          responsible for having the rights and permissions needed to use that content in Knowly.
          You give us a limited permission to store, process, back up, transmit, and display it only
          as needed to provide the features you use, including account sync and sharing. This
          permission ends when the content is removed, except for copies that remain temporarily in
          provider backups or are retained as required by law.
        </p>
      </section>
      <section>
        <h2>5. Sharing</h2>
        <p>
          You control whether a share link is available to anyone who has the link or restricted to
          invited, confirmed email accounts. You are responsible for selecting the right access
          setting and for sharing only material you are allowed to distribute. Anyone who can access
          a link may copy or retain the material. Removing a link prevents future access through
          that link but cannot retrieve copies already made by others.
        </p>
      </section>
      <section>
        <h2>6. Acceptable use</h2>
        <p>
          Do not use Knowly to break the law, infringe someone else’s rights, distribute malware,
          interfere with the service or its security, misuse another person’s account, or access
          data or share links without permission. Do not upload content that you have no right to
          store or share.
        </p>
      </section>
      <section>
        <h2>7. Third-party services and study content</h2>
        <p>
          Knowly may rely on third-party services for hosting, authentication, and cloud storage.
          Their own terms and privacy policies apply to your use of those services. Knowly does not
          send your study materials to an AI provider; if you copy prompts or content into an AI
          service yourself, you are responsible for reviewing that provider’s terms and output.
          Knowly is a study tool, not a teacher, examiner, or source of professional advice. Check
          imported or generated materials for accuracy and suitability.
        </p>
      </section>
      <section>
        <h2>8. Backups and availability</h2>
        <p>
          Local data may be lost if browser or device storage is cleared, the device is damaged, or
          the service is interrupted. Cloud sync is provided as a convenience, not a guaranteed
          backup service. Export your library regularly and keep copies in a safe place.
        </p>
        <p>
          We work to keep Knowly available, but we do not promise uninterrupted or error-free
          operation. We may update, suspend, or discontinue parts of the service for maintenance,
          security, legal, or operational reasons. Where practical, we will provide notice before a
          material change or discontinuation.
        </p>
      </section>
      <section>
        <h2>9. Knowly’s intellectual property</h2>
        <p>
          Copyright in Knowly’s original materials belongs to Frederic Liam De Guzman, except for
          third-party materials governed by their own licenses. Knowly’s original materials are
          licensed under the{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
          </a>
          . Those permissions apply only to the materials covered by that license. Using the service
          does not transfer ownership of Knowly’s protected materials to you.
        </p>
      </section>
      <section>
        <h2>10. Disclaimers and liability</h2>
        <p>
          To the extent allowed by law, Knowly is provided “as is” and “as available,” without a
          promise that it will meet every need or produce a particular grade or result. Nothing in
          these terms excludes rights or liability that cannot lawfully be excluded. To the maximum
          extent permitted by law, the operator is not liable for indirect or consequential loss
          arising from use of the service, including loss of data where a backup was not kept.
        </p>
      </section>
      <section>
        <h2>11. Ending use and changes to these terms</h2>
        <p>
          You can stop using Knowly at any time and sign out of your online account. To request
          deletion of an account and its cloud data, use the contact listed in the Privacy Policy.
          We may restrict or suspend access if these terms are seriously or repeatedly breached,
          where necessary to protect people, the service, or comply with law.
        </p>
        <p>
          We may update these terms as Knowly changes. Material updates will be posted here with a
          new effective date. If you do not agree to an update, stop using the service. Your
          mandatory consumer rights are not affected.
        </p>
      </section>
      <section>
        <h2>12. Contact</h2>
        <p>
          For questions about these terms, use the contact details in our{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
