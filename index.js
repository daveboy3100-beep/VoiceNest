const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

const { GoogleGenAI } = require("@google/genai");
const { createClient } = require("@supabase/supabase-js");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

// ============================================================
// ENVIRONMENT
// ============================================================

dotenv.config();


// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

const PORT = process.env.PORT || 3000;


// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

const requiredEnv = [
  "GEMINI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY"
];

const missingEnv = requiredEnv.filter(
  (key) => !process.env[key]
);

if (missingEnv.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnv.join(", ")
  );
}


// ============================================================
// EXTERNAL SERVICES
// ============================================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


// ============================================================
// APP SETTINGS
// ============================================================

const MAX_SCRIPT_CHARACTERS = 10000;

const VOICE_CHUNK_SIZE = 3500;

const DAILY_VOICE_LIMIT = 5;


// ============================================================
// JOB STORAGE
// ============================================================
//
// IMPORTANT:
// This is an in-memory job store for the current stage.
//
// It allows the browser to disconnect from the generation
// request without cancelling the generation itself.
//
// Later, for production scale, we can move this to Supabase
// or a proper persistent queue.
//
// ============================================================

const voiceJobs = new Map();


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// ============================================================
// STYLE INSTRUCTIONS
// ============================================================

const STYLE_INSTRUCTIONS = {

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


// ============================================================
// HELPER: GET AUTHENTICATED USER
// ============================================================

async function getAuthenticatedUser(req) {

  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {

    return {
      user: null,
      accessToken: null,
      error:
        "Please sign in before using this feature.",
      status: 401
    };

  }


  const accessToken =
    authHeader
      .replace("Bearer ", "")
      .trim();


  if (!accessToken) {

    return {
      user: null,
      accessToken: null,
      error:
        "Please sign in before using this feature.",
      status: 401
    };

  }


  try {

    const {
      data: {
        user
      },
      error
    } =
      await supabase.auth.getUser(
        accessToken
      );


    if (
      error ||
      !user
    ) {

      return {
        user: null,
        accessToken,
        error:
          "Your session is invalid. Please sign in again.",
        status: 401
      };

    }


    return {
      user,
      accessToken,
      error: null,
      status: 200
    };


  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );


    return {
      user: null,
      accessToken,
      error:
        "Unable to verify your session.",
      status: 401
    };

  }

}


// ============================================================
// HELPER: USER-SCOPED SUPABASE CLIENT
// ============================================================

function createUserSupabaseClient(
  accessToken
) {

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      }
    }
  );

}


// ============================================================
// HELPER: GET TODAY
// ============================================================

function getToday() {

  return new Date()
    .toISOString()
    .split("T")[0];

}


// ============================================================
// HELPER: CHECK VOICE USAGE
// ============================================================

async function checkVoiceUsage(
  userId,
  accessToken
) {

  const today =
    getToday();


  const userSupabase =
    createUserSupabaseClient(
      accessToken
    );


  const {
    data,
    error
  } =
    await userSupabase
      .from("voice_usage")
      .select("generation_count")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "usage_date",
        today
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Usage check error:",
      error
    );

    throw new Error(
      "Unable to check your daily voice usage."
    );

  }


  const count =
    data?.generation_count || 0;


  return {
    today,
    count,
    remaining:
      Math.max(
        DAILY_VOICE_LIMIT - count,
        0
      )
  };

}


// ============================================================
// HELPER: INCREMENT VOICE USAGE
// ============================================================

async function incrementVoiceUsage(
  userId
) {

  const today =
    getToday();


  const {
    error
  } =
    await supabase.rpc(
      "increment_voice_usage",
      {
        p_user_id: userId,
        p_usage_date: today
      }
    );


  if (error) {

    console.error(
      "Voice usage increment error:",
      error
    );

    throw new Error(
      "Voice generated, but usage could not be recorded."
    );

  }

}


// ============================================================
// SCRIPT CHUNKING
// ============================================================

