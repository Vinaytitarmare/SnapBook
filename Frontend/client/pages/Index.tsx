
'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { MemoryItem } from "@/types/memory";
import SearchBar from "@/components/memory/SearchBar";
import MemoryCard from "@/components/memory/MemoryCard";
import Timeline from "@/components/memory/Timeline";
import Analytics from "@/components/memory/Analytics";
import QuickAdd from "@/components/memory/QuickAdd";
import KnowledgeGraph from "@/components/memory/KnowledgeGraph"; 

import { cn } from "@/lib/utils";
import { addMemoryWithQueue } from "@/services/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, X, Network, MessageSquare, LayoutGrid } from "lucide-react";

import { MoodPopup } from "@/components/memory/MoodPopup";
import { detectSadMood } from "@/lib/moodDetection";
import { fetchMoodBoostContent } from "@/lib/moodBoost";
import { MoodBoostPopup } from "@/components/memory/MoodBoostPopup"; 
import { EditMemoryDialog } from "@/components/memory/EditMemoryDialog";
import { SkeletonGrid } from "@/components/memory/SkeletonLoader";

// --- Data Transformation Helper ---
function transformDbItemToMemoryItem(dbItem: any): MemoryItem {
  const meta = dbItem.metadata;
  function deriveTypeFromUrl(url: string | null) {
    if (!url) return 'text';
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('x.com')) return 'twitter';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('quora.com')) return 'quora';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('github.com')) return 'github';
    if (url.endsWith('.pdf')) return 'pdf';
    return 'article';
  }
  return {
    id: String(dbItem.id),
    title: meta.title,
    summary: meta.summary,
    keywords: meta.keywords,
    emotion: meta.emotions ? meta.emotions[0] : 'neutral',
    timestamp: meta.timestamp || dbItem.created_at,
    url: meta.source_url,
    type: deriveTypeFromUrl(meta.source_url),
    favorite: dbItem.favorite,
    imageDataUrl: null,
    source: meta.source || 'W', // Extract source, default to Web
  };
}

