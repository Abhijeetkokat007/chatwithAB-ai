import OpenAI from "openai";
import { tavily } from "@tavily/core";
import { NextResponse } from "next/server";
import NodeCache from "node-cache";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY!,
});

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const cache = new NodeCache({ stdTTL: 60*60*24 }); // 24 hours




// 🧠 In-memory conversation (later DB)
const systemPrompt = {
  role: "system",
  content:
    "You are Abhijeet, a smart personal assistant. Be polite. You can use tools when needed.",
};

// export async function POST(req: Request) {
//   try {
//     const { messages } = await req.json();

//     const conversation = [systemPrompt, ...messages];

//     while (true) {
//       const response = await client.chat.completions.create({
//         model: "openai/gpt-oss-20b",
//         temperature: 0.7,
//         messages: conversation,
//         tools: [
//           {
//             type: "function",
//             function: {
//               name: "webSearch",
//               description: "Search the web for current information",
//               parameters: {
//                 type: "object",
//                 properties: {
//                   query: { type: "string" },
//                 },
//                 required: ["query"],
//               },
//             },
//           },
//         ],
//         tool_choice: "auto",
//       });

//       const msg = response.choices[0].message;

//       // ✅ Final AI answer
//       if (!msg.tool_calls) {
//         return NextResponse.json({
//           role: "assistant",
//           content: msg.content,
//         });
//       }

//       // 🔧 Tool handling
//       for (const tool of msg.tool_calls) {
//   if (tool.type !== "function") continue;

//   const args = JSON.parse(tool.function.arguments);

//   if (tool.function.name === "webSearch") {
//     const result = await webSearch(args);

//     conversation.push({
//       role: "tool",
//       tool_call_id: tool.id,
//       name: tool.function.name,
//       content: result,
//     });
//   }
// }

//     }
//   } catch (err: any) {
//   console.error("❌ API ERROR:", err);

//   return NextResponse.json(
//     {
//       error: err?.message || "Unknown error",
//     },
//     { status: 500 }
//   );
// }

// }

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const cacheKey = `chat:${JSON.stringify(messages)}`;

    // ✅ Check cache first
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log("⚡ Chat cache hit");
      return NextResponse.json(cachedResponse);
    }

    const conversation = [systemPrompt, ...messages];

    while (true) {
      const response = await client.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0.7,
        messages: conversation,
        tools: [
          {
            type: "function",
            function: {
              name: "webSearch",
              description: "Search the web for current information",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string" },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto",
      });

      const msg = response.choices[0].message;

      // ✅ Final answer
      if (!msg.tool_calls) {
        const finalResponse = {
          role: "assistant",
          content: msg.content,
        };

        // 🔥 Store final response in cache
        cache.set(cacheKey, finalResponse);

        return NextResponse.json(finalResponse);
      }

      // 🔧 Tool calls
      for (const tool of msg.tool_calls) {
        if (tool.type !== "function") continue;

        const args = JSON.parse(tool.function.arguments);

        if (tool.function.name === "webSearch") {
          const result = await webSearch(args);

          conversation.push({
            role: "tool",
            tool_call_id: tool.id,
            name: tool.function.name,
            content: result,
          });
        }
      }
    }
  } catch (err: any) {
    console.error("❌ API ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}


// async function webSearch({ query }: { query: string }) {
//   const response = await tvly.search(query);

//   return response.results
//     .slice(0, 3)
//     .map((r) => r.content)
//     .join("\n\n");
// }

async function webSearch({ query }: { query: string }) {
  const cacheKey = `web:${query}`;

  // ✅ Cache hit
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    console.log("⚡ Web search cache hit:", query);
    return cached;
  }

  // ❌ Cache miss → call Tavily
  const response = await tvly.search(query);

  const content = response.results
    .slice(0, 3)
    .map((r) => r.content)
    .join("\n\n");

  // 🔥 Store in cache
  cache.set(cacheKey, content);

  return content;
}