function splitScriptIntoChunks(
  text,
  maxCharacters = VOICE_CHUNK_SIZE
) {

  const chunks = [];

  let remaining =
    String(text || "")
      .trim();


  while (
    remaining.length >
    maxCharacters
  ) {

    let splitAt =
      remaining.lastIndexOf(
        "\n",
        maxCharacters
      );


    if (
      splitAt <
      maxCharacters * 0.6
    ) {

      splitAt =
        remaining.lastIndexOf(
          ". ",
          maxCharacters
        );

    }


    if (
      splitAt <
      maxCharacters * 0.6
    ) {

      splitAt =
        remaining.lastIndexOf(
          "! ",
          maxCharacters
        );

    }


    if (
      splitAt <
      maxCharacters * 0.6
    ) {

      splitAt =
        remaining.lastIndexOf(
          "? ",
          maxCharacters
        );

    }


    if (
      splitAt <
      maxCharacters * 0.6
    ) {

      splitAt =
        maxCharacters;

    }


    const chunk =
      remaining
        .slice(0, splitAt)
        .trim();


    if (chunk) {

      chunks.push(chunk);

    }


    remaining =
      remaining
        .slice(splitAt)
        .trim();

  }


  if (remaining) {

    chunks.push(
      remaining
    );

  }


  return chunks;

}


// ============================================================
// GEMINI TTS: GENERATE ONE CHUNK
// ============================================================

async function generatePcmForChunk(
  text,
  voice,
  styleInstruction
) {

  const prompt =
    `${styleInstruction}

Read the following script exactly as written.

Do not add extra words.
Do not summarize.
Do not explain anything.
Do not introduce the script.

SCRIPT:

${text}`;


  const response =
    await ai.models.generateContent({

    
        model:
  "gemini-3.1-flash-tts-preview",

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

        responseModalities: [
          "AUDIO"
        ],

        speechConfig: {

          voiceConfig: {

            prebuiltVoiceConfig: {

              voiceName:
                voice

            }

          }

        }

      }

    });


  const audioPart =
    response
      .candidates?.[0]
      ?.content?.parts
      ?.find(
        (part) =>
          part.inlineData?.data
      );


  if (!audioPart) {

    throw new Error(
      "Gemini returned no audio for one of the script sections."
    );

  }


  return Buffer.from(
    audioPart.inlineData.data,
    "base64"
  );

}
function convertWavToMp3(wavBuffer) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      return reject(
        new Error("FFmpeg executable could not be found.")
      );
    }

    const ffmpeg = spawn(ffmpegPath, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "wav",
      "-i",
      "pipe:0",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-f",
      "mp3",
      "pipe:1"
    ]);

    const outputChunks = [];
    const errorChunks = [];

    ffmpeg.stdout.on("data", (chunk) => {
      outputChunks.push(chunk);
    });

    ffmpeg.stderr.on("data", (chunk) => {
      errorChunks.push(chunk);
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        const errorMessage =
          Buffer.concat(errorChunks)
            .toString("utf8")
            .trim();

        return reject(
          new Error(
            errorMessage ||
            `FFmpeg exited with code ${code}.`
          )
        );
      }

      const mp3Buffer =
        Buffer.concat(outputChunks);

      if (!mp3Buffer.length) {
        return reject(
          new Error(
            "FFmpeg produced an empty MP3 file."
          )
        );
      }

      resolve(mp3Buffer);
    });

    ffmpeg.stdin.on("error", (error) => {
      reject(error);
    });

    ffmpeg.stdin.end(wavBuffer);
  });
      }

// ============================================================
// PCM → WAV
// ============================================================

function createWavFromPcm(
  pcmData
) {

  const sampleRate = 24000;

  const channels = 1;

  const bitsPerSample = 16;

  const blockAlign =
    channels *
    (bitsPerSample / 8);

  const byteRate =
    sampleRate *
    blockAlign;


  const header =
    Buffer.alloc(44);


  header.write(
    "RIFF",
    0
  );


  header.writeUInt32LE(
    36 + pcmData.length,
    4
  );


  header.write(
    "WAVE",
    8
  );


  header.write(
    "fmt ",
    12
  );


  header.writeUInt32LE(
    16,
    16
  );


  header.writeUInt16LE(
    1,
    20
  );


  header.writeUInt16LE(
    channels,
    22
  );


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


  header.write(
    "data",
    36
  );


  header.writeUInt32LE(
    pcmData.length,
    40
  );


  return Buffer.concat([
    header,
    pcmData
  ]);

}


