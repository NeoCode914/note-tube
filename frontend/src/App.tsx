import { useState } from "react";
import Markdown from "react-markdown";

export default function App() {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotes("");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      // Read the streamed notes and show them as they arrive.
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setNotes((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">NoteTube</h1>
      <p className="mt-1 text-gray-600">Paste a YouTube link and get AI-generated notes.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
        />
        <button
          disabled={loading}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Working..." : "Get notes"}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {loading && !notes && <p className="mt-6 text-gray-500">Fetching transcript...</p>}

      {notes && (
        <article className="prose mt-8 max-w-none border-t border-gray-200 pt-6">
          <Markdown>{notes}</Markdown>
        </article>
      )}
    </main>
  );
}
