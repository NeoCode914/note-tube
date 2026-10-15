import express from "express";
import { getTranscript, getVideoId } from "./transcript";
import { streamNotes } from "./gemini";

const app = express();
app.use(express.json());

app.post("/api/notes", async (req, res) => {
  const videoId = getVideoId(req.body?.url ?? "");
  if (!videoId) {
    res.status(400).json({ error: "That doesn't look like a YouTube link." });
    return;
  }

  let transcript: string;
  try {
    transcript = await getTranscript(videoId);
  } catch (err) {
    res.status(400).json({ error: `Couldn't get the transcript: ${(err as Error).message}` });
    return;
  }

  // Stream the notes back as plain text, chunk by chunk.
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  try {
    for await (const text of streamNotes(transcript)) res.write(text);
  } catch (err) {
    res.write(`\n\n**Error from Gemini:** ${(err as Error).message}`);
  }
  res.end();
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
