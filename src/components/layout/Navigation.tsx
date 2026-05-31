"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  if (pathname?.startsWith("/share") || pathname?.startsWith("/auth"))
    return null;

  const isActive = (path: string) =>
    path === "/"
      ? pathname === "/"
      : pathname === path || pathname?.startsWith(path + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[#f1edec]">
      <div className="flex items-center justify-around px-4 pb-safe pt-2 max-w-md mx-auto">
        {/* 홈 */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 p-2 ${isActive("/") ? "text-black" : "text-[#747878]"}`}
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            Home
          </span>
        </Link>

        {/* 캘린더 */}
        <Link
          href="/calendar"
          className={`flex flex-col items-center gap-0.5 p-2 ${isActive("/calendar") ? "text-black" : "text-[#747878]"}`}
        >
          <span className="material-symbols-outlined text-[24px]">
            calendar_month
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            Calendar
          </span>
        </Link>

        {/* 중앙 + 버튼 */}
        <Link href="/upload" className="flex flex-col items-center -mt-6">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-white text-[28px]">
              add
            </span>
          </div>
        </Link>

        {/* 숍 */}
        <Link
          href="/shop"
          className={`flex flex-col items-center gap-0.5 p-2 ${isActive("/shop") ? "text-black" : "text-[#747878]"}`}
        >
          <span className="material-symbols-outlined text-[24px]">
            shopping_bag
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            Shop
          </span>
        </Link>

        {/* 프로필 */}
        <Link
          href="/api/auth/signout"
          className="flex flex-col items-center gap-0.5 p-2 text-[#747878]"
        >
          <span className="material-symbols-outlined text-[24px]">person</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            Profile
          </span>
        </Link>
      </div>
    </nav>
  );
}
