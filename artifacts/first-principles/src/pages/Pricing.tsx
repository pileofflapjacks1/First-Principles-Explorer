import { useState } from "react";
import { Atom, Check, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetMe,
  useCreateStripeCheckoutSession,
  useCreateStripePortalSession,
} from "@workspace/api-client-react";

export function Pricing() {
  const { user } = useUser();
  const { data: account } = useGetMe();
  const isPro = account?.isPro ?? false;
  const [error, setError] = useState<string | null>(null);

  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );

  const checkoutMutation = useCreateStripeCheckoutSession({
    mutation: {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: () => {
        setError(
          "We couldn't start checkout. Please try again in a moment.",
        );
      },
    },
  });

  const portalMutation = useCreateStripePortalSession({
    mutation: {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: () => {
        setError("We couldn't open the billing portal. Please try again.");
      },
    },
  });

  const checkoutPending = checkoutMutation.isPending;
  const portalPending = portalMutation.isPending;

  return (
    <div className="min-h-screen bg-[hsl(224_71%_4%)] text-[hsl(213_31%_91%)]">
      <nav className="border-b border-[hsl(216_34%_17%)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
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

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(280_65%_60%/0.1)] border border-[hsl(280_65%_60%/0.25)] text-xs text-[hsl(280_65%_80%)]">
            <Sparkles className="w-3 h-3" />
            Plans
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Unlock the full first-principles experience
          </h1>
          <p className="text-[hsl(215.4_16.3%_66.9%)] text-base">
            Free covers the text breakdown, flowchart and Grokipedia links.
            Pro adds innovation-gap analysis with publicly traded companies,
            plus Grok Imagine visuals on every level and gap.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-2xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-[hsl(215.4_16.3%_46.9%)]">
                Free
              </p>
              <p className="text-3xl font-bold mt-1">$0</p>
              <p className="text-xs text-[hsl(215.4_16.3%_56.9%)]">
                Bring your own xAI key for text generation
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[hsl(215.4_16.3%_76.9%)]">
              <Feature>Hierarchical first-principles breakdown</Feature>
              <Feature>Interactive Mermaid flowchart</Feature>
              <Feature>Grokipedia "learn more" links</Feature>
              <Feature muted>No innovation gap analysis</Feature>
              <Feature muted>No AI image generation</Feature>
            </ul>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border-2 border-[hsl(210_100%_66%/0.4)] bg-gradient-to-b from-[hsl(210_100%_66%/0.06)] to-[hsl(280_65%_60%/0.04)] p-6 space-y-5 relative">
            <div className="absolute -top-3 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] text-[10px] font-bold uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Recommended
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wider text-[hsl(210_100%_75%)]">
                  Pro
                </p>
                <div className="inline-flex rounded-full border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_4%)] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBillingInterval("month")}
                    className={`px-2.5 py-1 rounded-full transition-colors ${
                      billingInterval === "month"
                        ? "bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] font-semibold"
                        : "text-[hsl(215.4_16.3%_66.9%)] hover:text-[hsl(213_31%_91%)]"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval("year")}
                    className={`px-2.5 py-1 rounded-full transition-colors inline-flex items-center gap-1 ${
                      billingInterval === "year"
                        ? "bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] font-semibold"
                        : "text-[hsl(215.4_16.3%_66.9%)] hover:text-[hsl(213_31%_91%)]"
                    }`}
                  >
                    Annual
                    <span
                      className={`text-[9px] px-1 py-0.5 rounded ${
                        billingInterval === "year"
                          ? "bg-[hsl(224_71%_4%)] text-[hsl(160_60%_70%)]"
                          : "bg-[hsl(160_60%_45%/0.15)] text-[hsl(160_60%_70%)]"
                      }`}
                    >
                      Save 25%
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {billingInterval === "year" ? "$9" : "$12"}
                  <span className="text-base font-normal text-[hsl(215.4_16.3%_56.9%)]">
                    /month
                  </span>
                </p>
                <p className="text-xs text-[hsl(215.4_16.3%_66.9%)]">
                  {billingInterval === "year"
                    ? "$108 billed annually — save $36/yr"
                    : "Server-hosted xAI key — no setup, just sign in"}
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-[hsl(213_31%_91%)]">
              <Feature>Everything in Free</Feature>
              <Feature highlight>
                Innovation gap cards with publicly traded companies
              </Feature>
              <Feature highlight>
                Grok Imagine visuals on every breakdown level
              </Feature>
              <Feature highlight>Concept-art images for every gap</Feature>
              <Feature highlight>Click-to-fullsize, regenerate any image</Feature>
              <Feature>Up to 100 images/month</Feature>
              <Feature>We host the xAI key — no quota juggling</Feature>
            </ul>

            {isPro ? (
              <div className="space-y-2">
                <div className="w-full text-center py-3 rounded-xl bg-[hsl(160_60%_45%/0.15)] text-[hsl(160_60%_70%)] text-sm font-semibold border border-[hsl(160_60%_45%/0.3)]">
                  You're on Pro — thanks!
                </div>
                <button
                  type="button"
                  disabled={portalPending}
                  onClick={() => {
                    setError(null);
                    portalMutation.mutate();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(224_71%_10%)] text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {portalPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Manage subscription
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={checkoutPending}
                  onClick={() => {
                    setError(null);
                    checkoutMutation.mutate({
                      data: { interval: billingInterval },
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] text-sm font-bold transition-colors disabled:opacity-60"
                >
                  {checkoutPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Upgrade to Pro
                </button>
                <p className="text-[10px] text-[hsl(215.4_16.3%_46.9%)] text-center">
                  Secure checkout via Stripe. Cancel anytime from your billing
                  portal.
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-[hsl(0_85%_70%)] text-center">
                {error}
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[hsl(215.4_16.3%_46.9%)]">
          Signed in as{" "}
          <span className="text-[hsl(213_31%_71%)] font-mono">
            {user?.primaryEmailAddress?.emailAddress ?? "—"}
          </span>
        </p>
      </div>
    </div>
  );
}

function Feature({
  children,
  highlight,
  muted,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-2 ${
        muted ? "opacity-50 line-through decoration-[hsl(215.4_16.3%_36.9%)]" : ""
      }`}
    >
      <Check
        className={`w-4 h-4 shrink-0 mt-0.5 ${
          highlight
            ? "text-[hsl(280_65%_75%)]"
            : "text-[hsl(160_60%_60%)]"
        }`}
      />
      <span>{children}</span>
    </li>
  );
}
