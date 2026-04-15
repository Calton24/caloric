import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - CalCut",
  description: "Terms of Service for CalCut app",
};

export default function TermsOfService() {
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: "1.6",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        Terms of Service
      </h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Last Updated: April 11, 2026
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          1. Acceptance of Terms
        </h2>
        <p>
          Welcome to CalCut. By accessing or using the CalCut mobile application
          (the "App"), you agree to be bound by these Terms of Service
          ("Terms"). If you do not agree to these Terms, do not use the App.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          2. Description of Service
        </h2>
        <p>
          CalCut is a nutrition tracking and meal logging application that helps
          users monitor their caloric intake, track meals, set dietary goals,
          and analyze nutrition data. The App includes features such as:
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Manual meal logging</li>
          <li>Camera-based food recognition</li>
          <li>Voice-based meal logging</li>
          <li>Calorie and macronutrient tracking</li>
          <li>Weight tracking and progress visualization</li>
          <li>Apple Health integration (iOS)</li>
          <li>Goal setting and personalized recommendations</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          3. User Accounts
        </h2>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          3.1 Registration
        </h3>
        <p>
          To use certain features of the App, you must create an account. You
          agree to:
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Provide accurate, current, and complete information</li>
          <li>Maintain and update your information to keep it accurate</li>
          <li>Maintain the security of your password</li>
          <li>Be responsible for all activities under your account</li>
          <li>Notify us immediately of any unauthorized access</li>
        </ul>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          3.2 Account Termination
        </h3>
        <p>
          You may delete your account at any time from the Settings screen. We
          may suspend or terminate your account if you violate these Terms or
          engage in fraudulent, abusive, or illegal activity.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          4. Subscriptions and Payments
        </h2>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          4.1 Subscription Plans
        </h3>
        <p>
          CalCut offers both free and paid subscription plans ("Pro"). Paid
          subscriptions provide access to premium features such as unlimited
          meal logs, advanced analytics, and priority support.
        </p>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          4.2 Billing
        </h3>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>
            Subscriptions are billed on a recurring basis (monthly or yearly)
          </li>
          <li>
            Payment is processed through Apple App Store or Google Play Store
          </li>
          <li>
            Subscriptions auto-renew unless canceled at least 24 hours before
            renewal
          </li>
          <li>
            You can manage or cancel subscriptions in your device's account
            settings
          </li>
        </ul>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          4.3 Free Trials
        </h3>
        <p>
          We may offer free trial periods for new subscribers. If you do not
          cancel before the trial ends, you will be charged for the
          subscription.
        </p>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          4.4 Refunds
        </h3>
        <p>
          Refunds are handled by Apple or Google according to their respective
          refund policies. We do not provide direct refunds for in-app
          purchases.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          5. User Content
        </h2>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          5.1 Your Content
        </h3>
        <p>
          You retain ownership of all content you submit to the App, including
          meal logs, photos, and other data ("User Content"). By submitting User
          Content, you grant us a limited license to store, process, and display
          it to provide the Service.
        </p>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          5.2 Prohibited Content
        </h3>
        <p>You agree NOT to submit content that:</p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Violates any law or regulation</li>
          <li>Infringes on intellectual property rights</li>
          <li>Contains harmful, offensive, or inappropriate material</li>
          <li>Includes spam, malware, or viruses</li>
          <li>Impersonates another person or entity</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          6. Medical Disclaimer
        </h2>
        <p>
          <strong style={{ color: "#d32f2f" }}>IMPORTANT:</strong> CalCut is NOT
          a medical device and does NOT provide medical advice, diagnosis, or
          treatment.
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>All nutrition data is estimated and may not be 100% accurate</li>
          <li>
            AI-powered food recognition is not perfect and may misidentify foods
          </li>
          <li>Calorie calculations are estimates based on general formulas</li>
          <li>
            Do NOT rely solely on this App for medical or dietary decisions
          </li>
          <li>
            Consult a qualified healthcare professional before starting any diet
          </li>
          <li>
            We are not liable for any health issues resulting from use of the
            App
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          7. Acceptable Use
        </h2>
        <p>You agree NOT to:</p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Use the App for any illegal purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Reverse engineer, decompile, or disassemble the App</li>
          <li>Use automated scripts or bots to abuse the Service</li>
          <li>Interfere with or disrupt the App's functionality</li>
          <li>Collect or harvest data from other users</li>
          <li>Resell or redistribute the App or its content</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          8. Intellectual Property
        </h2>
        <p>
          The App and its content (excluding User Content) are owned by CalCut
          and protected by copyright, trademark, and other intellectual property
          laws. You may not copy, modify, distribute, or create derivative works
          without our written permission.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          9. Third-Party Services
        </h2>
        <p>
          The App integrates with third-party services such as Apple Health,
          Google Sign-In, and payment processors. Your use of these services is
          subject to their respective terms and privacy policies. We are not
          responsible for third-party services.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          10. Disclaimers
        </h2>
        <p>
          THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
          ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>
            Warranties of merchantability or fitness for a particular purpose
          </li>
          <li>Accuracy, reliability, or completeness of nutrition data</li>
          <li>Uninterrupted or error-free operation</li>
          <li>Security of data transmission</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          11. Limitation of Liability
        </h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CALCUT SHALL NOT BE LIABLE FOR
          ANY:
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Indirect, incidental, special, or consequential damages</li>
          <li>Loss of profits, data, or business opportunities</li>
          <li>Personal injury or property damage</li>
          <li>Reliance on nutrition data or recommendations</li>
        </ul>
        <p style={{ marginTop: "1rem" }}>
          OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP
          IN THE PAST 12 MONTHS, OR $100, WHICHEVER IS LESS.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          12. Indemnification
        </h2>
        <p>
          You agree to indemnify and hold CalCut harmless from any claims,
          damages, losses, or expenses (including legal fees) arising from:
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Your use of the App</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
          <li>Your User Content</li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          13. Data Privacy
        </h2>
        <p>
          Your use of the App is also governed by our{" "}
          <a
            href="/privacy"
            style={{ color: "#6366F1", textDecoration: "underline" }}
          >
            Privacy Policy
          </a>
          , which explains how we collect, use, and protect your personal
          information.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          14. Changes to Terms
        </h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify
          you of significant changes via email or in-app notification. Your
          continued use of the App after changes constitutes acceptance of the
          updated Terms.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          15. Termination
        </h2>
        <p>
          We may suspend or terminate your access to the App at any time, with
          or without notice, for any violation of these Terms or for any other
          reason. Upon termination:
        </p>
        <ul style={{ marginLeft: "1.5rem" }}>
          <li>Your right to use the App immediately ceases</li>
          <li>We may delete your account and data</li>
          <li>
            Provisions that should survive termination will remain in effect
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          16. Governing Law
        </h2>
        <p>
          These Terms are governed by the laws of [Your Jurisdiction], without
          regard to conflict of law principles. Any disputes will be resolved in
          the courts of [Your Jurisdiction].
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          17. Dispute Resolution
        </h2>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          17.1 Informal Resolution
        </h3>
        <p>
          Before filing a legal claim, you agree to contact us to attempt to
          resolve the dispute informally.
        </p>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          17.2 Arbitration (US Users)
        </h3>
        <p>
          If you are a US user, disputes will be resolved through binding
          arbitration rather than in court, except for small claims court
          disputes.
        </p>

        <h3
          style={{
            fontSize: "1.25rem",
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          17.3 Class Action Waiver
        </h3>
        <p>
          You agree to resolve disputes on an individual basis only, NOT as part
          of a class action, consolidated action, or representative action.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          18. Severability
        </h2>
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, the remaining provisions will remain in full force and
          effect.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
          19. Contact Us
        </h2>
        <p>If you have questions about these Terms, please contact us:</p>
        <ul style={{ marginLeft: "1.5rem", listStyle: "none" }}>
          <li>
            <strong>Email:</strong> support@calcutapp.com
          </li>
          <li>
            <strong>Website:</strong> https://calcut.app
          </li>
        </ul>
      </section>

      <hr style={{ margin: "3rem 0", borderColor: "#e0e0e0" }} />

      <p style={{ color: "#666", fontSize: "0.875rem" }}>
        These Terms of Service are effective as of April 11, 2026.
      </p>
    </main>
  );
}
