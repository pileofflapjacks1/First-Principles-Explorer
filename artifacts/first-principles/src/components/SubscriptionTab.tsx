import { Sparkles, Zap, Check, CreditCard, Loader2, Calendar, Image, BookOpen, GitBranch, Brain } from "lucide-react";
import { useUser } from "@clerk/react";
import {
  useGetMe,
  getGetMeQueryKey,
  useCreateStripePortalSession,
  useCreateStripeCheckoutSession,
} from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";

const FREE_PERKS = [
  { icon: Brain, text: "First-principles breakdown with your own xAI key" },
  { icon: GitBranch, text: "Interactive Mermaid flowchart" },
  { icon: BookOpen, text: "Grokipedia deep-dive links on every level" },
];

const PRO_PERKS = [
  { icon: Brain, text: "Server-hosted AI breakdowns — no API key needed" },
  { icon: GitBranch, text: "Interactive Mermaid flowchart" },
  { icon: BookOpen, text: "Grokipedia deep-dive links on every level" },
  { icon: Sparkles, text: "Innovation-gap cards with real publicly traded companies" },
  { icon: Image, text: "AI concept-art images on every level and gap (100/month)" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SubscriptionTab() {
  const { isSignedIn } = useUser();
  const { data: account, isLoading } = useGetMe({
    query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() },
  });
  const [portalError, setPortalError] = useState(false);

  const portalMutation = useCreateStripePortalSession({
    mutation: {
      onSuccess: (data) => { window.location.href = data.url; },
      onError: () => setPortalError(true),
    },
  });

  const checkoutMutation = useCreateStripeCheckoutSession({
    mutation: {
      onSuccess: (data) => { window.location.href = data.url; },
    },
  });

  if (isLoading || !account) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(215.4_16.3%_56.9%)]" />
      </div>
    );
  }

  const isPro = account.isPro || account.isAdmin;
  const imagesLeft = Math.max(0, (account.monthlyImageLimit ?? 0) - (account.imagesGeneratedThisMonth ?? 0));
  const periodEnd = account.subscriptionCurrentPeriodEnd;
  const status = account.subscriptionStatus;

  const isCanceling = status === "canceled" || (isPro && status && !["active", "trialing"].includes(status));

  return (
    <div className="py-2 px-1 space-y-6 text-[hsl(213_31%_91%)]">
      {/* Plan badge */}
      <div className="flex items-center gap-3">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
            isPro
              ? "bg-[hsl(280_65%_60%/0.15)] border border-[hsl(280_65%_60%/0.35)] text-[hsl(280_65%_80%)]"
              : "bg-[hsl(216_34%_17%)] border border-[hsl(216_34%_25%)] text-[hsl(215.4_16.3%_70%)]"
          }`}
        >
          {isPro ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          {isPro ? "Pro" : "Free"}
        </div>
        {isPro && isCanceling && (
          <span className="text-xs text-[hsl(38_92%_70%)]">Canceling at period end</span>
        )}
      </div>

      {/* Pro stats */}
      {isPro && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[hsl(224_71%_9%)] border border-[hsl(216_34%_17%)] p-4 space-y-1">
            <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] flex items-center gap-1.5">
              <Image className="w-3 h-3" /> Images this month
            </p>
            <p className="text-2xl font-bold text-[hsl(213_31%_91%)]">
              {imagesLeft}
              <span className="text-sm font-normal text-[hsl(215.4_16.3%_56.9%)]">
                /{account.monthlyImageLimit} left
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-[hsl(224_71%_9%)] border border-[hsl(216_34%_17%)] p-4 space-y-1">
            <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Topic credits
            </p>
            <p className="text-2xl font-bold text-[hsl(213_31%_91%)]">
              {account.topicCredits}
            </p>
          </div>
          {periodEnd && (
            <div className="col-span-2 rounded-xl bg-[hsl(224_71%_9%)] border border-[hsl(216_34%_17%)] p-4 space-y-1">
              <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {isCanceling ? "Access until" : "Renews on"}
              </p>
              <p className="text-base font-semibold">{formatDate(periodEnd)}</p>
            </div>
          )}
        </div>
      )}

      {/* Free stats */}
      {!isPro && account.topicCredits > 0 && (
        <div className="rounded-xl bg-[hsl(224_71%_9%)] border border-[hsl(216_34%_17%)] p-4 space-y-1">
          <p className="text-xs text-[hsl(215.4_16.3%_56.9%)] flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Topic credits remaining
          </p>
          <p className="text-2xl font-bold text-[hsl(38_92%_70%)]">
            {account.topicCredits}
          </p>
          <p className="text-xs text-[hsl(215.4_16.3%_56.9%)]">
            Each credit funds one server-hosted AI breakdown.
          </p>
        </div>
      )}

      {/* Perks list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[hsl(215.4_16.3%_56.9%)] uppercase tracking-wide">
          What's included
        </p>
        <ul className="space-y-2">
          {(isPro ? PRO_PERKS : FREE_PERKS).map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(210_100%_66%)]" />
              <span className="text-[hsl(213_31%_75%)]">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {isPro ? (
          <>
            {portalError && (
              <p className="text-xs text-[hsl(0_63%_60%)]">
                Couldn't open the billing portal. Please try again.
              </p>
            )}
            <button
              onClick={() => { setPortalError(false); portalMutation.mutate(); }}
              disabled={portalMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[hsl(216_34%_25%)] text-sm font-medium text-[hsl(213_31%_75%)] hover:bg-[hsl(216_34%_17%)] transition-colors disabled:opacity-50"
            >
              {portalMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CreditCard className="w-4 h-4" />}
              Manage subscription
            </button>
          </>
        ) : (
          <Link
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(210_100%_66%)] hover:bg-[hsl(210_100%_58%)] text-[hsl(224_71%_4%)] text-sm font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to Pro — $12/mo
          </Link>
        )}
      </div>
    </div>
  );
}
