import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === "your-key-here") {
  console.warn("⚠️  GEMINI_API_KEY is not set. Put your key in backend/.env and restart.");
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const PROMPT = `You are a helpful note-taker. Turn this YouTube video transcript into clear,
well-structured study notes in Markdown, written in English. Start with a short summary,
then use headings and bullet points for the main ideas. Don't add facts that aren't in the video.

Transcript:
`;

// Yields the notes a piece at a time as Gemini writes them.
export async function* streamNotes(transcript: string) {
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: PROMPT + transcript,
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
