"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download } from "lucide-react";

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [chart]);

  const downloadPNG = () => {
    if (!ref.current) return;
    const svg = ref.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Get SVG dimensions
    const { width, height } = svg.getBBox();
    const padding = 40;
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;

    img.onload = () => {
      if (!ctx) return;
      // Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw SVG
      ctx.drawImage(img, padding, padding);
      
      // Export
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `silverpath-diagram-${Date.now()}.png`;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button 
        onClick={downloadPNG}
        className="no-print"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10,
          backdropFilter: 'blur(4px)',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      >
        <Download size={14} />
        Export PNG
      </button>
      <div 
        key={chart} 
        className="mermaid" 
        ref={ref} 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          background: 'rgba(255,255,255,0.02)', 
          padding: '48px 24px', 
          borderRadius: '16px', 
          border: '1px solid rgba(255,255,255,0.05)',
          overflowX: 'auto'
        }}
      >
        {chart}
      </div>
    </div>
  );
}
