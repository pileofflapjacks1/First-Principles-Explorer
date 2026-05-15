import { Link } from "wouter";
import { ArrowLeft, Atom, Zap, Star, Layers } from "lucide-react";

export function Products() {
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
            <span className="font-bold text-sm">Zwyppy</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products &amp; Services</h1>
          <p className="text-sm text-[hsl(215.4_16.3%_56.9%)] mt-2">
            Last updated: May 14, 2025
          </p>
          <p className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed mt-4">
            Zwyppy is an AI-powered research tool that breaks down any topic into
            its fundamental principles — producing hierarchical concept maps, interactive Mermaid
            flowcharts, innovation-gap analysis, and AI-generated concept visuals. Below is a
            complete description of the products and services we offer.
          </p>
        </div>

        <ProductCard
          icon={<Layers className="w-5 h-5 text-[hsl(215.4_16.3%_66.9%)]" />}
          title="Free Tier"
          badge="No charge"
          badgeColor="hsl(215.4_16.3%_36.9%)"
        >
          <p>
            Available to all registered users at no cost. The free tier lets you explore the full
            first-principles breakdown workflow using your own xAI API key.
          </p>
          <FeatureList>
            <li>Hierarchical first-principles breakdowns (atoms → application) for any topic</li>
            <li>Interactive Mermaid flowchart with clickable nodes</li>
            <li>Grokipedia "learn more" links for every concept level</li>
            <li>Export to JSON</li>
            <li>Shareable links</li>
            <li>
              Requires a personal xAI API key for AI text generation and image generation (key is
              stored only in your browser; never sent to our servers)
            </li>
          </FeatureList>
        </ProductCard>

        <ProductCard
          icon={<Star className="w-5 h-5 text-[hsl(210_100%_66%)]" />}
          title="Zwyppy Pro — Monthly Subscription"
          badge="$12.00 / month"
          badgeColor="hsl(210_100%_66%)"
        >
          <p>
            A recurring monthly subscription that unlocks the full Pro feature set with
            server-hosted AI — no personal API key required. Billed on the same calendar date each
            month. Cancel any time; access continues until the end of the current billing period.
          </p>
          <FeatureList>
            <li>Everything in the Free tier</li>
            <li>Innovation-gap cards: real publicly traded companies positioned in each gap</li>
            <li>
              Server-hosted AI image generation on every concept level and every innovation gap (up
              to 100 images per calendar month, reset on the 1st of each month)
            </li>
            <li>One-click image regeneration on any card</li>
            <li>No personal xAI API key required — AI runs on our servers</li>
            <li>Priority support</li>
          </FeatureList>
          <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] mt-3">
            Recurring charge of $12.00 USD per month. Automatically renews until cancelled.
            Manage or cancel your subscription at any time through the billing portal on the
            Pricing page.
          </p>
        </ProductCard>

        <ProductCard
          icon={<Star className="w-5 h-5 text-[hsl(280_65%_75%)]" />}
          title="Zwyppy Pro — Annual Subscription"
          badge="$108.00 / year ($9/month)"
          badgeColor="hsl(280_65%_75%)"
        >
          <p>
            Same Pro features as the monthly plan, billed as a single annual charge. Save ~25%
            versus paying month-to-month. Billed once per year on the anniversary of your
            subscription start date.
          </p>
          <FeatureList>
            <li>All Pro features listed above</li>
            <li>Equivalent to $9.00 USD per month (vs. $12.00 on the monthly plan)</li>
          </FeatureList>
          <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] mt-3">
            Single charge of $108.00 USD per year. Automatically renews annually until cancelled.
            Manage or cancel through the billing portal on the Pricing page.
          </p>
        </ProductCard>

        <ProductCard
          icon={<Zap className="w-5 h-5 text-[hsl(38_92%_50%)]" />}
          title="Topic Credits — One-Time Purchase"
          badge="One-time · Credits never expire"
          badgeColor="hsl(38_92%_50%)"
        >
          <p>
            Topic Credits let you run individual Pro-quality breakdowns without subscribing. Each
            credit unlocks one full server-hosted AI breakdown — including innovation-gap analysis
            and AI-generated images — for a single topic. Credits are tied to your account and
            never expire.
          </p>
          <p className="mt-2 font-medium text-[hsl(213_31%_91%)]">Available packs:</p>
          <div className="mt-3 grid sm:grid-cols-3 gap-4">
            <CreditPack amount="$3.00" credits={1} label="1 Topic Credit" note="One-time" />
            <CreditPack amount="$12.00" credits={5} label="5 Topic Credits" note="Save 20%" />
            <CreditPack amount="$22.00" credits={10} label="10 Topic Credits" note="Best value" />
          </div>
          <FeatureList className="mt-4">
            <li>Full server-hosted AI breakdown (innovation gaps + AI images)</li>
            <li>No subscription required</li>
            <li>Credits never expire and carry over indefinitely</li>
            <li>No personal xAI API key needed for credit-based sessions</li>
          </FeatureList>
          <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] mt-3">
            One-time charges only — there is no recurring billing for Topic Credits. All prices in
            USD.
          </p>
        </ProductCard>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[hsl(213_31%_91%)]">
            Billing &amp; Refund Policy
          </h2>
          <div className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed space-y-3">
            <p>
              All payments are processed securely by{" "}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[hsl(213_31%_91%)] transition-colors"
              >
                Stripe
              </a>
              . We do not store your payment card details.
            </p>
            <p>
              Subscription charges are non-refundable for the current billing period. You may
              cancel a subscription at any time and your Pro access will continue until the end of
              the period you have already paid for. Topic Credit purchases are non-refundable once
              processed, except where required by applicable law.
            </p>
            <p>
              If your payment fails, Pro access is suspended until payment is resolved. Topic
              Credits are not affected by subscription status.
            </p>
            <p>
              To manage, pause, or cancel a subscription, visit the Pricing page and click "Manage
              Subscription" in the billing portal.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[hsl(213_31%_91%)]">Contact</h2>
          <p className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed">
            If you have questions about our products, pricing, or billing, please use the contact
            information available on our site.
          </p>
        </section>

        <div className="pt-4 border-t border-[hsl(216_34%_17%)] text-xs text-[hsl(215.4_16.3%_46.9%)] flex gap-4">
          <Link href="/terms" className="hover:text-[hsl(213_31%_71%)] transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-[hsl(213_31%_71%)] transition-colors">
            Privacy Policy
          </Link>
          <Link href="/pricing" className="hover:text-[hsl(213_31%_71%)] transition-colors">
            Pricing
          </Link>
          <Link href="/" className="hover:text-[hsl(213_31%_71%)] transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  icon,
  title,
  badge,
  badgeColor,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_6%)] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[hsl(224_71%_9%)] border border-[hsl(216_34%_17%)] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-[hsl(213_31%_91%)]">{title}</h2>
          <span
            className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full border"
            style={{
              color: badgeColor,
              borderColor: `color-mix(in srgb, ${badgeColor} 40%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${badgeColor} 10%, transparent)`,
            }}
          >
            {badge}
          </span>
        </div>
      </div>
      <div className="text-sm text-[hsl(215.4_16.3%_76.9%)] leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function FeatureList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <ul className={`list-disc pl-5 space-y-1.5 text-sm text-[hsl(215.4_16.3%_76.9%)] ${className}`}>
      {children}
    </ul>
  );
}

function CreditPack({
  amount,
  credits,
  label,
  note,
}: {
  amount: string;
  credits: number;
  label: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_4%)] p-4 text-center">
      <p className="text-xl font-bold text-[hsl(38_92%_50%)]">{amount}</p>
      <p className="text-xs text-[hsl(215.4_16.3%_46.9%)] mt-0.5">one-time · {note}</p>
      <p className="text-sm font-medium text-[hsl(213_31%_91%)] mt-2">{label}</p>
      <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] mt-1">
        {credits === 1 ? "1 breakdown" : `${credits} breakdowns`}
      </p>
    </div>
  );
}
