
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MemoryItem } from '@/types/memory';
import ForceGraph3D from 'react-force-graph-3d';
import { useTheme } from 'next-themes';

interface KnowledgeGraphProps {
  items: MemoryItem[];
  onNodeClick?: (item: MemoryItem) => void;
}

export default function KnowledgeGraph({ items, onNodeClick }: KnowledgeGraphProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const { theme } = useTheme();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (wrapperRef.current) {
      setDimensions({
        width: wrapperRef.current.clientWidth,
        height: 500
      });
    }

    const handleResize = () => {
        if (wrapperRef.current) {
            setDimensions({
                width: wrapperRef.current.clientWidth,
                height: 500
            });
        }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    const nodes = items.map(item => ({
      id: item.id,
      name: item.title || item.summary?.substring(0, 20) || 'Untitled',
      group: item.type,
      val: item.favorite ? 20 : 10, // Size based on favorite
      itemData: item
    }));

    const links: { source: string; target: string }[] = [];
    
    // Create links based on shared keywords
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const k1 = items[i].keywords || [];
        const k2 = items[j].keywords || [];
        // If they share any keywords, link them
        const intersection = k1.filter(x => k2.includes(x));
        
        // Also link by emotion if present
        const sameEmotion = items[i].emotion && items[j].emotion && items[i].emotion === items[j].emotion;

        if (intersection.length > 0 || sameEmotion) {
          links.push({
            source: items[i].id,
            target: items[j].id
          });
        }
      }
    }

    return { nodes, links };
  }, [items]);

  // Auto-rotate camera
  useEffect(() => {
    const timer = setInterval(() => {
        if(graphRef.current) {
            const angle = Date.now() * 0.0003;
            graphRef.current.cameraPosition({
                x: 200 * Math.sin(angle),
                z: 200 * Math.cos(angle)
            });
        }
    }, 20);
    return () => clearInterval(timer);
  }, []);

  const getNodeColor = (node: any) => {
      switch(node.group) {
          case 'youtube': return '#ef4444'; // red
          case 'image': return '#ec4899'; // pink
          case 'twitter': return '#3b82f6'; // blue
          case 'article': return '#06b6d4'; // cyan
          default: return '#8b5cf6'; // purple
      }
  }

  return (
    <div ref={wrapperRef} className="w-full h-[500px] bg-zinc-950 rounded-2xl border border-zinc-800 relative overflow-hidden shadow-2xl">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-full flex items-center gap-3 shadow-lg">
            <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-cyan-500 blur-sm animate-ping"></div>
            </div>
            <span className="text-xs font-bold tracking-wider text-zinc-100 uppercase">Neural Galaxy 3D</span>
          </div>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
          <div className="text-[10px] text-zinc-500 bg-black/50 px-2 py-1 rounded">
              Left Click: Rotate | Right Click: Pan | Scroll: Zoom | Click Node: Edit
          </div>
      </div>

      <ForceGraph3D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={getNodeColor}
        nodeResolution={16}
        linkWidth={0.5}
        linkOpacity={0.3}
        linkColor={() => '#3f3f46'} // zinc-700
        backgroundColor="#09090b" // zinc-950
        onNodeClick={(node: any) => onNodeClick && onNodeClick(node.itemData)}
        nodeRelSize={4}
        enableNodeDrag={false}
        showNavInfo={false}
      />
    </div>
  );
}
