'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SearchBar({
  onResults,
}: {
  onResults: (ids: string[] | null) => void;
}) {
  const [mode, setMode] = useState<"text" | "emotion" | "image">("text");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);

  const emotions = ["Positive", "Informative", "Analytical", "Excited", "Neutral", "Personal"];

  
  // --- Text search logic (UPDATED to handle backend response) ---
  useEffect(() => {
    if (mode !== 'text') return;
    let isStale = false;

    const searchTimeout = setTimeout(async () => {
      const trimmedQuery = query.trim();

      if (trimmedQuery === "") {
        onResults(null);
        return;
      }

      setLoading(true);
      try {
        let resultIds: string[] | null = null; // Variable to hold the final IDs
        let searchError: any = null; // Variable to hold potential errors

        // --- Conditional Logic ---
        if (trimmedQuery.includes(' ')) {
          // --- Multiple Words: Call backend ---
          console.log("Multiple words detected, calling backend NLP route...");
          try {
            const response = await fetch('http://localhost:3001/searchNLPSql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: trimmedQuery })
            });

            if (!response.ok) {
              // Try to get error message from backend response body
              let errorBody = null;
              try { errorBody = await response.json(); } catch (_) {}
              throw new Error(`Backend NLP search failed with status ${response.status}: ${errorBody?.error || response.statusText}`);
            }

            // --- THIS IS THE KEY CHANGE ---
            // Expect { ids: [...] } from the backend
            const result = await response.json();
            resultIds = result.ids || []; // Extract the IDs array

          } catch (backendError) {
             console.error("Error calling backend NLP search:", backendError);
             searchError = backendError;
          }

        } else {
          // --- Single Word: Direct DB search ---
          console.log("Single word detected, performing direct DB search...");
          const singleWordQuery = trimmedQuery.toLowerCase();
          const { data, error } = await supabase
            .from('retain_auth_memory')
            .select('id')
            .textSearch('fts', singleWordQuery, {
              type: 'websearch',
              config: 'simple'
            });
            
          if (error) {
             searchError = error;
          } else {
             resultIds = data ? data.map(item => String(item.id)) : [];
          }
        }
        // --- End of Conditional Logic ---


        // Handle results (unified for both paths)
        if (isStale) return;

        if (searchError) {
          console.error("Error during search:", searchError);
          onResults([]); // Send empty array on error
        } else {
          onResults(resultIds); // Send the found IDs (or empty array)
        }

      } finally {
        if (!isStale) setLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(searchTimeout);
      isStale = true;
    };
  }, [query, mode, onResults]);

  
  async function handleEmotion(emotion: string) {
    setLoading(true);
    try {
        const { data, error } = await supabase
          .rpc('search_by_emotion', { emotion_query: emotion })
          .select('id');
        if (error) {
            console.error("Error during emotion search:", error);
            onResults([]);
            return;
        }
        onResults(data.map((item) => String(item.id)));
    } finally {
        setLoading(false);
    }
  }

  async function handleImage(file?: File | null) {
    if (!file) return;
    setLoading(true);
    setImageKeywords([]);
    onResults(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('http://localhost:3001/searchByImage', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      const keywords = result.keywords || [];
      setImageKeywords(keywords);

      if (keywords.length === 0) {
        onResults([]);
        return;
      }

      const searchQuery = keywords.join(' | ');
      const { data, error } = await supabase
        .from('retain_auth_memory')
        .select('id')
        .textSearch('fts', searchQuery, {
            type: 'websearch',
            config: 'simple'
        });

      if (error) {
        throw error;
      }
      
      const matchingIds = data.map(item => String(item.id));
      onResults(matchingIds);

    } catch (error) {
      console.error("Error during image search:", error);
      onResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-zinc-900/80 p-1">
          <button
            onClick={() => { setMode("text"); setQuery(""); setImageKeywords([]); onResults(null); }}
            className={`rounded px-3 py-1 text-xs font-medium transition ${mode === "text" ? "bg-zinc-900 text-cyan-400" : "text-zinc-500"}`}
          >
            Text
          </button>
          <button
            onClick={() => { setMode("emotion"); setQuery(""); setImageKeywords([]); onResults(null); }}
            className={`rounded px-3 py-1 text-xs font-medium transition ${mode === "emotion" ? "bg-zinc-900 text-cyan-400" : "text-zinc-500"}`}
          >
            Emotion
          </button>
          <button
            onClick={() => { setMode("image"); setQuery(""); setImageKeywords([]); onResults(null); }}
            className={`rounded px-3 py-1 text-xs font-medium transition ${mode === "image" ? "bg-zinc-900 text-cyan-400" : "text-zinc-500"}`}
          >
            Image
          </button>
        </div>

        {mode === "text" && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="h-9 flex-1 rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-900"
          />
        )}

        {mode === "image" && (
          <label className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border border-zinc-800/50 bg-zinc-900/50 text-xs text-zinc-400 hover:text-zinc-300">
            {loading ? "Processing..." : "Upload"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
          </label>
        )}
      </div>

      {mode === "emotion" && (
        <div className="flex flex-wrap gap-1.5">
          {emotions.map((e) => (
            <button
              key={e}
              onClick={() => handleEmotion(e)}
              className="rounded-md bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700/50 hover:text-cyan-400"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {imageKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {imageKeywords.map(k => (
            <span key={k} className="rounded bg-zinc-800/50 px-2 py-0.5 text-xs text-zinc-500">{k}</span>
          ))}
        </div>
      )}
    </div>
  );
}