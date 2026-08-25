import type { ItemCategory, OotdItem } from "../types";

export const SHARE_CATEGORY_LABELS: Record<ItemCategory, string> = {
  top: "상의",
  bottom: "하의",
  outer: "아우터",
  shoes: "신발",
  bag: "가방",
  accessory: "액세서리",
  hat: "모자",
  glasses: "안경",
  watch: "시계",
  other: "기타",
};

export type ShareItemSource = Pick<
  OotdItem,
  | "category"
  | "color"
  | "style_description"
  | "brand"
  | "product_name"
  | "image_url"
  | "crop_image_url"
>;

export interface ShareItemViewModel {
  name: string;
  category: ItemCategory;
  categoryLabel: string;
  imageUrl: string | null;
  details: Array<{ label: string; value: string }>;
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function toShareItemViewModel(
  item: ShareItemSource,
): ShareItemViewModel {
  const categoryLabel = SHARE_CATEGORY_LABELS[item.category];
  const color = clean(item.color);
  const description = clean(item.style_description);
  const brand = clean(item.brand);
  const productName = clean(item.product_name);
  const name =
    productName ??
    description ??
    (color ? `${color} ${categoryLabel}` : `${categoryLabel} 아이템`);

  const details = [
    { label: "카테고리", value: categoryLabel },
    color && { label: "색상", value: color },
    brand && { label: "브랜드", value: brand },
    productName && { label: "제품명", value: productName },
    description && { label: "설명", value: description },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail));

  return {
    name,
    category: item.category,
    categoryLabel,
    imageUrl: clean(item.image_url),
    details,
  };
}
