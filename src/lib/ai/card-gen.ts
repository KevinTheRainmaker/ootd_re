import OpenAI, { toFile } from "openai";
import { ImageResponse } from "@vercel/og";
import type { ReactElement } from "react";
import type { GenerateCardRequest, GenerateCardResponse } from "@/types/api";
import { uploadCardImage } from "@/lib/storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function planA(
  request: GenerateCardRequest["ootd_data"],
  userId: string,
): Promise<GenerateCardResponse> {
  const res = await fetch(request.original_image_url);
  if (!res.ok) throw new Error("원본 이미지 fetch 실패");
  const buffer = Buffer.from(await res.arrayBuffer());
  const imageFile = await toFile(buffer, "fashion.jpg", { type: "image/jpeg" });

  const CATEGORY_LABEL: Record<string, string> = {
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

  const itemAnnotations = request.items
    .slice(0, 6)
    .map((item) => {
      const label = CATEGORY_LABEL[item.category] ?? item.category;
      const desc = item.style_description ?? "";
      const color = item.color ? ` (${item.color})` : "";
      return `• ${label}${color}: ${desc}`;
    })
    .join("\n");

  const hashtags = request.hashtags.slice(0, 5).join(" ");
  const summary = request.summary ?? "";

  const prompt = `이 패션 사진을 세련된 패션 매거진 스크랩북 / 편집숍 룩북 스타일의 OOTD 카드로 만들어줘. 원본 사진은 반드시 유지하고, 사진 위와 여백에 아래 요소를 추가해줘.

[컨셉]
전체적인 분위기는 세련된 패션 매거진의 스크랩북 또는 편집숍의 룩북 페이지처럼. 오브젝트 주변 여백을 활용해 흰색 손글씨 메모를 추가해줘.

[드로잉 규칙]
- 펜 스타일: 전문 패션 일러스트레이터가 가볍게 스케치한 듯한, 얇고 불규칙한 선
- 라인: 주요 패션 아이템 외곽선을 따라 얇고 감각적인 흰색 테두리 추가
- 유도: 화살표나 곡선 점선을 활용해 특정 디테일로 시선 유도
- 장식: ✨ ⭐️ ✅ 👕 📷 등 패션 감성 아이콘을 과하지 않게 배치

[텍스트 규칙]
- 언어: 한국어 손글씨체
- 말투: 전문적이면서 다정한 피드백, 친구에게 추천하는 톤

[이번 OOTD 분석 결과 - 이 내용을 사진에 손글씨로 표기해줘]
아이템별 메모:
${itemAnnotations}

총평: ${summary}

해시태그: ${hashtags}

[배치 가이드]
- 상단 여백: 해시태그 프레임 (${hashtags})
- 각 아이템 옆: 화살표+손글씨 설명
- 하단 여백: 총평 한 줄
- 전체: 손글씨 느낌 유지, 원본 사진 훼손 없이`;

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt,
    size: "1024x1536",
    quality: "medium",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image-1 응답에 이미지 없음");

  const cardBuffer = Buffer.from(b64, "base64");
  const { url } = await uploadCardImage(cardBuffer, userId);

  return { card_image_url: url, plan_used: "A" };
}

async function planB(
  request: GenerateCardRequest["ootd_data"],
  userId: string,
): Promise<GenerateCardResponse> {
  const itemLines = request.items.slice(0, 5).map((item) => ({
    label: item.style_description ?? item.category,
    color: item.color ?? "",
  }));

  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#faf9f7",
          padding: "48px",
          fontFamily: "serif",
          position: "relative",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: 36,
                fontWeight: "bold",
                marginBottom: 24,
                color: "#2d2d2d",
              },
              children: "오늘의 OOTD",
            },
          },
          {
            type: "img",
            props: {
              src: request.original_image_url,
              style: {
                width: "100%",
                height: 480,
                objectFit: "cover",
                borderRadius: 12,
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                marginTop: 24,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              },
              children: itemLines.map((item) => ({
                type: "div",
                props: {
                  style: {
                    fontSize: 20,
                    color: "#555",
                    display: "flex",
                    gap: 8,
                  },
                  children: `• ${item.label}${item.color ? ` — ${item.color}` : ""}`,
                },
              })),
            },
          },
          {
            type: "div",
            props: {
              style: { marginTop: 24, fontSize: 16, color: "#888" },
              children: request.hashtags.slice(0, 5).join(" "),
            },
          },
        ],
      },
    } as ReactElement,
    { width: 680, height: 960 },
  );

  const cardBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const { url } = await uploadCardImage(cardBuffer, userId);

  return { card_image_url: url, plan_used: "B" };
}

export async function generateCard(
  request: GenerateCardRequest["ootd_data"],
  userId: string,
): Promise<GenerateCardResponse> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await planA(request, userId);
    } catch {
      // intentional: fall through to Plan B
    }
  }
  return planB(request, userId);
}
