




import { OpenAI } from "openai";
import { NextRequest } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // Make sure your .env has OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      stream: true,
      messages: [
        {
          role: "system",
          content: "You are a university timetable generator.",
        },
        { role: "user", content: prompt },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(
              encoder.encode(chunk.choices[0]?.delta?.content || "")
            );
          }
          controller.close();
        } catch (streamError) {
          controller.error(streamError);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("API error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}

// import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   try {
//     const { prompt } = await req.json();
//     if (!prompt) {
//       return NextResponse.json(
//         { error: "Missing data in request body" },
//         { status: 400 }
//       );
//     }

//     // Make the API call to xAI Grok API
//     const response = await fetch("https://api.x.ai/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${process.env.XAI_API_KEY}`,
//       },
//       body: JSON.stringify({
//         model: "grok-3",
//         messages: [
//           {
//             role: "system",
//             content:
//               "You are a university timetable generator. Return ONLY valid JSON in the format specified, with no additional text.",
//           },
//           { role: "user", content: prompt },
//         ],
//         stream: true,
//         // max_tokens: 128000, // Adjust based on your tier's limit
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`Grok API error: ${response.statusText}`);
//     }

//     // Accumulate the streamed response
//     let fullResponse = "";
//     const reader = response.body?.getReader();
//     const decoder = new TextDecoder();
//     if (!reader) {
//       throw new Error("Failed to get response reader");
//     }

//     while (true) {
//       const { done, value } = await reader.read();
//       if (done) break;
//       fullResponse += decoder.decode(value);
//     }

//     // Parse the full timetable
//     let timetable;
//     try {
//       timetable = JSON.parse(fullResponse);
//     } catch (parseError) {
//       throw new Error(`Failed to parse JSON: ${parseError}`);
//     }

//     // Return the complete timetable
//     return NextResponse.json(timetable, {
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("API error:", error);
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 }
//     );
//   }
// }

