const express = require("express");

const router = express.Router();

// ============================================================
// IMAGE GENERATOR SETTINGS
// ============================================================

const IMAGE_PROVIDER =
  (
    process.env.IMAGE_PROVIDER ||
    "pollinations"
  )
    .trim()
    .toLowerCase();

const GEMINI_IMAGE_MODEL =
  "gemini-2.5-flash-image";

const POLLINATIONS_IMAGE_MODEL =
  "flux";

const MAX_IMAGE_PROMPT_CHARACTERS =
  4000;

const ALLOWED_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3"
];
function getImageDimensions(aspectRatio) {

  const dimensions = {

    "1:1": {
      width: 1024,
      height: 1024
    },

    "16:9": {
      width: 1024,
      height: 576
    },

    "9:16": {
      width: 576,
      height: 1024
    },

    "4:3": {
      width: 1024,
      height: 768
    },

    "3:4": {
      width: 768,
      height: 1024
    },

    "3:2": {
      width: 1024,
      height: 683
    },

    "2:3": {
      width: 683,
      height: 1024
    }

  };

  return (
    dimensions[aspectRatio] ||
    dimensions["1:1"]
  );

}


// ============================================================
// DEPENDENCIES PROVIDED BY index.js
// ============================================================

let ai = null;

let getAuthenticatedUser = null;


// ============================================================
// INITIALIZE IMAGE GENERATOR
// ============================================================

function initializeImageGenerator(
  dependencies
) {

  ai =
    dependencies.ai;

  getAuthenticatedUser =
    dependencies.getAuthenticatedUser;


  if (
  IMAGE_PROVIDER === "gemini" &&
  !ai
) {

  throw new Error(
    "Image Generator: Gemini client was not provided."
  );

  }


  if (
    typeof getAuthenticatedUser !==
    "function"
  ) {

    throw new Error(
      "Image Generator: authentication helper was not provided."
    );

  }


  return router;

}


// ============================================================
// GENERATE IMAGE
// ============================================================

