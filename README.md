# NoteTube

Paste a YouTube link → get AI notes from Gemini, streamed as they're written.

**Stack:** Bun · Express · Vite + React + Tailwind · Gemini (`@google/genai`)

## Run it

```bash
bun install
cp backend/.env.example backend/.env   # put your Gemini key in it
bun dev
```

Open http://localhost:5173 (Vite). The backend runs on port 3000 and Vite proxies `/api` to it.

## How it works

`POST /api/notes { url }` →

1. `getVideoId` pulls the video id out of the link.
2. `getTranscript` (backend/src/transcript.ts) loads the watch page to read the Innertube
   API key, then POSTs to `youtube.com/youtubei/v1/player` to list caption tracks.
3. It downloads the chosen track (XML with `<text start dur>` pieces)...
4. ...and joins the text into one string.
5. `streamNotes` sends it to Gemini and the notes are streamed back as plain text.

The frontend reads the stream and renders the Markdown as it arrives.

Note: this uses YouTube's unofficial internal API. It works from a home connection, but YouTube
often blocks cloud servers, and it can break if YouTube changes its internals.
