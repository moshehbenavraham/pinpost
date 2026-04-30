# PinPost

PinPost is a social post preview workspace for composing, enhancing, and checking content across Instagram, LinkedIn, X, and Facebook before publishing.

## Requirements

- Node.js 20+
- npm
- Supabase project with email and optional Google OAuth enabled
- OpenAI API key for AI post enhancement

## Environment

Create a local `.env` file with:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

## Development

```sh
npm install
npm run dev
```

## Verification

```sh
npm run build
npm run lint
```