// ============================================================
// JOB ID
// ============================================================

function createJobId(
  userId
) {

  return `${userId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

}


// ============================================================
// PROCESS VOICE JOB
// ============================================================

async function processVoiceJob(
  jobId
) {

  const job =
    voiceJobs.get(jobId);


  if (!job) {

    console.error(
      `Voice job ${jobId} no longer exists.`
    );

    return;

  }


  try {

    job.status =
      "processing";

    job.progress =
      0;


    const pcmChunks = [];


    for (
      let i = 0;
      i < job.chunks.length;
      i++
    ) {

      console.log(
        `Voice job ${jobId}: generating chunk ${i + 1} of ${job.chunks.length}`
      );


      const pcmData =
        await generatePcmForChunk(

          job.chunks[i],

          job.voice,

          job.styleInstruction

        );


      pcmChunks.push(
        pcmData
      );


      job.completedChunks =
        i + 1;


      job.progress =
        Math.round(
          (
            (i + 1) /
            job.chunks.length
          ) * 90
        );

    }


    console.log(
      `Voice job ${jobId}: combining audio`
    );


    const pcmData =
      Buffer.concat(
        pcmChunks
      );


    const wavFile =
  createWavFromPcm(
    pcmData
  );


job.audio =
  wavFile;


job.progress =
  95;


console.log(
  `Voice job ${jobId}: converting WAV to MP3`
);


const mp3File =
  await convertWavToMp3(
    wavFile
  );


job.mp3 =
  mp3File;


    console.log(
      `Voice job ${jobId}: recording usage`
    );


    try {

      await incrementVoiceUsage(
        job.userId
      );

    } catch (usageError) {

      console.error(
        `Voice job ${jobId}: usage recording failed`,
        usageError
      );


      job.status =
        "failed";

      job.error =
        usageError.message ||
        "Voice generated, but usage could not be recorded.";


      return;

    }


    job.progress =
      100;


    job.status =
      "completed";


    job.completedAt =
      Date.now();


    console.log(
      `Voice job ${jobId}: completed`
    );


  } catch (error) {

    console.error(
      `Voice job ${jobId} failed:`,
      error
    );


    job.status =
      "failed";


    job.error =
      error?.message ||
      "Voice generation failed.";


    job.failedAt =
      Date.now();

  }

}


// ============================================================
// JOB CLEANUP
// ============================================================
//
// Keep completed/failed jobs for 30 minutes.
// This gives the frontend plenty of time to retrieve the audio.
//
// ============================================================

const JOB_RETENTION_MS =
  30 * 60 * 1000;


setInterval(
  () => {

    const now =
      Date.now();


    for (
      const [
        jobId,
        job
      ] of voiceJobs
    ) {

      const finished =
        job.status === "completed" ||
        job.status === "failed";


      if (
        finished &&
        job.completedAt &&
        now - job.completedAt >
          JOB_RETENTION_MS
      ) {

        voiceJobs.delete(
          jobId
        );


        console.log(
          `Removed expired voice job ${jobId}`
        );

      }

    }

  },
  5 * 60 * 1000
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      status: "ok",

      message:
        "VoiceNest backend is working",

      timestamp:
        new Date().toISOString()

    });

  }
);


// ============================================================
// CREATE VOICE JOB
// ============================================================

app.post(
  "/api/voice-job",
  async (req, res) => {

    try {

      const auth =
        await getAuthenticatedUser(
          req
        );


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              auth.error
          });

      }


      const {
        user,
        accessToken
      } = auth;


      const text =
        String(
          req.body.text || ""
        ).trim();


      const voice =
        String(
          req.body.voice || "Kore"
        );


      const style =
        String(
          req.body.style || "natural"
        );


      if (!text) {

        return res
          .status(400)
          .json({

            error:
              "Please enter a script first."

          });

      }


      if (
        text.length >
        MAX_SCRIPT_CHARACTERS
      ) {

        return res
          .status(400)
          .json({

            error:
              "Your script is too long. Please keep it under 10,000 characters."

          });

      }


      if (
        !process.env.GEMINI_API_KEY
      ) {

        return res
          .status(500)
          .json({

            error:
              "Gemini API key is missing."

          });

      }


      const usage =
        await checkVoiceUsage(
          user.id,
          accessToken
        );


      if (
        usage.count >=
        DAILY_VOICE_LIMIT
      ) {

        return res
          .status(429)
          .json({

            error:
              "Daily voice generation limit reached. Please try again tomorrow."

          });

      }


      const chunks =
        splitScriptIntoChunks(
          text
        );


      if (!chunks.length) {

        return res
          .status(400)
          .json({

            error:
              "Unable to split the script into voice sections."

          });

      }


      const styleInstruction =
        STYLE_INSTRUCTIONS[style] ||
        STYLE_INSTRUCTIONS.natural;


      const jobId =
        createJobId(
          user.id
        );


      const job = {

        jobId,

        userId:
          user.id,

        status:
          "queued",

        progress:
          0,

        completedChunks:
          0,

        totalChunks:
          chunks.length,

        chunks,

        voice,

        style,

        styleInstruction,

        audio:
          null,

        error:
          null,

        createdAt:
          Date.now(),

        completedAt:
          null,

        failedAt:
          null

      };
    

const { error: jobInsertError } =
  await supabase
    .from("voice_jobs")
    .insert({
      id: jobId,
      user_id: user.id,
      status: "queued",
      progress: 0,
      total_chunks: chunks.length,
      completed_chunks: 0
    });

if (jobInsertError) {

  console.error(
    "Supabase voice job creation error:",
    jobInsertError
  );

  return res
    .status(500)
    .json({
      error:
        "Unable to create your voice generation job. Please try again."
    });

}

voiceJobs.set(
  jobId,
  job
);

      


      console.log(
        `Created voice job ${jobId} with ${chunks.length} chunk(s)`
      );


      // IMPORTANT:
      // Send the response BEFORE starting the long job.
      //
      // This is the key difference from /api/generate.
      //

      res
        .status(202)
        .json({

          jobId,

          status:
            "queued",

          progress:
            0,

          completedChunks:
            0,

          totalChunks:
            chunks.length

        });


      // Start background processing.
      //
      // The browser does NOT need to keep this request open.

      setImmediate(
        () => {

          processVoiceJob(
            jobId
          ).catch(
            (error) => {

              console.error(
                `Unhandled voice job error ${jobId}:`,
                error
              );

            }
          );

        }
      );


    } catch (error) {

      console.error(
        "Create voice job error:",
        error
      );


      if (!res.headersSent) {

        return res
          .status(500)
          .json({

            error:
              error?.message ||
              "Unable to create voice generation job."

          });

      }

    }

  }
);


// ============================================================
// GET VOICE JOB STATUS
// ============================================================

app.get(
  "/api/voice-job/:jobId",
  async (req, res) => {

    try {

      const auth =
        await getAuthenticatedUser(
          req
        );


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              auth.error
          });

      }


      const jobId =
        req.params.jobId;


      const job =
        voiceJobs.get(
          jobId
        );


      if (!job) {

        return res
          .status(404)
          .json({

            error:
              "Voiceover job not found."

          });

      }


      if (
        job.userId !==
        auth.user.id
      ) {

        return res
          .status(403)
          .json({

            error:
              "You do not have access to this voiceover job."

          });

      }


      return res.json({

        jobId:
          job.jobId,
status:
          job.status,

        progress:
          job.progress,

        completedChunks:
          job.completedChunks,

        totalChunks:
          job.totalChunks,

        error:
          job.error || null

      });


    } catch (error) {

      console.error(
        "Voice job status error:",
        error
      );


      return res
        .status(500)
        .json({

          error:
            "Unable to check voiceover job status."

        });

    }

  }
);


// ============================================================
// GET COMPLETED VOICE JOB AUDIO
// ============================================================

app.get(
  "/api/voice-job/:jobId/audio",
  async (req, res) => {

    try {

      const auth =
        await getAuthenticatedUser(
          req
        );


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              auth.error
          });

      }


      const job =
        voiceJobs.get(
          req.params.jobId
        );


      if (!job) {

        return res
          .status(404)
          .json({

            error:
              "Voiceover job not found."

          });

      }


      if (
        job.userId !==
        auth.user.id
      ) {

        return res
          .status(403)
          .json({

            error:
              "You do not have access to this voiceover job."

          });

      }


      if (
        job.status !==
        "completed"
      ) {

        return res
          .status(409)
          .json({

            error:
              "This voiceover is not ready yet.",

            status:
              job.status,

            progress:
              job.progress

          });

      }


      if (!job.audio) {

        return res
          .status(500)
          .json({

            error:
              "Voiceover completed but audio is unavailable."

          });

      }


      res.set({

        "Content-Type":
          "audio/wav",

        "Content-Length":
          job.audio.length,

        "Cache-Control":
          "no-store"

      });


      return res.send(
        job.audio
      );


    } catch (error) {

      console.error(
        "Voice job audio error:",
        error
      );


      return res
        .status(500)
        .json({

          error:
            "Unable to retrieve voiceover audio."

        });

    }

  }
);
// ============================================================
// GET COMPLETED VOICE JOB MP3
// ============================================================

app.get(
  "/api/voice-job/:jobId/mp3",
  async (req, res) => {

    try {

      const auth =
        await getAuthenticatedUser(
          req
        );


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              auth.error
          });

      }


      const job =
        voiceJobs.get(
          req.params.jobId
        );


      if (!job) {

        return res
          .status(404)
          .json({
            error:
              "Voiceover job not found."
          });

      }


      if (
        job.userId !==
        auth.user.id
      ) {

        return res
          .status(403)
          .json({
            error:
              "You do not have access to this voiceover job."
          });

      }


      if (
        job.status !==
        "completed"
      ) {

        return res
          .status(409)
          .json({

            error:
              "This voiceover is not ready yet.",

            status:
              job.status,

            progress:
              job.progress

          });

      }


      if (!job.mp3) {

        return res
          .status(500)
          .json({
            error:
              "Voiceover completed but MP3 audio is unavailable."
          });

      }


      res.set({

        "Content-Type":
          "audio/mpeg",

        "Content-Length":
          job.mp3.length,

        "Cache-Control":
          "no-store"

      });


      return res.send(
        job.mp3
      );


    } catch (error) {

      console.error(
        "Voice job MP3 error:",
        error
      );


      return res
        .status(500)
        .json({

          error:
            "Unable to retrieve voiceover MP3."

        });

    }

  }
);
// ============================================================
// LEGACY /api/generate
// ============================================================
//
// TEMPORARY BACKWARD COMPATIBILITY.
//
// Your current frontend still uses /api/generate.
// We are keeping this route until we update the frontend.
//
// After the frontend switches to /api/voice-job,
// this route can be removed.
//

app.post(
  "/api/generate",
  async (req, res) => {

    try {

      const auth =
        await getAuthenticatedUser(
          req
        );


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              auth.error
          });

      }


      const {
        user,
        accessToken
      } = auth;


      const text =
        String(
          req.body.text || ""
        ).trim();


      const voice =
        String(
          req.body.voice || "Kore"
        );


      const style =
        String(
          req.body.style || "natural"
        );


      if (!text) {

        return res
          .status(400)
          .json({

            error:
              "Please enter a script first."

          });

      }


      if (
        text.length >
        MAX_SCRIPT_CHARACTERS
      ) {

        return res
          .status(400)
          .json({

            error:
              "Your script is too long. Please keep it under 10,000 characters."

          });

      }


      if (
        !process.env.GEMINI_API_KEY
      ) {

        return res
          .status(500)
          .json({

            error:
              "Gemini API key is missing."

          });

      }


      const usage =
        await checkVoiceUsage(
          user.id,
          accessToken
        );


      if (
        usage.count >=
        DAILY_VOICE_LIMIT
      ) {

        return res
          .status(429)
          .json({

            error:
              "Daily voice generation limit reached. Please try again tomorrow."

          });

      }


      const styleInstruction =
        STYLE_INSTRUCTIONS[style] ||
        STYLE_INSTRUCTIONS.natural;


      const chunks =
        splitScriptIntoChunks(
          text
        );


      console.log(
        `Legacy voice generation: ${chunks.length} chunk(s)`
      );


      const pcmChunks = [];


      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {

        console.log(
          `Legacy voice generation: chunk ${i + 1} of ${chunks.length}`
        );


        const pcmData =
          await generatePcmForChunk(

            chunks[i],

            voice,

            styleInstruction

          );


        pcmChunks.push(
          pcmData
        );

      }


      const pcmData =
        Buffer.concat(
          pcmChunks
        );


      const wavFile =
        createWavFromPcm(
          pcmData
        );


      await incrementVoiceUsage(
        user.id
      );


      res.set({

        "Content-Type":
          "audio/wav",

        "Content-Length":
          wavFile.length,

        "Cache-Control":
          "no-store"

      });


      return res.send(
        wavFile
      );


    } catch (error) {

      console.error(
        "Legacy voice generation error:",
        error
      );


      return res
        .status(500)
        .json({

          error:
            error?.message ||
            "Voice generation failed."

        });

    }

  }
);
// ============================================================
// AI SCRIPT GENERATOR
// ============================================================

app.post(
  "/api/generate-script",
  async (req, res) => {

    try {

      const auth =
        await getAuthenticatedUser(
          req
        );


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              "Please sign in before generating a script."
          });

      }


      const topic =
        String(
          req.body.topic || ""
        ).trim();


      const platform =
        req.body.platform ||
        "YouTube";


      const contentType =
        req.body.contentType ||
        "Educational";


      const tone =
        req.body.tone ||
        "Cinematic";


      const duration =
        req.body.duration ||
        "2 minutes";


      if (!topic) {

        return res
          .status(400)
          .json({

            error:
              "Please enter a topic or idea first."

          });

      }


      if (
        !process.env.GEMINI_API_KEY
      ) {

        return res
          .status(500)
          .json({

            error:
              "Gemini API key is missing."

          });

      }


      const prompt = `

You are the AI script generator for VoiceNest, a professional creator tool.

Create a high-quality ${duration} script based on the following idea:

TOPIC:
${topic}

PLATFORM:
${platform}

CONTENT TYPE:
${contentType}

TONE:
${tone}

Requirements:

- Make the script engaging from the beginning.
- Start with a strong hook appropriate for the platform.
- Keep the writing natural and easy to narrate.
- Structure the script logically.
- Match the requested tone.
- Avoid unnecessary headings unless they improve the script.
- Do not explain what you are doing.
- Do not include notes to the creator.
- Do not wrap the script in quotation marks.
- Return only the finished script.

`;


      const response =
        await ai.models.generateContent({

          model:
            "gemini-3.1-flash-lite",

          contents:
            prompt

        });


      const generatedText =
        response.text?.trim();


      if (!generatedText) {

        throw new Error(
          "Gemini returned an empty script."
        );

      }


      return res.json({

        script:
          generatedText

      });


    } catch (error) {

      console.error(
        "Script generation error:",
        error
      );


      return res
        .status(500)
        .json({

          error:
            error?.message ||
            "Script generation failed."

        });

    }

  }
);
// ============================================================
// 404 API HANDLER
// ============================================================

app.use(
  "/api",
  (req, res) => {

    res
      .status(404)
      .json({

        error:
          "VoiceNest API endpoint not found."

      });

  }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {

    console.error(
      "Unhandled Express error:",
      error
    );


    if (
      res.headersSent
    ) {

      return next(
        error
      );

    }


    return res
      .status(500)
      .json({

        error:
          "An unexpected server error occurred."

      });

  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "========================================"
    );

    console.log(
      "VoiceNest backend started"
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Environment: ${process.env.NODE_ENV || "development"}`
    );

    console.log(
      "========================================"
    );

  }
);
        
        
            
