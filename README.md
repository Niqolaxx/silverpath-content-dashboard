# Silverpath Content Dashboard (Prototype)

This is a premium, client-facing dashboard prototype designed to showcase the multi-agent content generation workflow.

## Features
- **Glassmorphic UI**: High-end aesthetic using modern CSS blur and transparency.
- **Agent Timeline**: Simulated logging showing transitions between Gemini and Claude.
- **Workflow Stepper**: Track progress across all 7 steps of the Silverpath pack generation.
- **Content Preview**: Large markdown-ready preview area.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Styling**: Vanilla CSS (Glassmorphism)

## Getting Started

1. **Navigate to the dashboard folder**:
   ```bash
   cd dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **View in browser**: Open `http://localhost:3000`

## Production Deployment
To host this on **Vercel** or **Netlify**:
1. Push this folder to a GitHub repository.
2. Connect the repository to Vercel/Netlify.
3. Configure your API keys (Gemini & Claude) in the Environment Variables.
