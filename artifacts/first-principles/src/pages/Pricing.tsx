import { useState, useEffect } from "react";
import { Atom, Check, Sparkles, ArrowLeft, Loader2, Zap, ChevronRight } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetMe,
  getGetMeQueryKey,
  useCreateStripeCheckoutSession,
  useCreateStripePortalSession,
  useCreateCreditCheckoutSession,
} from "@workspace/api-client-react";

const CREDIT_PACKS = [
  { pack: "1" as const, credits: 1, price: "$3", priceNote: "one-time" },
  { pack: "10" as const, credits: 10, price: "$22", priceNote: "one-time · best value" },
];

export function Pricing() {
  const { user, isSignedIn } = useUser();
  const { data: account, refetch: refetchAccount } = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });
  const isPro = account?.isPro ?? false;
  const topicCredits = account?.topicCredits ?? 0;
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [selectedPack, setSelectedPack] = useState<"1" | "10">("10");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [creditPending, setCreditPending] = useState(false);

  const search = useSearch();
  const params = new URLSearchParams(search);
  const checkoutSuccess = params.get("checkout") === "success";
  const creditsSuccess = params.get("credits") === "success";

  const checkoutMutation = useCreateStripeCheckoutSession({
    mutation: {
      onSuccess: (data) => { window.location.href = data.url; },
      onError: () => { setCheckoutPending(false); setError("We couldn't start checkout. Please try again in a moment."); },
    },
  });

  const portalMutation = useCreateStripePortalSession({
    mutation: {
      onSuccess: (data) => { window.location.href = data.url; },
      onError: () => { setPortalPending(false); setError("We couldn't open the billing portal. Please try again."); },
    },
  });

  const creditMutation = useCreateCreditCheckoutSession({
    mutation: {
      onSuccess: async (data) => {
        await refetchAccount();
        window.location.href = data.url;
      },
      onError: () => { setCreditPending(false); setError("We couldn't start checkout. Please try again in a moment."); },
    },
  });

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const activePack = CREDIT_PACKS.find((p) => p.pack === selectedPack)!;

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
        {/* Success banners */}
        {checkoutSuccess && (
          <div className="rounded-xl border border-[hsl(160_60%_45%/0.4)] bg-[hsl(160_60%_45%/0.1)] px-5 py-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-[hsl(160_60%_60%)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[hsl(160_60%_75%)]">You're on Pro — welcome!</p>
              <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-0.5">All Pro features are now unlocked. Enjoy AI visuals, innovation gaps, and stock analysis.</p>
            </div>
          </div>
        )}
        {creditsSuccess && (
          <div className="rounded-xl border border-[hsl(38_92%_50%/0.4)] bg-[hsl(38_92%_50%/0.08)] px-5 py-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-[hsl(38_92%_60%)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[hsl(38_92%_70%)]">Credits added!</p>
              <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-0.5">
                Your topic credits are ready to use.
                {topicCredits > 0 && ` You now have ${topicCredits} credit${topicCredits !== 1 ? "s" : ""}.`}
              </p>
            </div>
          </div>
        )}

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
            Credits or Pro adds innovation-gap analysis, stock insights, and AI visuals.
          </p>
        </div>

        {/* Three-column pricing grid */}
        <div className="grid md:grid-cols-3 gap-4 items-stretch">

          {/* Free */}
          <div className="rounded-2xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] p-6 flex flex-col space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-[hsl(215.4_16.3%_46.9%)]">Free</p>
              <p className="text-3xl font-bold mt-1">$0</p>
              <p className="text-xs text-[hsl(215.4_16.3%_56.9%)]">Browse the app, no signup required</p>
            </div>
            <ul className="space-y-2 text-sm text-[hsl(215.4_16.3%_76.9%)] flex-1">
              <Feature>View the transistor example breakdown</Feature>
              <Feature>Explore the interactive flowchart</Feature>
              <Feature>See what a full breakdown looks like</Feature>
              <Feature muted>No AI breakdowns</Feature>
              <Feature muted>No innovation gap analysis</Feature>
              <Feature muted>No AI image generation</Feature>
            </ul>
            <div className="pt-1">
              <div className="w-full text-center py-3 rounded-xl border border-[hsl(216_34%_17%)] text-sm text-[hsl(215.4_16.3%_46.9%)]">
                Current plan
              </div>
            </div>
          </div>

          {/* Topic Credits */}
          {!isPro && (
            <div className="rounded-2xl border border-[hsl(38_92%_50%/0.35)] bg-gradient-to-b from-[hsl(38_92%_50%/0.06)] to-[hsl(38_92%_50%/0.02)] p-6 flex flex-col space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs uppercase tracking-wider text-[hsl(38_92%_65%)]">Topic Credits</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_70%)] border border-[hsl(38_92%_50%/0.3)] font-semibold uppercase tracking-wide">One-time</span>
                </div>
                {/* Pack selector */}
                <div className="inline-flex rounded-full border border-[hsl(38_92%_50%/0.3)] bg-[hsl(224_71%_4%)] p-0.5 text-[11px] mb-3">
                  {CREDIT_PACKS.map((p) => (
                    <button
                      key={p.pack}
                      type="button"
                      onClick={() => setSelectedPack(p.pack)}
                      className={`px-2.5 py-1 rounded-full transition-colors ${selectedPack === p.pack ? "bg-[hsl(38_92%_50%)] text-[hsl(224_71%_4%)] font-semibold" : "text-[hsl(215.4_16.3%_66.9%)] hover:text-[hsl(213_31%_91%)]"}`}
                    >
                      {p.credits} credit{p.credits > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-3xl font-bold">{activePack.price}</p>
                <p className="text-xs text-[hsl(215.4_16.3%_56.9%)]">{activePack.priceNote}</p>
              </div>
              <ul className="space-y-2 text-sm text-[hsl(213_31%_91%)] flex-1">
                <Feature zap>Full server-hosted breakdown</Feature>
                <Feature zap>Innovation gap cards + companies</Feature>
                <Feature zap>AI images for every level</Feature>
                <Feature zap>No xAI key required</Feature>
                <Feature zap>Credits never expire</Feature>
              </ul>
              {topicCredits > 0 && (
                <p className="text-xs font-semibold text-[hsl(38_92%_70%)]">
                  You have {topicCredits} credit{topicCredits !== 1 ? "s" : ""} remaining.
                </p>
              )}
              <button
                type="button"
                disabled={creditPending}
                onClick={() => { setError(null); setCreditPending(true); creditMutation.mutate({ data: { pack: activePack.pack } }); }}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(38_92%_50%)] hover:bg-[hsl(38_92%_44%)] text-[hsl(224_71%_4%)] text-sm font-bold transition-colors disabled:opacity-60"
              >
                {creditPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Buy {activePack.credits} credit{activePack.credits > 1 ? "s" : ""} · {activePack.price}
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-[10px] text-[hsl(215.4_16.3%_46.9%)] text-center -mt-2">
                Secure checkout via Stripe · No subscription required
              </p>
            </div>
          )}

          {/* Pro */}
          <div className={`rounded-2xl border-2 border-[hsl(210_100%_66%/0.4)] bg-gradient-to-b from-[hsl(210_100%_66%/0.06)] to-[hsl(280_65%_60%/0.04)] p-6 flex flex-col space-y-5 relative ${isPro ? "md:col-span-2" : ""}`}>
            <div className="absolute -top-3 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] text-[10px] font-bold uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Recommended
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wider text-[hsl(210_100%_75%)]">Pro</p>
                <div className="inline-flex rounded-full border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_4%)] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBillingInterval("month")}
                    className={`px-2.5 py-1 rounded-full transition-colors ${billingInterval === "month" ? "bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] font-semibold" : "text-[hsl(215.4_16.3%_66.9%)] hover:text-[hsl(213_31%_91%)]"}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval("year")}
                    className={`px-2.5 py-1 rounded-full transition-colors inline-flex items-center gap-1 ${billingInterval === "year" ? "bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] font-semibold" : "text-[hsl(215.4_16.3%_66.9%)] hover:text-[hsl(213_31%_91%)]"}`}
                  >
                    Annual
                    <span className={`text-[9px] px-1 py-0.5 rounded ${billingInterval === "year" ? "bg-[hsl(224_71%_4%)] text-[hsl(160_60%_70%)]" : "bg-[hsl(160_60%_45%/0.15)] text-[hsl(160_60%_70%)]"}`}>
                      Save 25%
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {billingInterval === "year" ? "$9" : "$12"}
                  <span className="text-base font-normal text-[hsl(215.4_16.3%_56.9%)]">/month</span>
                </p>
                <p className="text-xs text-[hsl(215.4_16.3%_66.9%)]">
                  {billingInterval === "year" ? "$108 billed annually — save $36/yr" : "Server-hosted xAI key — no setup, just sign in"}
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-[hsl(213_31%_91%)] flex-1">
              <Feature>Everything in Free</Feature>
              <Feature highlight>Innovation gap cards with publicly traded companies</Feature>
              <Feature highlight>Grok Imagine visuals on every breakdown level</Feature>
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
                  onClick={() => { setError(null); setPortalPending(true); portalMutation.mutate(); }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:bg-[hsl(224_71%_10%)] text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {portalPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Manage subscription
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={checkoutPending}
                  onClick={() => { setError(null); setCheckoutPending(true); checkoutMutation.mutate({ data: { interval: billingInterval } }); }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] text-sm font-bold transition-colors disabled:opacity-60"
                >
                  {checkoutPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upgrade to Pro
                </button>
                <p className="text-[10px] text-[hsl(215.4_16.3%_46.9%)] text-center">
                  Secure checkout via Stripe. Cancel anytime from your billing portal.
                </p>
              </div>
            )}

            {error && <p className="text-xs text-[hsl(0_85%_70%)] text-center">{error}</p>}
          </div>
        </div>

        {isSignedIn && (
          <p className="text-center text-xs text-[hsl(215.4_16.3%_46.9%)]">
            Signed in as{" "}
            <span className="text-[hsl(213_31%_71%)] font-mono">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </p>
        )}

        <div className="flex justify-center gap-4 pt-2 text-xs text-[hsl(215.4_16.3%_36.9%)]">
          <Link href="/terms" className="hover:text-[hsl(215.4_16.3%_56.9%)] transition-colors">
            Terms of Service
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-[hsl(215.4_16.3%_56.9%)] transition-colors">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/products" className="hover:text-[hsl(215.4_16.3%_56.9%)] transition-colors">
            Products &amp; Services
          </Link>
        </div>
      </div>
    </div>
  );
}

function Feature({
  children,
  highlight,
  muted,
  zap,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
  zap?: boolean;
}) {
  return (
    <li className={`flex items-start gap-2 ${muted ? "opacity-50 line-through decoration-[hsl(215.4_16.3%_36.9%)]" : ""}`}>
      {zap ? (
        <Zap className="w-4 h-4 shrink-0 mt-0.5 text-[hsl(38_92%_60%)]" />
      ) : (
        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${highlight ? "text-[hsl(280_65%_75%)]" : "text-[hsl(160_60%_60%)]"}`} />
      )}
      <span>{children}</span>
    </li>
  );
}
