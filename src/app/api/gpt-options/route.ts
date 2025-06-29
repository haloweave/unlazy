import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // You can parse the question if you want: const { question } = await request.json();
  return NextResponse.json({
    options: [
      { label: "A", text: "Start with user flows", correct: true },
      { label: "B", text: "Jump straight into UI design", correct: false },
      { label: "C", text: "Focus on colors first", correct: false }
    ]
  });
} 