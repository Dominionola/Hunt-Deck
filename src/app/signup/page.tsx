"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  EnvelopeSimple,
  User,
  ArrowRight,
  SpinnerGap,
  WarningCircle,
  Eye,
  EyeSlash,
  ShieldCheck,
  Check,
  PaperPlaneTilt,
  CheckCircle,
  ArrowLeft,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verification Waiting Room state
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Automatically detect when user verifies via confirmation link in another tab
  useEffect(() => {
    if (!confirmationRequired) return;

    let active = true;
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok && active) {
          toast.success("Email Verified!", {
            description: "Your account is active. Redirecting to onboarding...",
          });
          router.push("/onboarding");
          router.refresh();
        }
      } catch {
        // Ignore transient polling failures
      }
    };

    const interval = setInterval(() => void checkSession(), 4000);
    const onFocus = () => void checkSession();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [confirmationRequired, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password || !fullName) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        confirmationRequired?: boolean;
      };

      if (!response.ok) {
        setErrorMessage(data.error || "Registration failed. Please check your details.");
        setIsLoading(false);
        return;
      }

      if (data.confirmationRequired) {
        setConfirmationRequired(true);
        setResendCooldown(60);
        setIsLoading(false);
        return;
      }

      toast.success("Account Created", {
        description: "Welcome to Hunt Deck! Setting up your onboarding...",
      });

      router.push("/onboarding");
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to registration services. Please retry.");
      setIsLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setErrorMessage(null);
    setIsCheckingStatus(true);

    try {
      // 1. Check if the callback tab already authenticated the browser session
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      if (sessionRes.ok) {
        toast.success("Email Verified!", {
          description: "Welcome to Hunt Deck! Let's personalize your profile.",
        });
        router.push("/onboarding");
        router.refresh();
        return;
      }

      // 2. If user opened the link in another device/email app (e.g. mobile Gmail),
      // attempt direct sign-in with the credentials they just entered.
      const signInRes = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const signInData = (await signInRes.json()) as {
        error?: string;
        emailNotConfirmed?: boolean;
        onboardingCompleted?: boolean;
      };

      if (signInRes.ok) {
        toast.success("Email Verified!", {
          description: "Signed in securely. Redirecting to your workspace...",
        });
        router.push(signInData.onboardingCompleted ? "/dashboard" : "/onboarding");
        router.refresh();
        return;
      }

      setErrorMessage(
        signInData.emailNotConfirmed
          ? "We still don't see a confirmed email yet. Click the verification link in your inbox (check Spam/Promotions too), then try again."
          : signInData.error || "Could not verify yet. Check your inbox or click Resend link."
      );
    } catch {
      setErrorMessage("Unable to verify status right now. Please try signing in.");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;
    setErrorMessage(null);
    setIsResending(true);

    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setErrorMessage(data.error || "Could not resend verification link.");
      } else {
        setResendCooldown(60);
        toast.success("Verification Link Resent", {
          description: `Sent a fresh confirmation email to ${email}.`,
        });
      }
    } catch {
      setErrorMessage("Network error while resending email. Please retry.");
    } finally {
      setIsResending(false);
    }
  };

  const isPasswordValid = password.length >= 8;

  return (
    <div className="min-h-screen bg-[#FAF7F0] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(45,95,138,0.07),rgba(250,247,240,0))] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#2D5F8A]/15 selection:text-[#16213A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Mark */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] rounded-xl px-2 py-1 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-[#16213A] text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:bg-[#0D1527] group-active:scale-[0.96] transition-all duration-150">
            HD
          </div>
          <span className="text-xl font-bold tracking-tight text-[#16213A]">
            Hunt Deck
          </span>
        </Link>

        <h1 className="mt-7 text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
          {confirmationRequired ? (
            <>
              Verify your email{" "}
              <span className="font-serif italic font-normal text-[#2D5F8A]">
                check your inbox
              </span>
            </>
          ) : (
            <>
              Create an account{" "}
              <span className="font-serif italic font-normal text-[#2D5F8A]">
                for signed offers
              </span>
            </>
          )}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#5B6478] max-w-sm mx-auto leading-relaxed">
          {confirmationRequired
            ? "One quick click in your inbox activates your Hunt Deck workspace."
            : "Join high-velocity engineers automating their application search pipeline."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md border border-[#E5E1D8] py-8 px-6 sm:px-10 shadow-[0_4px_24px_-4px_rgba(22,33,58,0.06),0_1px_2px_rgba(22,33,58,0.04)] rounded-3xl">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50/90 border border-rose-200/80 text-rose-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <WarningCircle size={18} weight="fill" className="shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {confirmationRequired ? (
            <div role="status" className="space-y-5 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EDF3F7] border border-[#2D5F8A]/20 text-[#2D5F8A] flex items-center justify-center">
                <EnvelopeSimple size={28} weight="duotone" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] text-[11px] font-semibold text-[#16213A]">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Waiting for email verification</span>
                </div>
                <p className="text-xs sm:text-sm text-[#5B6478] leading-relaxed">
                  We sent a verification link to{" "}
                  <strong className="text-[#16213A] break-all">{email}</strong>. Click the link
                  inside to confirm your account.
                </p>
                <p className="text-[11px] text-[#5B6478]">
                  This page checks automatically once confirmed. Remember to check Spam or Promotions if it doesn&apos;t appear within a minute.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={isCheckingStatus}
                  onClick={() => void handleCheckVerified()}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold bg-[#16213A] hover:bg-[#0D1527] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isCheckingStatus ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      <span>Checking verification...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} weight="bold" />
                      <span>I&apos;ve verified my email &mdash; Continue</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={() => void handleResendEmail()}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-[#16213A] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 border border-[#E5E1D8] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <PaperPlaneTilt size={15} />
                  <span>
                    {isResending
                      ? "Sending verification link..."
                      : resendCooldown > 0
                      ? `Resend email in ${resendCooldown}s`
                      : "Resend verification email"}
                  </span>
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmationRequired(false);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1 min-h-[44px] px-2 text-[#5B6478] hover:text-[#16213A] font-medium cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Use another email</span>
                  </button>

                  <Link
                    href={`/login?email=${encodeURIComponent(email)}`}
                    className="inline-flex items-center min-h-[44px] px-2 font-semibold text-[#2D5F8A] hover:underline"
                  >
                    Sign in instead
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold text-[#16213A] mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6478]">
                      <User size={18} />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="block w-full pl-10 pr-3.5 py-3 text-sm text-[#16213A] bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/20 focus:border-[#2D5F8A] focus:bg-white min-h-[46px] transition-all placeholder:text-[#5B6478]/60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-[#16213A] mb-1.5"
                  >
                    Work or personal email
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6478]">
                      <EnvelopeSimple size={18} />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="block w-full pl-10 pr-3.5 py-3 text-sm text-[#16213A] bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/20 focus:border-[#2D5F8A] focus:bg-white min-h-[46px] transition-all placeholder:text-[#5B6478]/60"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-[#16213A]"
                    >
                      Password
                    </label>
                    <span className="text-[11px] text-[#5B6478] flex items-center gap-1">
                      {password.length > 0 && (
                        <span className={isPasswordValid ? "text-emerald-700 font-medium flex items-center gap-0.5" : "text-[#5B6478]"}>
                          {isPasswordValid && <Check size={12} weight="bold" />}
                          {password.length}/8 chars
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6478]">
                      <Lock size={18} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-10 pr-10 py-3 text-sm text-[#16213A] bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/20 focus:border-[#2D5F8A] focus:bg-white min-h-[46px] transition-all placeholder:text-[#5B6478]/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5B6478] hover:text-[#16213A] focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold bg-[#16213A] hover:bg-[#0D1527] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 min-h-[46px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-sm mt-3 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account & Continue</span>
                      <ArrowRight size={16} weight="bold" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#E5E1D8]/80 text-center">
                <p className="text-xs text-[#5B6478]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#2D5F8A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] rounded px-1 py-0.5"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Security Trust Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#5B6478]">
          <ShieldCheck size={15} weight="bold" className="text-[#2D5F8A]" />
          <span>Encrypted with Supabase Auth & short-lived session cookies</span>
        </div>
      </div>
    </div>
  );
}
