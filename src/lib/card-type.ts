import type { CardType } from "@/types/api";

export const CARD_TYPE_OPTIONS: readonly {
  type: CardType;
  label: string;
  icon: string;
  counted: boolean;
}[] = [
  { type: "basic", label: "기본", icon: "photo_library", counted: false },
  { type: "ai", label: "AI 카드", icon: "auto_awesome", counted: true },
];

export class InvalidCardTypeError extends Error {
  constructor() {
    super("invalid_card_type");
    this.name = "InvalidCardTypeError";
  }
}

export function normalizeCardType(value: unknown): CardType {
  if (value === undefined || value === "basic") return "basic";
  if (value === "ai" || value === "style") return "ai";
  throw new InvalidCardTypeError();
}
