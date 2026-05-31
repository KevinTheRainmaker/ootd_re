import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat, lon 필요" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`;
  const res = await fetch(url, { next: { revalidate: 1800 } });

  if (!res.ok) {
    return NextResponse.json({ error: "날씨 API 오류" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    temp: Math.round(data.main.temp),
    humidity: data.main.humidity,
    condition: data.weather[0].main,
    description: data.weather[0].description,
    iconCode: data.weather[0].icon,
  });
}
