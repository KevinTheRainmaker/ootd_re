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

  const itemLines = request.items
    .slice(0, 5)
    .map(
      (item) =>
        `- ${item.style_description ?? item.category}${item.color ? ` (${item.color})` : ""}`,
    )
    .join("\n");

  const prompt = `이 패션 사진 위에 손글씨 스타일의 주석을 추가해주세요.
상단에 "오늘의 OOTD"를 손글씨로 써주세요.
사진 옆 여백에 아래 아이템들을 손글씨로 표기해주세요:
${itemLines}
하단에 "${request.hashtags.slice(0, 3).join(" ")}"를 작게 써주세요.
일기장 느낌의 손글씨 카드 스타일로 만들어주세요. 원본 패션 사진은 유지하세요.`;

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
