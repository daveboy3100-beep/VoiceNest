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
const today = new Date().toISOString().split("T")[0];

const userSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  }
);

const { data: usageData, error: usageError } = await userSupabase
  .from("voice_usage")
  .select("generation_count")
  .eq("user_id", userId)
  .eq("usage_date", today)
  .maybeSingle();

if (usageError) {
  console.error("Usage check error:", usageError);

  return res.status(500).json({
    error: "Unable to check your daily voice usage."
  });
}

const DAILY_LIMIT = 5;
const usageCount = usageData?.generation_count || 0;

if (usageCount >= DAILY_LIMIT) {
  return res.status(429).json({
    error:
      "Daily voice generation limit reached. Please try again tomorrow."
  });
}

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

  const styleInstructions = {
  natural:
    "Speak naturally and conversationally, with a relaxed and authentic delivery.",

  professional:
    "Speak professionally and clearly, with a polished, confident, and trustworthy delivery.",

  calm:
    "Speak calmly and smoothly, with a gentle, relaxed, and reassuring delivery.",

  energetic:
    "Speak with energy and enthusiasm, using an upbeat, lively, and engaging delivery.",

  cinematic:
    "Speak with a dramatic cinematic storytelling tone, using controlled intensity, emotional emphasis, and a sense of narrative depth.",

  motivational:
    "Speak with an inspiring, powerful, and confident motivational delivery. Build energy naturally, emphasize important words, and sound encouraging without becoming exaggerated.",

  documentary:
    "Speak with a calm, authoritative, and engaging documentary narration style. Sound informative, composed, intelligent, and slightly cinematic while maintaining clear storytelling.",

  news:
    "Speak with a professional broadcast-news delivery. Sound clear, precise, composed, and authoritative, with controlled pacing and strong emphasis on important information."
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
    .then(async (response) => {
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

const { error: usageInsertError } = await supabase.rpc(
  "increment_voice_usage",
  {
    p_user_id: userId,
    p_usage_date: today
  }
);

if (usageInsertError) {
  console.error(
    "Usage record error:",
    usageInsertError
  );

  return res.status(500).json({
    error: "Voice generated, but usage could not be recorded."
  });
}

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
