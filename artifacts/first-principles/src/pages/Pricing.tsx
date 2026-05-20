import { useState, useEffect } from "react";
import { Atom, Check, Sparkles, ArrowLeft, Loader2, Zap, ChevronRight, Crown } from "lucide-react";
import { Link, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import {
  useGetMe,
  getGetMeQueryKey,
  useCreateStripeCheckoutSession,
  useCreateStripePortalSession,
  useCreateCreditCheckoutSession,
} from "@workspace/api-client-react";

type PackKey = "1" | "5" | "10" | "20";

const CREDIT_PACKS: {
  pack: PackKey;
  credits: number;
  price: string;
  perCredit: string;
  badge?: string;
}[] = [
  { pack: "1", credits: 1, price: "$1.99", perCredit: "$1.99 / credit" },
  { pack: "5", credits: 5, price: "$8.99", perCredit: "$1.80 / credit", badge: "Save 10%" },
  { pack: "10", credits: 10, price: "$16.99", perCredit: "$1.70 / credit", badge: "Save 15%" },
  { pack: "20", credits: 20, price: "$29.99", perCredit: "$1.50 / credit", badge: "Best value · Save 25%" },
];

export function Pricing() {
  const { user, isSignedIn } = useUser();
  const { data: account, refetch: refetchAccount } = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });
  const isPro = account?.isPro ?? false;
  const topicCredits = account?.topicCredits ?? 0;
  const freeUsed = account?.freeBreakdownsUsedThisMonth ?? 0;
  const freeLimit = account?.freeBreakdownsPerMonth ?? 2;
  const freeRemaining = Math.max(0, freeLimit - freeUsed);

  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("year");
  const [selectedPack, setSelectedPack] = useState<PackKey>("10");
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
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
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

      <div className="max-w-6xl mx-auto px-4 py-14 space-y-10">
        {/* Success banners */}
        {checkoutSuccess && (
          <div className="rounded-xl border border-[hsl(160_60%_45%/0.4)] bg-[hsl(160_60%_45%/0.1)] px-5 py-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-[hsl(160_60%_60%)] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[hsl(160_60%_75%)]">You're on Pro — welcome!</p>
              <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-0.5">All Pro features are now unlocked. Enjoy unlimited breakdowns, AI visuals, and innovation gaps.</p>
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
            Pick the plan that fits you
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Simple, flexible pricing
          </h1>
          <p className="text-[hsl(215.4_16.3%_66.9%)] text-base max-w-2xl mx-auto">
            Start with 5 free full text breakdowns every month. Add AI visuals with one-time
            credits, or go Pro for unlimited breakdowns plus high-quality images.
          </p>
        </div>

        {/* Three-column pricing grid */}
        <div className="grid md:grid-cols-3 gap-5 items-stretch">

          {/* Free */}
          <div className="rounded-2xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] p-6 flex flex-col space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-[hsl(215.4_16.3%_56.9%)]">Free</p>
              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-4xl font-bold">$0</p>
                <span className="text-sm text-[hsl(215.4_16.3%_56.9%)]">/month</span>
              </div>
              <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] mt-1">
                5 full breakdowns every month. Resets at the start of each calendar month.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-[hsl(213_31%_85%)] flex-1">
              <Feature><b>5 free</b> full topic breakdowns per month</Feature>
              <Feature>Hierarchical first-principles text breakdown</Feature>
              <Feature>Interactive Mermaid flowchart</Feature>
              <Feature>Basic innovation gap analysis</Feature>
              <Feature muted>AI-generated images (Pro or credits)</Feature>
            </ul>
            {isSignedIn && !isPro && (
              <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] -mt-2">
                <span className="font-semibold text-[hsl(213_31%_91%)]">{freeRemaining}</span> of {freeLimit} free breakdown{freeLimit !== 1 ? "s" : ""} left this month
              </p>
            )}
            <div className="pt-1">
              <div className="w-full text-center py-3 rounded-xl border border-[hsl(216_34%_17%)] text-sm text-[hsl(215.4_16.3%_56.9%)]">
                {isSignedIn && !isPro ? "Your current plan" : "Free forever"}
              </div>
            </div>
          </div>

          {/* Pro (centered, recommended) */}
          <div className="rounded-2xl border-2 border-[hsl(210_100%_66%/0.5)] bg-gradient-to-b from-[hsl(210_100%_66%/0.08)] to-[hsl(280_65%_60%/0.04)] p-6 flex flex-col space-y-5 relative md:scale-[1.03] md:shadow-2xl md:shadow-[hsl(210_100%_66%/0.1)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(210_100%_66%)] text-[hsl(224_71%_4%)] text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
              <Sparkles className="w-3 h-3" />
              Recommended
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wider text-[hsl(210_100%_75%)] font-semibold">Pro</p>
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
                      Save 17%
                    </span>
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl font-bold">
                    {billingInterval === "year" ? "$8.25" : "$9.99"}
                  </p>
                  <span className="text-sm text-[hsl(215.4_16.3%_56.9%)]">/month</span>
                </div>
                <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-1">
                  {billingInterval === "year"
                    ? "$99 billed annually — save $20.88/yr"
                    : "Billed monthly · cancel anytime"}
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-[hsl(213_31%_91%)] flex-1">
              <Feature highlight><b>Unlimited</b> text breakdowns + flowcharts</Feature>
              <Feature highlight>Full Innovation Gap Cards + company intelligence</Feature>
              <Feature highlight>80–100 AI images per month (fair-use)</Feature>
              <Feature highlight>Hosted xAI API key — zero setup</Feature>
              <Feature highlight>Click-to-fullsize · regenerate any image</Feature>
              <Feature highlight>Priority support &amp; early-access features</Feature>
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
                  <Crown className="w-4 h-4" />
                  Go Pro — {billingInterval === "year" ? "$99/year" : "$9.99/month"}
                </button>
                <p className="text-[10px] text-[hsl(215.4_16.3%_46.9%)] text-center">
                  Secure checkout via Stripe. Cancel anytime from your billing portal.
                </p>
              </div>
            )}
          </div>

          {/* Topic Credits */}
          {!isPro ? (
            <div className="rounded-2xl border border-[hsl(38_92%_50%/0.35)] bg-gradient-to-b from-[hsl(38_92%_50%/0.06)] to-[hsl(38_92%_50%/0.02)] p-6 flex flex-col space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-wider text-[hsl(38_92%_65%)] font-semibold">Topic Credits</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_70%)] border border-[hsl(38_92%_50%/0.3)] font-semibold uppercase tracking-wide">One-time</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <p className="text-4xl font-bold">{activePack.price}</p>
                </div>
                <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-1">
                  {activePack.perCredit} · credits never expire
                </p>
              </div>
              {/* Pack selector */}
              <div className="grid grid-cols-2 gap-2">
                {CREDIT_PACKS.map((p) => (
                  <button
                    key={p.pack}
                    type="button"
                    onClick={() => setSelectedPack(p.pack)}
                    className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                      selectedPack === p.pack
                        ? "border-[hsl(38_92%_50%)] bg-[hsl(38_92%_50%/0.12)]"
                        : "border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] hover:border-[hsl(38_92%_50%/0.4)]"
                    }`}
                  >
                    <div className="text-sm font-semibold text-[hsl(213_31%_91%)]">
                      {p.credits} credit{p.credits > 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-[hsl(38_92%_70%)] font-medium">{p.price}</div>
                    {p.badge && (
                      <div className="text-[9px] text-[hsl(160_60%_70%)] mt-0.5 font-semibold">{p.badge}</div>
                    )}
                  </button>
                ))}
              </div>
              <ul className="space-y-2 text-sm text-[hsl(213_31%_91%)] flex-1">
                <Feature zap><b>1 credit = 1 full breakdown</b></Feature>
                <Feature zap>8–12 high-quality AI images per credit</Feature>
                <Feature zap>Full Innovation Gap Cards + public companies</Feature>
                <Feature zap>Hosted xAI key — no setup</Feature>
                <Feature zap>Credits never expire</Feature>
              </ul>
              {topicCredits > 0 && (
                <p className="text-xs font-semibold text-[hsl(38_92%_70%)] -mt-2">
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
                <Zap className="w-4 h-4" />
                Buy {activePack.credits} credit{activePack.credits > 1 ? "s" : ""} · {activePack.price}
                <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-[10px] text-[hsl(215.4_16.3%_46.9%)] text-center -mt-2">
                One-time payment · No subscription
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] p-6 flex flex-col space-y-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-[hsl(215.4_16.3%_56.9%)]">Topic Credits</p>
                <p className="text-2xl font-bold mt-1">You're covered</p>
                <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] mt-1">
                  Pro already gives you unlimited breakdowns. You don't need credits.
                </p>
              </div>
              {topicCredits > 0 && (
                <p className="text-xs text-[hsl(38_92%_70%)]">
                  You still have {topicCredits} legacy credit{topicCredits !== 1 ? "s" : ""} — they never expire.
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-[hsl(0_85%_70%)] text-center">{error}</p>}

        {/* What you get in 1 credit */}
        {!isPro && (
          <div className="rounded-2xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_6%)] p-6">
            <p className="text-xs uppercase tracking-wider text-[hsl(215.4_16.3%_56.9%)] mb-3 font-semibold">
              What's in 1 credit?
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <CreditBenefit title="Full hierarchy" body="Atoms → application, every layer explained from first principles." />
              <CreditBenefit title="Interactive flowchart" body="Click any node to jump to its detailed card." />
              <CreditBenefit title="8–12 AI images" body="High-quality Grok Imagine visuals on every level and gap." />
              <CreditBenefit title="Innovation gaps" body="Real publicly traded companies positioned in each gap." />
            </div>
          </div>
        )}

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
        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${highlight ? "text-[hsl(210_100%_75%)]" : "text-[hsl(160_60%_60%)]"}`} />
      )}
      <span>{children}</span>
    </li>
  );
}

function CreditBenefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[hsl(216_34%_17%)] bg-[hsl(224_71%_7%)] p-4">
      <p className="text-sm font-semibold text-[hsl(213_31%_91%)] mb-1">{title}</p>
      <p className="text-xs text-[hsl(215.4_16.3%_66.9%)] leading-relaxed">{body}</p>
    </div>
  );
}
