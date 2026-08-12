const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "VoiceNest backend is working"
  });
});
app.post("/api/generate", async (req, res) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Please sign in before generating a voiceover."
    });
  }

  const accessToken = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({
      error: "Your session is invalid. Please sign in again."
    });
  }
const userId = user.id;
  
  const text = String(req.body.text || "").trim();
  const voice = req.body.voice || "Kore";
  const style = req.body.style || "natural";

  if (!text) {
    return res.status(400).json({
      error: "Please enter a script first."
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Gemini API key is missing."
    });
  }

  const styleInstructio 
    ns = {
    natural: "Speak naturally and conversationally.",
    professional: "Speak professionally and clearly.",
    calm: "Speak calmly and smoothly.",
    energetic: "Speak with energy and enthusiasm.",
    cinematic: "Speak with a dramatic cinematic storytelling tone."
  };

  const prompt =
    `${styleInstructions[style] || styleInstructions.natural} ` +
    "Read the following script exactly as written. " +
    "Do not add extra words.\n\n" +
    text;

  ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      }
    }
  })
    .then((response) => {
      const audioPart =
        response.candidates?.[0]?.content?.parts?.find(
          (part) => part.inlineData?.data
        );

      if (!audioPart) {
        throw new Error("Gemini returned no audio.");
      }

      const pcmData = Buffer.from(
        audioPart.inlineData.data,
        "base64"
      );

      const sampleRate = 24000;
      const channels = 1;
      const bitsPerSample = 16;
      const blockAlign = 2;
      const byteRate = 48000;

      const header = Buffer.alloc(44);

      header.write("RIFF", 0);

      header.writeUInt32LE(
        36 + pcmData.length,
        4
      );

      header.write("WAVE", 8);
      header.write("fmt ", 12);

      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(channels, 22);

      header.writeUInt32LE(
        sampleRate,
        24
      );

      header.writeUInt32LE(
        byteRate,
        28
      );

      header.writeUInt16LE(
        blockAlign,
        32
      );

      header.writeUInt16LE(
        bitsPerSample,
        34
      );

      header.write("data", 36);

      header.writeUInt32LE(
        pcmData.length,
        40
      );

      const wavFile = Buffer.concat([
        header,
        pcmData
      ]);

      res.set({
        "Content-Type": "audio/wav",
        "Content-Length": wavFile.length,
        "Cache-Control": "no-store"
      });

      res.send(wavFile);
    })
    .catch((error) => {
      console.error(
        "Voice generation error:",
        error
      );

      res.status(500).json({
        error:
          error?.message ||
          "Voice generation failed."
      });
    });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `VoiceNest is running on port ${PORT}`
  );
});
