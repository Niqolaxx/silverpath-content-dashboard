import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required." }, { status: 400 });
    }

    // Basic regex to get YouTube video ID
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 });
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(t => t.text).join(' ');

    // Attempt to fetch title (optional but helpful)
    let videoTitle = "YouTube Repurpose";
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const html = await pageRes.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
         // Clean " - YouTube" suffix
        videoTitle = titleMatch[1].replace(" - YouTube", "");
      }
    } catch (e) {
      console.error("Title Fetch Error:", e);
    }

    return NextResponse.json({ 
      transcript: fullText,
      title: videoTitle,
      videoId 
    });
  } catch (error: any) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ 
      error: "Could not fetch transcript. The video may have captions disabled or be restricted." 
    }, { status: 500 });
  }
}
