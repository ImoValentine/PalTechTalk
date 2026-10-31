# PalTech Talk

A private conversation app for Valentine and The Pal, built with React, Vite, and Express. Valentine joins with `VALENTINE_ROOM_KEY`; The Pal joins with `PAL_ROOM_KEY`. Every message sent as The Pal earns 10 points. At 500 points, the app celebrates the agreed company share and compensation milestone.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env
```

Edit `.env` and set two different, private room codes. Start the API and Vite app in separate terminals with `npm run api` and `npm run dev`. Open the Vite URL printed by `npm run dev`. For a single-server production preview, run `npm run build` followed by `npm start`, then open `http://localhost:3000`.

## Data and deployment

Messages are stored in `data/messages.json`; uploaded pictures are stored in `data/uploads/`. Keep the `data/` directory on persistent storage and back it up. The app limits each image upload to 8 MB.

**This storage setup is not ready for Vercel Functions.** Vercel Functions have a read-only filesystem apart from temporary `/tmp` storage, so message and upload files written by this app would not persist reliably. Before deploying to Vercel, migrate messages to a managed database and images to persistent object storage, then configure those services in Vercel environment variables. Otherwise, host the Express server on a service with a persistent disk.

Use HTTPS and long, unpredictable room codes for any public deployment. The current room codes are the app's only access control.

## Gemini helper

Create a Gemini API key and set `GEMINI_API_KEY` in `.env` or the deployment environment. The key stays on the server; it is never included in the browser app. The **Ask Gemini** button drafts text into the composer for you to review and send.

## Note

The 500-point reward is an in-app milestone, not an automated equity grant or compensation agreement. Bonus build feedback is posted to the conversation; messages sent as The Pal receive the existing 10 points.
