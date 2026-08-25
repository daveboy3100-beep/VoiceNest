const express = require("express");

const router = express.Router();


// ============================================================
// IMAGE GENERATOR SETTINGS
// ============================================================

const IMAGE_MODEL =
  "gemini-2.5-flash-image";

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


// ============================================================
// IMAGE GENERATION ROUTE
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
          req.body.prompt || ""
        ).trim();


      const aspectRatio =
        String(
          req.body.aspectRatio || "1:1"
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


      // --------------------------------------------------------
      // API KEY CHECK
      // --------------------------------------------------------

      if (
        !process.env.GEMINI_API_KEY
      ) {

        console.error(
          "Image Generator: GEMINI_API_KEY is missing."
        );

        return res
          .status(500)
          .json({
            error:
              "Image generation is temporarily unavailable."
          });

      }


      // --------------------------------------------------------
      // GENERATE IMAGE
      // --------------------------------------------------------

      console.log(
        `Image generation started for user ${auth.user.id}`
      );


      const response =
        await ai.models.generateContent({

          model:
            IMAGE_MODEL,

          contents:
            prompt,

          config: {

            responseModalities: [
              "IMAGE"
            ],

            responseFormat: {

              image: {

                aspectRatio:
                  aspectRatio

              }

            }

          }

        });


      // --------------------------------------------------------
      // FIND GENERATED IMAGE
      // --------------------------------------------------------

      const parts =
        response
          ?.candidates?.[0]
          ?.content?.parts || [];


      const imagePart =
        parts.find(
          (part) =>
            part.inlineData?.data
        );


      if (!imagePart) {

        console.error(
          "Image Generator: Gemini returned no image."
        );

        return res
          .status(502)
          .json({
            error:
              "VoiceNest could not get an image from the image model. Please try again."
          });

      }


      const imageData =
        imagePart.inlineData.data;


      const mimeType =
        imagePart.inlineData.mimeType ||
        "image/png";


      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      console.log(
        `Image generation completed for user ${auth.user.id}`
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
          IMAGE_MODEL,

        aspectRatio:
          aspectRatio

      });


    } catch (error) {

      console.error(
        "Image generation error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Image generation failed. Please try again."
        });

    }

  }
);


// ============================================================
// DEPENDENCIES
// ============================================================
//
// These are supplied by index.js.
//
// We intentionally do NOT create another Gemini client,
// Supabase client, or Express server here.
// ============================================================

let ai;
let getAuthenticatedUser;


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


  if (!ai) {

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


module.exports =
  initializeImageGenerator;
