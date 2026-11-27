import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Knowly" },
      {
        name: "description",
        content:
          "Learn how Knowly handles local study data, account details, cloud sync, and resources you choose to share.",
      },
      { property: "og:title", content: "Privacy Policy — Knowly" },
      {
        property: "og:description",
        content:
          "How Knowly handles local study data, account details, cloud sync, and resources you choose to share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="How your information is handled"
      title="Privacy policy"
      intro="This policy applies to the Knowly app, its online accounts, optional cloud sync, and sharing features. Knowly is local-first: your study library can stay on your device, and signing in enables a private cloud copy that follows your account."
    >
      <section>
        <h2>1. Who operates Knowly?</h2>
        <p>
          Knowly is developed and operated by Frederic Liam De Guzman (“Knowly,” “we,” “us,” or
          “our”). For privacy questions or requests, use the contact details published here:
          <strong> [Add a monitored privacy contact email before publication.]</strong>
        </p>
      </section>
      <section>
        <h2>2. Information stored on your device</h2>
        <p>
          Knowly stores the information needed to run your study space, including decks and
          questions, courses and modules, notes and notebook pages, bookmarks, quiz results, study
          history, progress, settings, and profile preferences. Depending on the features you use,
          this may also include avatar or wallpaper images. App data is stored in your browser or
          app storage, including IndexedDB and local storage.
        </p>
        <p>
          This local information stays on the device unless you sign in and sync it, create a share
          link, or otherwise choose to send it to an online service. Clearing the app or browser
          storage removes the local copy, but does not remove a copy already synced to your account
          or included in a share link.
        </p>
      </section>
      <section>
        <h2>3. Accounts and cloud sync</h2>
        <p>
          You can use Knowly locally without an online account. If you create or sign in to an
          account with your email address, Supabase Auth processes the account details needed to
          authenticate you, such as your email address and account identifier. Depending on your
          account settings, it may also process email-confirmation and password-reset requests.
        </p>
        <p>
          When signed in, Knowly syncs a copy of your study library and notebook data to the
          configured Supabase project. This can include decks, questions, courses, modules,
          progress, study history, settings, profile images, wallpaper data, notebook pages, saved
          restore points, and the extra text pages used in module print layouts. Shared resources
          are stored separately as share links. The database uses row-level security so an account
          can access its own app-state record. Sync is not end-to-end encrypted by Knowly; do not
          sync information you are not comfortable storing with the service provider.
        </p>
        <p>
          Signing out stops syncing on that device but does not delete your account or the cloud
          copy. The Account &amp; cloud sync page lets you export the local and cloud copies and
          choose which one to restore. Knowly does not currently provide a self-service account
          deletion control. To request account and cloud-data deletion, contact the operator using
          the privacy contact above. Deletion may take time to propagate through provider backups
          and logs.
        </p>
      </section>
      <section>
        <h2>4. Resources you choose to share</h2>
        <p>
          If you create a share link, Knowly sends a snapshot of the selected deck, course, module,
          practice quiz, or print exam to Supabase, together with its title, access setting, and any
          invited email addresses. “Anyone with the link” allows anyone who has the link to view
          that snapshot. Restricted links are limited to signed-in accounts with a confirmed email
          address on the invite list. Share links remain available until you remove them or the
          associated account is deleted. Anyone who has already viewed or copied shared material may
          keep their own copy.
        </p>
      </section>
      <section>
        <h2>5. AI tools and other services</h2>
        <p>
          Knowly does not send your study materials to an AI provider. Prompt Forge creates text for
          you to copy; if you paste that text or your study materials into a third-party AI service,
          that provider handles the information under its own terms and privacy policy.
        </p>
      </section>
      <section>
        <h2>6. Service providers, cookies, and technical data</h2>
        <p>
          Supabase provides account authentication, cloud storage, and share-link delivery. Review
          its{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Privacy Policy
          </a>{" "}
          for its data practices. The website is delivered by its configured hosting provider. These
          providers process data under their own privacy terms and may process it in locations
          outside your country. A hosting or infrastructure provider may also create technical
          request, security, or error logs to operate the service.
        </p>
        <p>
          Knowly uses browser storage for your library, preferences, and sign-in session. The app
          does not use advertising cookies or sell personal information. We do not currently run
          product analytics in the app. Your browser or service providers may apply their own
          essential storage and logging practices.
        </p>
      </section>
      <section>
        <h2>7. Retention, export, and deletion</h2>
        <p>
          Local data remains on your device until you remove it in Knowly or clear the app or
          browser storage. Cloud data and share-link snapshots remain until you overwrite or delete
          them, or the account is deleted. Signing out alone does not delete either. JSON export
          lets you keep a copy of your local or cloud library. Copies you download are under your
          control.
        </p>
      </section>
      <section>
        <h2>8. Your choices and privacy rights</h2>
        <p>
          You can edit or remove study content in Knowly, export your library, and clear local app
          data through your browser or device storage controls. You may also request access to,
          correction of, or deletion of account information, subject to applicable law and
          legitimate retention requirements. Send requests to the privacy contact above. You can
          withdraw from cloud sync by signing out; to remove the cloud copy, make a deletion
          request.
        </p>
      </section>
      <section>
        <h2>9. Security and children’s privacy</h2>
        <p>
          We use account access controls, including Supabase row-level security, to protect cloud
          records. No storage or transmission method is completely secure, so keep backups of
          important work and do not share links to material you want to keep private.
        </p>
        <p>
          Knowly is designed as a study tool and is not directed to children under 13. If you
          believe a child has provided account information, contact the operator using the privacy
          contact above so it can be reviewed and removed as required by law.
        </p>
      </section>
      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          We may update this policy when the service or its data practices change. Material changes
          will be reflected here with a new effective date. The current version applies from the
          date shown above.
        </p>
      </section>
    </LegalPage>
  );
}
