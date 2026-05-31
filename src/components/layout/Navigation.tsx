"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "home", label: "Home", active: true },
  { href: null, icon: "style", label: "Fashion", active: false },
  { href: "/upload", icon: "add", label: "Add", active: true, isFab: true },
  { href: null, icon: "shopping_bag", label: "Shop", active: false },
  { href: "/profile", icon: "person", label: "Profile", active: true },
] as const;

export default function Navigation() {
  const pathname = usePathname();

  if (pathname?.startsWith("/share") || pathname?.startsWith("/auth"))
    return null;

  const isActive = (href: string | null) => {
    if (!href) return false;
    return href === "/" ? pathname === "/" : pathname?.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-[#f1edec]">
      <div className="flex items-center justify-around px-2 pt-2 pb-5 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          if ("isFab" in item && item.isFab) {
            return (
              <Link
                key="add"
                href={item.href as string}
                className="flex flex-col items-center -mt-7"
              >
                <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-white text-[28px]">
                    add
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#747878] mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          if (!item.active || !item.href) {
            return (
              <button
                key={item.label}
                disabled
                className="flex flex-col items-center gap-0.5 p-2 opacity-30 cursor-not-allowed"
                title="준비 중"
              >
                <span className="material-symbols-outlined text-[24px] text-[#747878]">
                  {item.icon}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#747878]">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${
                isActive(item.href) ? "text-black" : "text-[#747878]"
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