router.post(
  "/generate-image",
  async (req, res) => {

    try {

      // --------------------------------------------------------
      // AUTHENTICATION
      // --------------------------------------------------------

      const auth =
        await getAuthenticatedUser(req);


      if (!auth.user) {

        return res
          .status(auth.status)
          .json({
            error:
              auth.error
          });

      }


      // --------------------------------------------------------
      // INPUT
      // --------------------------------------------------------

      const prompt =
        String(
          req.body?.prompt || ""
        ).trim();


      const aspectRatio =
        String(
          req.body?.aspectRatio ||
          "1:1"
        ).trim();


      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (!prompt) {

        return res
          .status(400)
          .json({
            error:
              "Please describe the image you want to create."
          });

      }


      if (
        prompt.length >
        MAX_IMAGE_PROMPT_CHARACTERS
      ) {

        return res
          .status(400)
          .json({
            error:
              "Your image prompt is too long. Please keep it under 4,000 characters."
          });

      }


      if (
        !ALLOWED_ASPECT_RATIOS.includes(
          aspectRatio
        )
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid image aspect ratio."
          });

      }

// ============================================================
// IMAGE GENERATION PROVIDER
// ============================================================

if (
  IMAGE_PROVIDER !== "gemini" &&
  IMAGE_PROVIDER !== "pollinations"
) {

  console.error(
    "Invalid image generation provider:",
    IMAGE_PROVIDER
  );

  return res
    .status(500)
    .json({

      error:
        "Image generation provider is not configured correctly."

    });

}


// ------------------------------------------------------------
// GENERATION VARIABLES
// ------------------------------------------------------------

let imageData = null;

let mimeType =
  "image/png";

let modelUsed = null;


// ------------------------------------------------------------
// GENERATION START
// ------------------------------------------------------------

console.log(
  `Image generation started for user ${auth.user.id}`
);

console.log(
  `Image provider: ${IMAGE_PROVIDER}`
);


// ============================================================
// POLLINATIONS IMAGE GENERATION
// ============================================================

if (
  IMAGE_PROVIDER === "pollinations"
) {

  const pollinationsApiKey =
    process.env.POLLINATIONS_API_KEY;


  // ----------------------------------------------------------
  // POLLINATIONS API KEY CHECK
  // ----------------------------------------------------------

  if (!pollinationsApiKey) {

    console.error(
      "Image Generator: Pollinations API key is missing."
    );

    return res
      .status(500)
      .json({

        error:
          "Pollinations image generation is not configured."

      });

  }


  // ----------------------------------------------------------
  // MODEL
  // ----------------------------------------------------------

  modelUsed =
  POLLINATIONS_IMAGE_MODEL;


  // ----------------------------------------------------------
  // BUILD POLLINATIONS URL
  // ----------------------------------------------------------

  const encodedPrompt =
    encodeURIComponent(
      prompt
    );


  const dimensions =
  getImageDimensions(
    aspectRatio
  );


const pollinationsUrl =
  `https://gen.pollinations.ai/image/${encodedPrompt}` +
  `?model=${encodeURIComponent(modelUsed)}` +
  `&width=${dimensions.width}` +
  `&height=${dimensions.height}`;


  console.log(
    "Sending image generation request to Pollinations..."
  );


  // ----------------------------------------------------------
  // REQUEST
  // ----------------------------------------------------------

  const pollinationsResponse =
    await fetch(
      pollinationsUrl,
      {

        method:
          "GET",

        headers: {

          "Authorization":
            `Bearer ${pollinationsApiKey}`,

          "Accept":
            "image/*"

        }

      }
    );


  // ----------------------------------------------------------
  // HANDLE POLLINATIONS ERROR
  // ----------------------------------------------------------

  if (
    !pollinationsResponse.ok
  ) {

    const errorText =
      await pollinationsResponse.text();


    console.error(
      "Pollinations image generation error:",
      errorText
    );

return res
  .status(
    pollinationsResponse.status
  )
  .json({

    error:
      "Image generation is temporarily unavailable. Please try again."

  });
    
  }


  // ----------------------------------------------------------
  // READ IMAGE
  // ----------------------------------------------------------

  const imageBuffer =
    Buffer.from(
      await pollinationsResponse.arrayBuffer()
    );


  if (
    !imageBuffer.length
  ) {

    console.error(
      "Pollinations returned an empty image."
    );

    return res
      .status(502)
      .json({

        error:
          "Pollinations returned an empty image."

      });

  }


  // ----------------------------------------------------------
  // CONVERT IMAGE TO BASE64
  // ----------------------------------------------------------

  imageData =
    imageBuffer.toString(
      "base64"
    );


  mimeType =
    pollinationsResponse.headers.get(
      "content-type"
    ) ||
    "image/png";


}


// ============================================================
// GEMINI IMAGE GENERATION
// ============================================================

if (
  IMAGE_PROVIDER === "gemini"
) {


  // ----------------------------------------------------------
  // GEMINI CLIENT CHECK
  // ----------------------------------------------------------

  if (!ai) {

    console.error(
      "Image Generator: Gemini client is unavailable."
    );

    return res
      .status(500)
      .json({

        error:
          "Gemini image generation is temporarily unavailable."

      });

  }


  // ----------------------------------------------------------
  // GEMINI MODEL
  // ----------------------------------------------------------

  modelUsed =
  GEMINI_IMAGE_MODEL;


  console.log(
    "Sending image generation request to Gemini..."
  );


  // ----------------------------------------------------------
  // GENERATE IMAGE
  // ----------------------------------------------------------

  const response =
    await ai.models.generateContent({

      model:
        modelUsed,

      contents:
        prompt,

      config: {

        responseModalities: [
          "Image"
        ],

        responseFormat: {

          image: {

            aspectRatio:
              aspectRatio

          }

        }

      }

    });


  // ----------------------------------------------------------
  // FIND IMAGE DATA
  // ----------------------------------------------------------

  const parts =
    response
      ?.candidates?.[0]
      ?.content?.parts ||
    [];


  const imagePart =
    parts.find(
      (part) =>
        part.inlineData &&
        part.inlineData.data
    );


  if (!imagePart) {

    console.error(
      "Image Generator: Gemini returned no image data."
    );

    return res
      .status(502)
      .json({

        error:
          "VoiceNest could not generate the image. Please try again."

      });

  }


  // ----------------------------------------------------------
  // EXTRACT IMAGE
  // ----------------------------------------------------------

  imageData =
    imagePart
      .inlineData
      .data;


  mimeType =
    imagePart
      .inlineData
      .mimeType ||
    "image/png";

}


// ============================================================
// SUCCESS
// ============================================================

console.log(
  `Image generation completed for user ${auth.user.id}`
);


console.log(
  `Provider used: ${IMAGE_PROVIDER}`
);


console.log(
  `Model used: ${modelUsed}`
);


return res.json({

  success:
    true,

  image: {

    data:
      imageData,

    mimeType:
      mimeType

  },

  model:
    modelUsed,

  provider:
    IMAGE_PROVIDER,

  aspectRatio:
    aspectRatio

});


} catch (error) {

  // ==========================================================
  // GLOBAL IMAGE GENERATION ERROR
  // ==========================================================

  console.error(
    "Image generation error:",
    error
  );


  return res
    .status(500)
    .json({

      error:
        error?.message ||
        "Image generation failed. Please try again."

    });

  }
      


      

      

// ============================================================
// EXPORT
// ============================================================

module.exports =
  initializeImageGenerator;
