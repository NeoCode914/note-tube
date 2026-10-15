// Fetch a YouTube transcript ourselves, the same way YouTube's own player does.

const ANDROID_CLIENT = { clientName: "ANDROID", clientVersion: "20.10.38" };

type CaptionTrack = { baseUrl: string; languageCode: string; kind?: string };

// Step 1: get the 11-character video id out of any common YouTube link.
export function getVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  return match ? match[1] : null;
}

export async function getTranscript(videoId: string, languages = ["en", "hi"]): Promise<string> {
  // Step 2a: load the watch page to find the Innertube API key.
  const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "Accept-Language": "en-US" },
  }).then((r) => r.text());

  const apiKey = html.match(/"INNERTUBE_API_KEY":\s*"([\w-]+)"/)?.[1];
  if (!apiKey) throw new Error("Couldn't read the YouTube page (YouTube may be blocking this network).");

  // Step 2b: ask the internal "player" API which caption tracks exist.
  const player = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: { client: ANDROID_CLIENT }, videoId }),
  }).then((r) => r.json());

  const status = player?.playabilityStatus;
  if (status?.status && status.status !== "OK") {
    throw new Error(`YouTube says: ${status.reason ?? status.status}`);
  }

  const tracks: CaptionTrack[] = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) throw new Error("This video has no captions.");

  // Prefer human-made captions in our languages, then auto-generated ("asr"), then anything.
  const track =
    languages
      .flatMap((lang) => [
        tracks.find((t) => t.languageCode === lang && t.kind !== "asr"),
        tracks.find((t) => t.languageCode === lang),
      ])
      .find(Boolean) ?? tracks[0];

  // Step 3: download the captions as XML: <text start=".." dur="..">words</text>
  const xml = await fetch(track.baseUrl.replace("&fmt=srv3", "")).then((r) => r.text());

  // Step 4: pull out the text pieces and join them into one string.
  const pieces = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) =>
    decodeEntities(decodeEntities(m[1])) // captions are often escaped twice (&amp;#39;)
      .replace(/<[^>]+>/g, "") // drop any formatting tags like <i>
      .replace(/\s+/g, " ")
      .trim(),
  );

  const transcript = pieces.filter(Boolean).join(" ");
  if (!transcript) throw new Error("The captions came back empty.");
  return transcript;
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return String.fromCodePoint(n);
    }
    return named[code.toLowerCase()] ?? whole;
  });
}
