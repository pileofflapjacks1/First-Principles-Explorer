import { Link } from "wouter";
import { Atom, ArrowLeft } from "lucide-react";

export function Privacy() {
  return (
    <div className="min-h-screen bg-[hsl(224_71%_4%)] text-[hsl(213_31%_91%)]">
      <nav className="border-b border-[hsl(216_34%_17%)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-[hsl(215.4_16.3%_56.9%)] hover:text-[hsl(213_31%_91%)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[hsl(210_100%_66%/0.15)] flex items-center justify-center">
              <Atom className="w-4 h-4 text-[hsl(210_100%_66%)]" />
            </div>
            <span className="font-bold text-sm">FirstPrinciples Explorer</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-[hsl(215.4_16.3%_56.9%)] mt-2">
            Last updated: May 13, 2025
          </p>
        </div>

        <Section title="1. Information We Collect">
          <p>We collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Account information:</strong> When you sign in via Clerk, we receive your
              email address and a unique user identifier. We store this in our database to manage
              your subscription and usage.
            </li>
            <li>
              <strong>Usage data:</strong> We track the number of AI images you generate each
              month and the number of topic credits you have remaining. We do not store the
              breakdown results or topics you search for.
            </li>
            <li>
              <strong>Payment information:</strong> Payments are processed by Stripe. We receive
              and store your Stripe customer ID and subscription status. We never see or store your
              full card details.
            </li>
            <li>
              <strong>API keys (free tier):</strong> If you use the free tier with your own xAI
              API key, that key is stored only in your browser's local storage. It is never sent
              to our servers.
            </li>
            <li>
              <strong>Server logs:</strong> Our servers log standard request metadata (HTTP method,
              URL path, response status, timestamp) for debugging and security monitoring. Logs do
              not contain request bodies or AI-generated content.
            </li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul>
            <li>To authenticate you and manage your account.</li>
            <li>To enforce subscription entitlements and usage quotas.</li>
            <li>To process payments and manage billing via Stripe.</li>
            <li>To detect and prevent abuse, fraud, or violations of our Terms of Service.</li>
            <li>To improve the reliability and performance of the Service.</li>
          </ul>
        </Section>

        <Section title="3. Third-Party Services">
          <p>We rely on the following third-party services, each of which has its own privacy policy:</p>
          <ul>
            <li>
              <strong>Clerk</strong> — Authentication and user management.{" "}
              <a
                href="https://clerk.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(210_100%_66%)] hover:underline"
              >
                clerk.com/privacy
              </a>
            </li>
            <li>
              <strong>Stripe</strong> — Payment processing and billing.{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(210_100%_66%)] hover:underline"
              >
                stripe.com/privacy
              </a>
            </li>
            <li>
              <strong>xAI</strong> — AI text and image generation. Topics you enter are sent to
              xAI's API for processing. Free-tier users send their own API key directly from the
              browser; Pro users' requests are proxied through our server.{" "}
              <a
                href="https://x.ai/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(210_100%_66%)] hover:underline"
              >
                x.ai/privacy
              </a>
            </li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <p>
            We retain your account and billing data for as long as your account exists. Server
            logs are retained for up to 30 days. If you delete your account, your personal data
            is removed from our systems within 30 days, except where retention is required by law
            (e.g., financial records).
          </p>
        </Section>

        <Section title="5. Cookies and Local Storage">
          <p>
            We use session cookies to keep you signed in (managed by Clerk). The free-tier xAI
            API key is stored in your browser's local storage and is not accessible to our servers.
            We do not use third-party tracking or advertising cookies.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We use industry-standard security practices including HTTPS encryption for all data in
            transit, server-side validation of all requests, and access controls on our database.
            However, no method of transmission over the internet is 100% secure.
          </p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            The Service is not directed at children under 13. We do not knowingly collect personal
            information from children. If you believe a child has provided us with personal
            information, please contact us and we will delete it.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, or delete your
            personal data, or to object to or restrict certain processing. To exercise these rights,
            please contact us. You can delete your account at any time through your account
            settings.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material
            changes by updating the "Last updated" date above. Continued use of the Service after
            changes are posted constitutes your acceptance of the revised Policy.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            If you have questions or concerns about this Privacy Policy or how we handle your data,
            please reach out via the contact information on our site.
          </p>
        </Section>

        <div className="pt-4 border-t border-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_46.9%)] flex gap-4">
          <Link href="/terms" className="hover:text-[hsl(213_31%_71%)] transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-[hsl(213_31%_71%)] transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[hsl(213_31%_91%)]">{title}</h2>
      <div className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
