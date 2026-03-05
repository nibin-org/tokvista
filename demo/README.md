# Tokvista Demo

This is a demo application showcasing the `tokvista` package.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Add your own token source (recommended for each user):
```bash
cp .env.example .env.local
```
Set `NEXT_PUBLIC_DEMO_SOURCE` in `demo/.env.local` to your own raw GitHub `tokens.json` URL.

Example:
```env
NEXT_PUBLIC_DEMO_SOURCE=https://raw.githubusercontent.com/your-org/your-repo/main/tokens.json
```

3. Run the development server:
```bash
npm run dev
```
This command builds the root `tokvista` package first, then starts the demo.

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Shared Preview vs Full Mode

- `http://localhost:3000/?source=<raw-github-url>` opens shared preview mode (locked features).
- `http://localhost:3000/` uses local/full mode.
- If `NEXT_PUBLIC_DEMO_SOURCE` is set, the demo loads that token file by default on localhost.

## Features Demonstrated

- Interactive color palette visualization
- Spacing scale display
- Size scale display  
- Border radius showcase
- Copy-to-clipboard functionality
- Search and filter capabilities

## Package Used

- [tokvista](https://www.npmjs.com/package/tokvista) - Beautiful, interactive visual documentation for design tokens
