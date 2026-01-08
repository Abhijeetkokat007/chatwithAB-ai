"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";


type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          useWebSearch,
        }),
      });

      const assistantMessage: Message = await res.json();
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Backend error." },
      ]);
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



  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-black dark:text-white">
          Chatwith <span className="rounded-xl bg-black px-2 py-1 text-white dark:bg-white dark:text-black">AB</span>
        </h1>

        <button
          onClick={toggleTheme}
          className="rounded-lg border px-3 py-1 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {messages.length === 0 && (
            <div className="text-center text-zinc-500 dark:text-zinc-400">
              👋 Start typing to begin the conversation with ChatWithAB
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={` rounded-2xl   text-sm ${msg.role === "user"
                  ? "bg-black max-w-[75%] text-white dark:bg-zinc-800 dark:text-white px-4 py-2"
                  : "  text-black dark:text-gray-100 px-5"
                  }`}
              >
                {/* <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-2 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc ml-5 mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal ml-5 mb-2">{children}</ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    code: ({ inline, children }) =>
                      inline ? (
                        <code className="bg-zinc-300 dark:bg-zinc-700 px-1 rounded">
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-zinc-900 text-white p-3 rounded-lg overflow-x-auto">
                          <code>{children}</code>
                        </pre>
                      ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown> */}

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
            <div className="text-zinc-500 text-sm">Thinking...</div>
          )}
        </div>
      </main>

      {/* Input */}
      {/* <footer className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-4">
        <div className="mx-auto max-w-3xl flex gap-2 items-center">
          <button
            onClick={() => setUseWebSearch(!useWebSearch)}
            className={`rounded-xl px-3 py-2 text-sm border ${
              useWebSearch
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            🌐 Web
          </button>

          <input
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Send a message..."
            className="flex-1 rounded-xl border px-4 py-3 text-sm bg-white dark:bg-zinc-900 text-black dark:text-white"
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="rounded-xl bg-black px-5 py-3 text-sm text-white dark:bg-white dark:text-black"
          >
            Send
          </button>
        </div>
      </footer> */}

      <footer className="border-t border-zinc-200 dark:border-zinc-800 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-sm">

            {/* Input */}
            <input
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Search the web"
              className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white placeholder-zinc-500"
            />

            {/* Web Toggle */}
            <button
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs border transition cursor-pointer ${useWebSearch
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-500 dark:text-zinc-300"
                }`}
            >
              🌐 Web
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={loading}
              className="h-9  cursor-pointer w-9 flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
            >
              ↑
            </button>

          </div>

          {/* Footer note */}
          <p className="mt-2 text-center text-xs text-zinc-500">
            ChatwithAB can make mistakes. Check important info.
          </p>
        </div>
      </footer>
    </div>
  );
}
