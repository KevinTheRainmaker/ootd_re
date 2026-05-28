"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";

function ProfileDropdown({
  name,
  image,
}: {
  name: string | null;
  image: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="프로필 메뉴"
      >
        {image ? (
          <Image
            src={image}
            alt={name ?? "프로필"}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">
            {name?.[0] ?? "?"}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 w-44 bg-white border border-zinc-100 rounded-xl shadow-lg py-1 z-50"
        >
          <Link
            href="/calendar"
            role="menuitem"
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            캘린더
          </Link>
          <Link
            href="/ootd"
            role="menuitem"
            className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            내 OOTD
          </Link>
          <hr className="my-1 border-zinc-100" />
          <button
            role="menuitem"
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-handwriting text-2xl text-zinc-900 select-none"
        >
          OOTD
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
          ) : session?.user ? (
            <ProfileDropdown
              name={session.user.name ?? null}
              image={session.user.image ?? null}
            />
          ) : (
            <Link href="/api/auth/signin">
              <Button size="sm">시작하기</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
