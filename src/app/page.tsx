"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatThread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export default function Home() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  /* ---------------- Load Threads ---------------- */
  useEffect(() => {
    const stored = localStorage.getItem("chat_threads");
    if (stored) {
      const parsed: ChatThread[] = JSON.parse(stored);
      setThreads(parsed);
      setActiveThreadId(parsed[0]?.id ?? null);
    }
  }, []);

  /* ---------------- Persist Threads ---------------- */
  useEffect(() => {
    localStorage.setItem("chat_threads", JSON.stringify(threads));
  }, [threads]);

  /* ---------------- Active Thread ---------------- */
  const activeThread = threads.find((t) => t.id === activeThreadId);

  /* ---------------- Auto Scroll ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages, loading]);

  /* ---------------- Create New Chat ---------------- */
  const createNewChat = () => {
    const newChat: ChatThread = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };
    setThreads((prev) => [newChat, ...prev]);
    setActiveThreadId(newChat.id);
  };

  /* ---------------- Delete Chat ---------------- */
  const deleteChat = (id: string) => {
    const filtered = threads.filter((t) => t.id !== id);
    setThreads(filtered);
    if (id === activeThreadId) {
      setActiveThreadId(filtered[0]?.id ?? null);
    }
  };

  /* ---------------- Rename Chat ---------------- */
  const renameChat = (id: string) => {
    const title = prompt("Rename chat");
    if (!title) return;

    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title } : t))
    );
  };

  /* ---------------- Send Message ---------------- */
  const handleSend = async () => {
    if (!input.trim() || loading || !activeThread) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, messages: [...t.messages, userMessage] }
          : t
      )
    );

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...activeThread.messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          useWebSearch,
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? {
              ...t,
              title:
                t.title === "New Chat"
                  ? userMessage.content.slice(0, 30)
                  : t.title,
              messages: [...t.messages, assistantMessage],
            }
            : t
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-4 mb-3 border-b pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-4 mb-2">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-3 mb-1">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className=" leading-7">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc ml-6 mb-3 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal ml-6 mb-3 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    hr: () => <hr className="my-6 border-zinc-300 dark:border-zinc-700" />,
    code({ className, children }) {
      const isInline = !className;
      return isInline ? (
        <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">
          {children}
        </code>
      ) : (
        <pre className="bg-zinc-900 text-white p-4 rounded-lg overflow-x-auto mb-4">
          <code>{children}</code>
        </pre>
      );
    },
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="flex h-screen bg-black text-white">
      {/* ========== SIDEBAR ========== */}
      <aside className="w-64 border-r border-zinc-800 p-3">
        <button
          onClick={createNewChat}
          className="w-full mb-3 rounded-lg bg-gray-300 text-black py-2 text-sm"
        >
          + New Chat
        </button>

        <div className="space-y-1 overflow-y-auto">
          {threads.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center justify-between px-2 py-2 rounded-md text-sm cursor-pointer ${chat.id === activeThreadId
                  ? "bg-zinc-800"
                  : "hover:bg-zinc-900"
                }`}
              onClick={() => setActiveThreadId(chat.id)}
            >
              <span className="truncate">{chat.title}</span>

              <div className="hidden group-hover:flex gap-1 text-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    renameChat(chat.id);
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ========== MAIN CHAT AREA ========== */}
      <div className="flex flex-1 flex-col">
        {/* Navbar */}
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <h1 className="text-xl font-semibold text-black dark:text-white">
            Chatwith <span className="rounded-xl bg-black px-2 py-1 text-white dark:bg-white dark:text-black">AB</span>
          </h1>


        </header>

        {/* Chat */}
        {/* <main className="flex-1  overflow-y-auto p-6 space-y-4  ">
          {activeThread?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex max-w-[75%] ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={` rounded-xl px-4 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-zinc-800 text-white max-w-[75%]"
                    : "bg-zinc-900 text-white"
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-zinc-400">Thinking…</div>
          )}
          <div ref={bottomRef} />
        </main> */}

        {/* Chat */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {activeThread?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`rounded-xl px-4  text-sm  ${msg.role === "user"
                      ? "bg-zinc-800 text-white py-1"
                      : "max-w-4xl text-white"
                    }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-sm text-zinc-400">Thinking…</div>
            )}

            <div ref={bottomRef} />
          </div>
        </main>


        {/* Footer */}
        <footer className="border-t border-zinc-800 p-4 bg-transparent">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-2 bg-transparent rounded-full border border-zinc-700 px-3 py-2">
              <input
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Search the web"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-500"
              />

              <button
                onClick={() => setUseWebSearch(!useWebSearch)}
                className={`rounded-full px-3 py-1 text-xs border ${useWebSearch
                    ? "bg-white text-black"
                    : "text-zinc-400 border-zinc-700"
                  }`}
              >
                🌐 Web
              </button>

              <button
                onClick={handleSend}
                disabled={loading}
                className="h-9 w-9 rounded-full bg-white text-black disabled:opacity-50"
              >
                ↑
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-zinc-500">
              ChatwithAB can make mistakes. Check important info.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
