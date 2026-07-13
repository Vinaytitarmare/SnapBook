
import { MemoryItem } from "@/types/memory";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { jsPDF } from "jspdf"; 
import { MoreVertical, Heart, ExternalLink, Edit2, Trash2, Download, Monitor, Smartphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function TypeBadge({ type }: { type: MemoryItem["type"] }) {
    const label = type[0].toUpperCase() + type.slice(1);
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50 uppercase tracking-wider">
            {label}
        </span>
    );
}

function EmotionBadge({ emotion }: { emotion?: string }) {
    if (!emotion) return null;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-400/90 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50">
            {emotion}
        </span>
    );
}

function SourceBadge({ source }: { source?: 'M' | 'W' | 'E' }) {
    if (!source) return null;
    const isMobile = source === 'M';
    const Icon = isMobile ? Smartphone : Monitor;
    
    return (
        <div 
            title={isMobile ? 'Captured via Mobile' : 'Captured via Web'}
            className={cn(
                "p-1 rounded-full bg-zinc-800/80 border border-zinc-700/50",
                isMobile ? "text-purple-400" : "text-blue-400"
            )}
        >
            <Icon className="w-3 h-3" />
        </div>
    );
}

function getImageForType(type: MemoryItem["type"]) {
    switch (type) {
        case "youtube": return "/images/youtube.png";
        case "linkedin": return "/images/linkedin.png";
        case "twitter": return "/images/twitter.jpeg";
        case "reddit": return "/images/reddit.png";
        case "quora": return "/images/quora.png";
        case "instagram": return "/images/instagram.png";
        case "github": return "/images/github.png";
        default: return "/images/article.jpeg";
    }
}

export default function MemoryCard({
    item,
    onToggleFav,
    onDelete, 
    onEdit
}: {
    item: MemoryItem;
    onToggleFav?: (id: string) => void;
    onDelete?: (id: string) => void; 
    onEdit?: (item: MemoryItem) => void;
}) {
    const imageUrl = getImageForType(item.type);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(item.title, 10, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text("Summary:", 10, 35);
        const summaryLines = doc.splitTextToSize(item.summary || "No summary available.", 180);
        doc.text(summaryLines, 10, 42);
        doc.save(`${item.title.substring(0, 30)}_summary.pdf`);
    };
    
    const displaySource = item.source === 'M' ? 'M' : 'E';

    return (
        <article className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700 hover:shadow-xl hover:shadow-cyan-900/10">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="p-5 pb-2">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                             <TypeBadge type={item.type} />
                             <SourceBadge source={displaySource} />
                        </div>
                        <h3 className="line-clamp-2 text-base font-bold leading-snug text-zinc-100 group-hover:text-white transition-colors">
                            {item.title}
                        </h3>
                    </div>
                    
                    <div className="relative shrink-0">
                         <img
                            src={imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            onError={(e) => { e.currentTarget.src = "/images/article.jpeg"; }} 
                        />
                    </div>
                </div>
                
                <div className="mb-3 flex items-center gap-2">
                    <EmotionBadge emotion={item.emotion} />
                </div>

                {item.summary && (
                    <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        {item.summary}
                    </p>
                )}
            </div>

            <div className="mt-auto p-5 pt-0">
                {item.keywords && item.keywords.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                        {item.keywords.slice(0, 3).map((k) => (
                            <span
                                key={k}
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 bg-zinc-800/50 border border-zinc-800"
                            >
                                #{k}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-800/50 pt-3">
                    <time className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                        {(() => {
                            try {
                                return new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            } catch (e) { return ""; }
                        })()}
                    </time>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onToggleFav?.(item.id)}
                            className={cn(
                                "p-2 rounded-md transition-colors hover:bg-zinc-800",
                                item.favorite ? "text-pink-500" : "text-zinc-500 hover:text-pink-400"
                            )}
                            title="Toggle Favorite"
                        >
                            <Heart className={cn("w-4 h-4", item.favorite && "fill-current")} />
                        </button>

                        {item.url && (
                            <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-md transition-colors"
                                title="Open Original"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-zinc-800 text-zinc-200">
                                <DropdownMenuItem onClick={() => onEdit?.(item)} className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPDF} className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800">
                                    <Download className="mr-2 h-4 w-4" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete?.(item.id)} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-zinc-800 focus:bg-zinc-800 focus:text-red-300">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </article>
    );
}