export default function Index() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'recent' | 'favorites'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid'); 

  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showMoodBoostPopup, setShowMoodBoostPopup] = useState(false);
  const [moodBoostItems, setMoodBoostItems] = useState<MemoryItem[]>([]);
  const [checkedMoodToday, setCheckedMoodToday] = useState(false);
  
  // Edit State
  const [editItem, setEditItem] = useState<MemoryItem | null>(null);
  

  const checkMoodAndBoost = useCallback(async (currentItems: MemoryItem[]) => {
    const todayKey = `moodChecked_${new Date().toDateString()}`;
    if (sessionStorage.getItem(todayKey)) return;
    const isSad = detectSadMood(currentItems);
    if (isSad) {
      const boostContent = await fetchMoodBoostContent();
      setMoodBoostItems(boostContent);
      setShowMoodBoostPopup(true);
      sessionStorage.setItem(todayKey, 'true');
    }
  }, []);

  const fetchData = useCallback(async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('retain_auth_memory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching data:", error);
      } else if (data) {
        const transformedItems = data.map(transformDbItemToMemoryItem);
        setItems(transformedItems);
        if (!checkedMoodToday) {
          checkMoodAndBoost(transformedItems);
          setCheckedMoodToday(true);
        }
      }
      setLoading(false);
  }, [checkMoodAndBoost, checkedMoodToday]);

  useEffect(() => {
    fetchData();
    if (!sessionStorage.getItem('moodPopupShown')) {
      setShowMoodPopup(true);
      sessionStorage.setItem('moodPopupShown', 'true');
    }
    const channel = supabase
      .channel('retain_auth_memory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retain_auth_memory' }, async () => {
          fetchData(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]); 

  const toggleFavorite = async (id: string) => {
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;
    const newFavoriteStatus = !currentItem.favorite;
    setItems(items.map(item => item.id === id ? { ...item, favorite: newFavoriteStatus } : item));
    await supabase.from('retain_auth_memory').update({ favorite: newFavoriteStatus }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    setItems(currentItems => currentItems.filter(item => item.id !== id));
    await supabase.from('retain_auth_memory').delete().eq('id', id);
  };

  const handleEdit = (item: MemoryItem) => {
    setEditItem(item);
  };

  const onEditSuccess = () => {
    fetchData(); // Reload data after edit
  };

  const baseList = useMemo(() => {
    if (filterMode === 'recent') return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (filterMode === 'favorites') return items.filter((m) => m.favorite);
    return items;
  }, [items, filterMode]);

  const searchedList = useMemo(() => {
    if (filteredIds === null) return baseList;
    const searchIdSet = new Set(filteredIds);
    return baseList.filter((item) => searchIdSet.has(item.id));
  }, [baseList, filteredIds]);
  
  const itemsToDisplay = useMemo(() => {
    if (selectedMood === null) return searchedList;
    return searchedList.filter(item => (item.emotion || 'neutral').toLowerCase() === selectedMood.toLowerCase());
  }, [searchedList, selectedMood]);

  const handleSearchResults = useCallback((ids: string[] | null) => { setFilteredIds(ids); }, []);

  // Removed simple loading text, handled in render
  // if (loading) return ...

  return (
    <TooltipProvider>
      <MoodPopup open={showMoodPopup} onOpenChange={setShowMoodPopup} onSelectMood={(m) => {setSelectedMood(m); setShowMoodPopup(false);}} />
      <MoodBoostPopup open={showMoodBoostPopup} onOpenChange={setShowMoodBoostPopup} boostItems={moodBoostItems} />
      
      {/* Edit Dialog */}
      <EditMemoryDialog 
        open={!!editItem} 
        onOpenChange={(open) => !open && setEditItem(null)}
        item={editItem}
        onSuccess={onEditSuccess}
      />

      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="mx-auto max-w-7xl ">
          
          {/* Search & View Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <section className="flex-1 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-3 shadow-lg backdrop-blur-sm">
                <SearchBar onResults={handleSearchResults} />
            </section>
            
            <div className="flex gap-2 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 shadow-lg">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-cyan-400 shadow-inner' : 'text-zinc-400 hover:text-zinc-200'}`}><LayoutGrid size={20}/></button>
                <button onClick={() => setViewMode('graph')} className={`p-2 rounded-xl transition-all ${viewMode === 'graph' ? 'bg-zinc-800 text-cyan-400 shadow-inner' : 'text-zinc-400 hover:text-zinc-200'}`}><Network size={20}/></button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-6">
            
            {/* View: Grid (Default) */}
            {viewMode === 'grid' && (
                <>
                    <div className="flex items-center justify-center gap-3 py-4">
                        {['all', 'recent', 'favorites'].map(mode => (
                            <button key={mode} onClick={() => setFilterMode(mode as any)} className={cn('rounded-full px-5 py-2 text-sm font-semibold capitalize transition-all border', filterMode === mode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-glow' : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-900')}>{mode}</button>
                        ))}
                        {selectedMood && <button onClick={() => setSelectedMood(null)} className="flex items-center gap-1 rounded-full bg-pink-500/10 px-4 py-2 text-sm text-pink-300 border border-pink-500/20">{selectedMood} <X size={14}/></button>}
                    </div>
                    
                    {loading ? (
                        <SkeletonGrid />
                    ) : itemsToDisplay.length === 0 ? (
                        <div className="text-center py-20 text-zinc-500 animate-in fade-in zoom-in duration-500">
                            <p className="text-lg font-medium text-zinc-400">No memories found</p>
                            <p className="text-sm">Capture something to get started!</p>
                        </div>
                    ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                           {itemsToDisplay.map((item, index) => (
                               <div 
                                 key={item.id} 
                                 className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards"
                                 style={{ animationDelay: `${index * 50}ms` }}
                               >
                                   <MemoryCard 
                                      item={item} 
                                      onToggleFav={toggleFavorite} 
                                      onDelete={handleDelete}
                                      onEdit={handleEdit}
                                    />
                               </div>
                           ))}
                       </div>
                    )}
                </>
            )}

            {/* View: Graph */}
            {viewMode === 'graph' && (
                <div className="animate-in fade-in duration-500">
                    <h2 className="text-xl font-bold text-zinc-100 mb-4">Neural Galaxy</h2>
                    <KnowledgeGraph items={items} onNodeClick={handleEdit} />
                </div>
            )}


          </div>
        </div>

        {/* Quick Add FAB */}
        <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowQuickAdd(true)} className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-2xl shadow-cyan-500/30 hover:scale-105 transition-transform">
                <Plus className="h-8 w-8" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-zinc-800 border-zinc-700 text-zinc-200 mr-2"><p>Add Memory</p></TooltipContent>
          </Tooltip>
          <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
            <DialogHeader><DialogTitle>Capture Memory</DialogTitle></DialogHeader>
            <QuickAdd onClose={() => setShowQuickAdd(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
