import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";

export function Comparison() {
  const features = [
    { name: "Job matching by resume fit", huntDeck: true, diy: false, generic: false },
    { name: "Tailored resume per job", huntDeck: true, diy: "Manual", generic: "Partial" },
    { name: "ATS-optimised output", huntDeck: true, diy: false, generic: false },
    { name: "Role-specific interview prep", huntDeck: true, diy: false, generic: false },
    { name: "Application tracker", huntDeck: true, diy: "Spreadsheet", generic: false },
    { name: "All in one place", huntDeck: true, diy: false, generic: false },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-4xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-text-primary mb-6">
            A smarter alternative to doing it yourself
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-[var(--color-border)] w-2/5"></th>
                <th className="p-4 border-b border-[var(--color-border)] text-center text-[18px] font-bold text-text-primary">
                  Hunt Deck
                </th>
                <th className="p-4 border-b border-[var(--color-border)] text-center text-[18px] font-semibold text-text-secondary">
                  DIY
                </th>
                <th className="p-4 border-b border-[var(--color-border)] text-center text-[18px] font-semibold text-text-secondary">
                  Generic AI tools
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, i) => (
                <tr key={i} className="group hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="p-4 border-b border-[var(--color-border)] text-[16px] font-medium text-text-primary">
                    {feature.name}
                  </td>
                  
                  <td className="p-4 border-b border-[var(--color-border)] text-center bg-accent/5 group-hover:bg-accent/10 transition-colors">
                    {feature.huntDeck === true ? (
                      <CheckCircle weight="fill" className="text-accent mx-auto" size={24} />
                    ) : (
                      <span className="text-accent font-semibold">{feature.huntDeck}</span>
                    )}
                  </td>
                  
                  <td className="p-4 border-b border-[var(--color-border)] text-center text-text-secondary">
                    {feature.diy === false ? (
                      <XCircle weight="fill" className="text-text-secondary/50 mx-auto" size={24} />
                    ) : (
                      <span className="text-[15px]">{feature.diy}</span>
                    )}
                  </td>
                  
                  <td className="p-4 border-b border-[var(--color-border)] text-center text-text-secondary">
                    {feature.generic === false ? (
                      <XCircle weight="fill" className="text-text-secondary/50 mx-auto" size={24} />
                    ) : (
                      <span className="text-[15px]">{feature.generic}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
