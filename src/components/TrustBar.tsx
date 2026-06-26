import { Star, Clock, Users } from "@phosphor-icons/react/dist/ssr";

export function TrustBar() {
  return (
    <section className="bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)] py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          
          <div className="text-center md:text-left">
            <p className="text-[18px] font-medium text-text-primary">
              Join thousands applying smarter — not harder
            </p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-x-12 gap-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-primary border border-border flex items-center justify-center text-accent">
                <Users weight="fill" size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-text-primary text-[15px]">2,000+</p>
                <p className="text-[13px] text-text-secondary font-medium">active users</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-primary border border-border flex items-center justify-center text-accent">
                <Star weight="fill" size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-text-primary text-[15px]">4.9 / 5</p>
                <p className="text-[13px] text-text-secondary font-medium">average rating</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bg-primary border border-border flex items-center justify-center text-accent">
                <Clock weight="fill" size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold text-text-primary text-[15px]">&lt; 60 seconds</p>
                <p className="text-[13px] text-text-secondary font-medium">to tailor resume</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
