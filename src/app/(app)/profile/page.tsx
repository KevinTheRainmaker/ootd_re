"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "무료",
    features: ["월 5회 카드 생성", "기본 캘린더", "공유 링크"],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩4,900 / 월",
    features: [
      "월 30회 카드 생성",
      "AI 배경 제거",
      "프리미엄 카드 스타일",
      "고화질 다운로드",
    ],
    current: false,
  },
];

export default function ProfilePage() {
  const [editingName, setEditingName] = useState(false);
  const [nickname, setNickname] = useState("나의 OOTD");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  return (
    <main className="min-h-screen bg-[#fdf8f8] pb-28">
      {/* 헤더 */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[24px] font-bold font-display text-[#1c1b1b] tracking-tight">
          Profile
        </h1>
      </div>

      {/* 프로필 카드 */}
      <section className="mx-4 bg-white rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mb-4">
        <div className="flex items-center gap-4">
          {/* 프로필 이미지 */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#f1edec] flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-[40px] text-[#747878]">
                person
              </span>
            </div>
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-black rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[14px]">
                edit
              </span>
            </button>
          </div>

          {/* 닉네임 */}
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 text-lg font-semibold bg-[#f1edec] rounded-xl px-3 py-1.5 outline-none text-[#1c1b1b]"
                  autoFocus
                />
                <button
                  onClick={() => setEditingName(false)}
                  className="w-8 h-8 bg-black rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-white text-[16px]">
                    check
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[#1c1b1b]">
                  {nickname}
                </span>
                <button onClick={() => setEditingName(true)}>
                  <span className="material-symbols-outlined text-[18px] text-[#747878]">
                    edit
                  </span>
                </button>
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="bg-[#f1edec] text-[#5d5e60] text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Free Plan
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 구독 플랜 */}
      <section className="mx-4 mb-4">
        <h2 className="text-xs font-semibold text-[#747878] uppercase tracking-widest mb-3 px-1">
          Plan
        </h2>
        <div className="flex gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex-1 rounded-[20px] p-4 border-2 transition-all ${
                plan.current
                  ? "border-black bg-white"
                  : "border-[#f1edec] bg-white"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-[#1c1b1b]">{plan.name}</p>
                  <p className="text-xs text-[#747878] mt-0.5">{plan.price}</p>
                </div>
                {plan.current && (
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-full">
                    현재
                  </span>
                )}
              </div>
              <ul className="space-y-1 mb-4">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1.5 text-xs text-[#444748]"
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#66BB6A]">
                      check_circle
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {!plan.current && (
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="w-full bg-black text-white rounded-full py-2 text-xs font-semibold uppercase tracking-widest"
                >
                  업그레이드
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 설정 메뉴 */}
      <section className="mx-4 bg-white rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden mb-4">
        {[
          { icon: "notifications", label: "알림 설정" },
          { icon: "lock", label: "개인정보 보호" },
          { icon: "help", label: "고객센터" },
          { icon: "info", label: "앱 정보" },
        ].map((item, i, arr) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#f7f3f2] transition-colors ${
              i < arr.length - 1 ? "border-b border-[#f1edec]" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[22px] text-[#444748]">
              {item.icon}
            </span>
            <span className="text-sm text-[#1c1b1b]">{item.label}</span>
            <span className="material-symbols-outlined text-[18px] text-[#c4c7c7] ml-auto">
              chevron_right
            </span>
          </button>
        ))}
      </section>

      {/* 로그아웃 + 탈퇴 */}
      <section className="mx-4 flex flex-col gap-2">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full bg-white rounded-[20px] py-4 text-sm font-semibold text-[#1c1b1b] border border-[#f1edec] shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        >
          로그아웃
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3 text-xs text-[#ba1a1a] font-medium"
        >
          회원 탈퇴
        </button>
      </section>

      {/* 플랜 업그레이드 모달 (Mock) */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-[32px] p-6 pb-10 max-w-md mx-auto">
            <div className="w-10 h-1 bg-[#e5e2e1] rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-[#1c1b1b] mb-2">Pro 플랜</h3>
            <p className="text-sm text-[#747878] mb-6">
              월 30회 카드 생성, AI 배경 제거 등 프리미엄 기능을 이용하세요.
            </p>
            <button className="w-full bg-black text-white rounded-full py-4 text-sm font-semibold uppercase tracking-widest mb-3">
              ₩4,900 / 월로 시작하기
            </button>
            <button
              onClick={() => setShowPlanModal(false)}
              className="w-full py-3 text-sm text-[#747878]"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 회원 탈퇴 모달 (Mock) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[#1c1b1b] mb-2">회원 탈퇴</h3>
            <p className="text-sm text-[#747878] mb-6 leading-relaxed">
              탈퇴하면 모든 OOTD 기록과 카드가 영구적으로 삭제됩니다. 정말
              탈퇴하시겠어요?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-[#f1edec] text-[#1c1b1b] rounded-full py-3 text-sm font-semibold"
              >
                취소
              </button>
              <button className="flex-1 bg-[#ba1a1a] text-white rounded-full py-3 text-sm font-semibold">
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
