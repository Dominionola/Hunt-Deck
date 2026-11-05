import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Briefcase, ChartBar, FileText, IdentificationCard, Kanban, MagnifyingGlass, Microphone, SquaresFour, EnvelopeSimple, Gear } from "@phosphor-icons/react/dist/ssr";
import { JobRadar } from "./JobRadar";
import styles from "./dashboard.module.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });

export const metadata = { title: "Mission Control | Hunt Deck" };

const navigation = [
  { label: "Mission Control", icon: SquaresFour, href: "/dashboard" },
  { label: "Job Discovery", icon: MagnifyingGlass, href: "/dashboard/jobs" },
  { label: "Pipeline CRM", icon: Kanban },
  { label: "ATS Tailor", icon: FileText },
  { label: "Interview Prep", icon: Microphone },
  { label: "Master Profile", icon: IdentificationCard, href: "/dashboard/resume" },
];

const metrics = [
  { label: "Applications sent", value: "12", detail: "3 more than last week" },
  { label: "Avg. ATS match", value: "92%", detail: "Across tailored packs" },
  { label: "Interview conversion", value: "21%", detail: "Of applications sent" },
  { label: "First-mover speed", value: "38m", detail: "Average time to apply" },
];

const stages = [
  { name: "Saved / Radar", count: 6, color: "#c9d8e3" },
  { name: "Tailored & Ready", count: 3, color: "#94b4ca" },
  { name: "Applied", count: 12, color: "#2d5f8a" },
  { name: "Interviewing", count: 3, color: "#16213a" },
  { name: "Offer / Closed", count: 1, color: "#b7e4c7" },
];

export default function DashboardPage() {
  return (
    <div className={`${styles.dashboard} ${jakarta.className}`}>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <Link href="/" className={styles.brand} aria-label="Hunt Deck home"><span className={styles.brandMark}>H</span><span><strong>Hunt Deck</strong><small>CAREER WORKSPACE</small></span></Link>
        <div className={styles.navLabel}>WORKSPACE</div>
        <nav className={styles.nav} aria-label="Dashboard">
          {navigation.map(({ label, icon: Icon, href }) => href ? (
            <Link href={href} key={label} aria-current={href === "/dashboard" ? "page" : undefined} className={href === "/dashboard" ? styles.active : undefined}><Icon size={19} /><span>{label}</span></Link>
          ) : <span key={label} className={styles.unavailable} title="Coming soon"><Icon size={19} /><span>{label}</span><small>Soon</small></span>)}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.goal}><div><strong>Weekly goal</strong><b>4 / 7</b></div><div className={styles.track}><span /></div><p>Three more applications to reach your goal.</p></div>
          <span className={styles.utility}><Gear size={18} /> Settings <small>Coming soon</small></span>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <Link href="/dashboard/jobs" className={styles.search}><MagnifyingGlass size={18} /><span>Explore jobs and opportunities</span><ArrowRight size={16} /></Link>
          <span className={styles.demoPill}>Demo workspace</span>
        </header>
        <main className={styles.content}>
          <div className={styles.demoNotice}><strong>Preview data</strong><span> Metrics and actions are examples, not your account activity. Recent opportunities come from Job Discovery.</span></div>
          <div className={styles.heading}><div><h1>Welcome to your search.</h1><p>See what a focused week could look like.</p></div><Link href="/dashboard/jobs" className={styles.primaryButton}>Explore jobs <ArrowRight size={16} /></Link></div>
          <section className={styles.metricGrid} aria-label="Example search metrics">
            {metrics.map((metric, i) => <div className={`${styles.metric} ${i === 0 ? styles.metricFeatured : ""}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}
          </section>
          <div className={styles.columns}>
            <section className={`${styles.panel} ${styles.queue}`} aria-labelledby="next-title">
              <div className={styles.panelHeading}><div><h2 id="next-title">Your next moves</h2><p>Examples of actions that could need your attention.</p></div><span className={styles.chip}>3 PRIORITIES</span></div>
              <div className={`${styles.action} ${styles.highlight}`}><span className={styles.actionIcon}><Briefcase size={20} /></span><div><strong>Tailor your application for Stripe</strong><span>Staff Systems Engineer · 14m ago · 94% fit</span></div><span className={styles.newLabel}>NEW MATCH</span></div>
              <div className={styles.action}><span className={styles.actionIcon}><EnvelopeSimple size={20} /></span><div><strong>Follow up with Sarah at Vercel</strong><span>Senior Product Designer · Due today</span></div></div>
              <div className={styles.action}><span className={styles.actionIcon}><Microphone size={20} /></span><div><strong>Prepare for your Amazon interview</strong><span>Mock interview · In 2 hours</span></div></div>
            </section>
            <section className={`${styles.panel} ${styles.velocity}`} aria-labelledby="velocity-title">
              <div className={styles.panelHeading}><div><h2 id="velocity-title">Application velocity</h2><p>Applications sent · last 6 weeks</p></div><span className={styles.chip}>THIS WEEK</span></div>
              <div className={styles.weekStat}><strong>4</strong><span>of 7 weekly goal</span><b>↑ 3 vs last week</b></div>
              <div className={styles.chart} role="img" aria-label="Example applications per week: 1, 2, 2, 3, 1, and 4.">{[1, 2, 2, 3, 1, 4].map((n, i) => <div className={styles.barColumn} key={i}><span>{n}</span><div className={i === 5 ? styles.currentBar : styles.bar} style={{ height: `${n * 15}px` }} /><small>W{i + 1}</small></div>)}</div>
              <div className={styles.chartFoot}>3 more to reach your goal <ChartBar size={16} /></div>
            </section>
          </div>
          <div className={styles.columns}>
            <JobRadar />
            <section className={styles.panel} aria-labelledby="pipeline-title"><div className={styles.panelHeading}><div><h2 id="pipeline-title">Pipeline snapshot</h2><p>25 example opportunities</p></div></div><div className={styles.segments} aria-hidden="true">{stages.map(stage => <span key={stage.name} style={{ flex: stage.count, background: stage.color }} />)}</div><ul className={styles.stageList}>{stages.map(stage => <li key={stage.name}><span className={styles.dot} style={{ background: stage.color }} /><span>{stage.name}</span><strong>{stage.count}</strong></li>)}</ul><div className={styles.followUp}>2 example follow-ups need attention</div></section>
          </div>
          <p className={styles.previewFoot}>Dashboard preview · Your activity will appear here when connected.</p>
        </main>
      </div>
    </div>
  );
}
