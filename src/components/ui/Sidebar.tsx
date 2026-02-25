"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    section: "Analytics",
    items: [
      { label: "Overview", href: "/", icon: "grid" },
      { label: "Explorer", href: "/explorer", icon: "search" },
    ],
  },
];

function NavIcon({ type }: { type: string }) {
  const props = { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.5 };
  switch (type) {
    case "grid":
      return <svg {...props}><rect x="1" y="1" width="7" height="7" rx="1.5"/><rect x="10" y="1" width="7" height="7" rx="1.5"/><rect x="1" y="10" width="7" height="7" rx="1.5"/><rect x="10" y="10" width="7" height="7" rx="1.5"/></svg>;
    case "alert":
      return <svg {...props}><path d="M9 1.5l1.3 4h4.2l-3.4 2.5 1.3 4L9 9.5 5.6 12l1.3-4L3.5 5.5h4.2z"/></svg>;
    case "search":
      return <svg {...props}><circle cx="8" cy="8" r="5.5"/><path d="M12.5 12.5L16 16"/></svg>;
    case "ai":
      return <svg {...props}><circle cx="9" cy="9" r="7.5"/><path d="M6 9.5c0-1.7 1.3-3 3-3s3 1.3 3 3"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/><circle cx="11" cy="7" r="0.8" fill="currentColor"/></svg>;
    case "rules":
      return <svg {...props}><path d="M3 4.5h12M3 9h12M3 13.5h12"/></svg>;
    case "settings":
      return <svg {...props}><circle cx="9" cy="9" r="3"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2"/></svg>;
    default:
      return null;
  }
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 flex flex-col bg-white border-r"
      style={{ width: "var(--sidebar-w)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center gap-2.5 px-6 py-5 border-b" style={{ borderColor: "var(--border-color)" }}>
        <svg viewBox="0 0 28 28" fill="none" width={28} height={28}>
          <rect width="28" height="28" rx="6" fill="#4F46E5"/>
          <path d="M8 9l6 10 6-10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-bold text-[15px] tracking-tight" style={{ color: "var(--text-primary)" }}>
          Mercado Luna
        </span>
      </div>

      <nav className="flex-1 p-3">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            <div
              className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-4 pb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              {section.section}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium transition-colors"
                  style={{
                    background: isActive ? "var(--primary-faint)" : "transparent",
                    color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7 }}>
                    <NavIcon type={item.icon} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 px-4 py-4 border-t" style={{ borderColor: "var(--border-color)" }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ background: "var(--primary)" }}
        >
          TH
        </div>
        <div>
          <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Thiago De Souza</div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Risk Operations</div>
        </div>
      </div>
    </aside>
  );
}
