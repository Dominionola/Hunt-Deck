"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, EnvelopeSimple, ArrowRight, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (data.onboardingCompleted === false) {
        toast.success("Welcome!", {
          description: "Let's calibrate your career profile before entering Mission Control.",
        });
        router.push("/onboarding");
      } else {
        toast.success("Welcome back!", {
          description: "Authenticated securely with your Hunt Deck workspace.",
        });
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to authentication services. Please retry.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Mark */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] rounded-xl"
        >
          <div className="w-10 h-10 rounded-xl bg-[#16213A] text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-[#0D1527] transition-colors">
            H
          </div>
          <span className="text-xl font-bold tracking-tight text-[#16213A]">
            Hunt Deck
          </span>
        </Link>

        <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
          Sign in{" "}
          <span className="font-serif italic font-normal text-[#2D5F8A]">
            to your workspace
          </span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#5B6478]">
          Access your mission control, tailored applications, and interview preparation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#FFFFFF] border border-[#E5E1D8] py-8 px-6 sm:px-10 shadow-sm rounded-3xl">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
            >
              <WarningCircle size={17} weight="fill" className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-[#5B6478] mb-1.5"
              >
                Work or Personal Email
              </label>
              <div className="relative rounded-xl shadow-sm">
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
                  className="block w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5F8A] focus:border-transparent min-h-[44px] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#5B6478]"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6478]">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5F8A] focus:border-transparent min-h-[44px] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs sm:text-sm font-semibold bg-[#16213A] hover:bg-[#0D1527] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] min-h-[44px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-sm mt-2"
            >
              {isLoading ? (
                <>
                  <SpinnerGap size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Hunt Deck</span>
                  <ArrowRight size={16} weight="bold" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E5E1D8] text-center">
            <p className="text-xs text-[#5B6478]">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#2D5F8A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] rounded"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
