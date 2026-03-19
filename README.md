# EduCRM Static Web

This project builds as a static web app with Vite. The default demo flow runs entirely in the browser and stores data in `localStorage`, so it does not require a backend.

## Local development

Prerequisite: Node.js

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`

## Production build

1. Generate the static bundle with `npm run build`
2. Deploy the `dist/` folder to any static host

The build uses relative asset paths, so it can be served from a root domain or a subfolder without changing the router setup.

## Optional Gemini AI

The AI assistant is optional. To enable it for a build, create `.env.local` with:

```bash
VITE_GEMINI_API_KEY=your_key_here
```

Any `VITE_` variable is bundled into the client, so do not use a sensitive production key in a public deployment.
