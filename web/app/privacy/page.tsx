import type { Metadata } from "next";
import { LegalPageShell } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy - CalCut",
  description: "Privacy Policy for CalCut app",
};

export default function Page() {
  return (
    <LegalPageShell title="Privacy Policy" updatedAt="April 11, 2026">

      <section>
        <h2>
          1. Introduction
        </h2>
        <p>
          Welcome to CalCut ("we," "our," or "us"). We are committed to
          protecting your privacy and ensuring you have a positive experience
          when using our mobile application (the "App"). This Privacy Policy
          explains how we collect, use, share, and protect your personal
          information.
        </p>
      </section>

      <section>
        <h2>
          2. Information We Collect
        </h2>

        <h3
        >
          2.1 Information You Provide
        </h3>
        <ul>
          <li>
            <strong>Account Information:</strong> Email address, name
            (optional), password
          </li>
          <li>
            <strong>Profile Information:</strong> Weight, height, age, gender,
            activity level, dietary goals
          </li>
          <li>
            <strong>Nutrition Data:</strong> Meal logs, calorie intake,
            macronutrients, food photos
          </li>
          <li>
            <strong>Health Data:</strong> Weight logs, Apple Health data (with
            your permission)
          </li>
          <li>
            <strong>Voice Data:</strong> Voice recordings when using voice
            logging feature (processed locally or via speech recognition API)
          </li>
          <li>
            <strong>Photos:</strong> Food images when using camera logging
            feature
          </li>
        </ul>

        <h3
        >
          2.2 Automatically Collected Information
        </h3>
        <ul>
          <li>
            <strong>Device Information:</strong> Device type, operating system,
            unique device identifiers
          </li>
          <li>
            <strong>Usage Data:</strong> Features used, screens viewed, time
            spent in app (analytics)
          </li>
          <li>
            <strong>Log Data:</strong> IP address, crash reports, error logs
          </li>
          <li>
            <strong>Location Data:</strong> We do NOT collect precise location
            data
          </li>
        </ul>
      </section>

      <section>
        <h2>
          3. How We Use Your Information
        </h2>
        <ul>
          <li>Provide and maintain the App's core functionality</li>
          <li>
            Calculate your personalized nutrition goals and recommendations
          </li>
          <li>Analyze food images and voice inputs to log meals</li>
          <li>Sync data with Apple Health (with your permission)</li>
          <li>Send notifications and reminders (with your permission)</li>
          <li>Improve the App through analytics and usage patterns</li>
          <li>Provide customer support and respond to your inquiries</li>
          <li>Detect, prevent, and address technical issues and fraud</li>
          <li>Process subscription payments via RevenueCat/Apple/Google</li>
        </ul>
      </section>

      <section>
        <h2>
          4. How We Share Your Information
        </h2>
        <p>
          We do NOT sell your personal information. We only share data with:
        </p>

        <h3
        >
          Service Providers
        </h3>
        <ul>
          <li>
            <strong>Supabase:</strong> Backend database and authentication
          </li>
          <li>
            <strong>RevenueCat:</strong> Subscription management
          </li>
          <li>
            <strong>PostHog:</strong> Analytics (only if you consent)
          </li>
          <li>
            <strong>Sentry:</strong> Error reporting and crash analytics
          </li>
          <li>
            <strong>Apple/Google:</strong> In-app purchases and sign-in
          </li>
          <li>
            <strong>ML Kit / Cloud Vision:</strong> Food image recognition
            (images processed, not stored)
          </li>
        </ul>

        <h3
        >
          Legal Requirements
        </h3>
        <p>
          We may disclose your information if required by law, court order, or
          government request.
        </p>
      </section>

      <section>
        <h2>
          5. Data Retention
        </h2>
        <ul>
          <li>
            Account and nutrition data: Retained until you delete your account
          </li>
          <li>
            Voice recordings: Processed in real-time, not stored permanently
          </li>
          <li>Food images: Stored in your account, can be deleted anytime</li>
          <li>Analytics data: Anonymized and retained for up to 2 years</li>
          <li>Crash logs: Retained for 90 days</li>
        </ul>
      </section>

      <section>
        <h2>
          6. Your Rights and Choices
        </h2>

        <h3
        >
          Access and Portability
        </h3>
        <p>
          You can export all your data (meals, weight logs) as CSV from the
          Settings screen.
        </p>

        <h3
        >
          Delete Your Account
        </h3>
        <p>
          You can delete your account and all associated data from Settings →
          Account → Delete Account. This action is permanent and cannot be
          undone.
        </p>

        <h3
        >
          Manage Consent
        </h3>
        <ul>
          <li>Analytics: Opt-in/out in Settings → Privacy</li>
          <li>
            Cross-app tracking (iOS): Manage in iOS Settings → Privacy →
            Tracking
          </li>
          <li>Marketing emails: Unsubscribe link in every email</li>
          <li>Notifications: Manage in device settings</li>
        </ul>

        <h3
        >
          GDPR Rights (EU Users)
        </h3>
        <p>If you are in the European Union, you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Delete your data ("right to be forgotten")</li>
          <li>Restrict processing</li>
          <li>Data portability</li>
          <li>Object to processing</li>
        </ul>

        <h3
        >
          CCPA Rights (California Users)
        </h3>
        <p>If you are a California resident, you have the right to:</p>
        <ul>
          <li>Know what personal information we collect</li>
          <li>Know if we sell or share personal information (we do NOT)</li>
          <li>Access your personal information</li>
          <li>Delete your personal information</li>
          <li>Non-discrimination for exercising your rights</li>
        </ul>
      </section>

      <section>
        <h2>
          7. Data Security
        </h2>
        <p>We implement industry-standard security measures:</p>
        <ul>
          <li>Encryption in transit (HTTPS/TLS)</li>
          <li>Encryption at rest (database encryption)</li>
          <li>Secure authentication (OAuth, password hashing)</li>
          <li>Row-level security policies in database</li>
          <li>Regular security audits and monitoring</li>
        </ul>
        <p>
          However, no method of transmission over the internet is 100% secure.
          While we strive to protect your data, we cannot guarantee absolute
          security.
        </p>
      </section>

      <section>
        <h2>
          8. Children's Privacy
        </h2>
        <p>
          CalCut is not intended for children under 13 years of age. We do not
          knowingly collect personal information from children under 13. If you
          believe we have collected information from a child under 13, please
          contact us immediately.
        </p>
      </section>

      <section>
        <h2>
          9. International Data Transfers
        </h2>
        <p>
          Your data may be processed in countries other than your own. We use
          Supabase (cloud infrastructure) which may store data in the United
          States or other regions. We ensure appropriate safeguards are in place
          for international transfers.
        </p>
      </section>

      <section>
        <h2>
          10. Changes to This Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of significant changes by email or in-app notification. Your
          continued use of the App after changes constitutes acceptance of the
          updated policy.
        </p>
      </section>

      <section>
        <h2>
          11. Contact Us
        </h2>
        <p>
          If you have questions about this Privacy Policy or want to exercise
          your rights, please contact us:
        </p>
        <ul>
          <li>
            <strong>Email:</strong> support@calcutapp.com
          </li>
          <li>
            <strong>Website:</strong> https://calcut.app
          </li>
        </ul>
      </section>

      <section>
        <h2>
          12. Third-Party Links
        </h2>
        <p>
          The App may contain links to third-party websites or services. We are
          not responsible for the privacy practices of these third parties.
          Please review their privacy policies separately.
        </p>
      </section>

      <hr />

      <p className="legal-note">
          This Privacy Policy is effective as of April 11, 2026.
      </p>
    </LegalPageShell>
  );
}
