import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/base/toast/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Hunt Deck | Land interviews, not rejection emails.",
  description:
    "Hunt Deck matches you to jobs that fit, then builds everything you need to apply — tailored resume, cover letter, and interview prep — in minutes.",
  keywords: "job search, resume tailoring, job matching, interview prep, cover letter, ATS optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#16213A]">
        {children}
        <Toaster position="bottom-end" />
      </body>
    </html>
  );
}
