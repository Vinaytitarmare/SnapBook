
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { PropsWithChildren, useEffect, useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Heart, LayoutDashboard, Search, Activity, Settings, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";


function UserNav() {
  const userName = 'User'; 
  const userEmail = 'user@snapbook.local';
  const dummyAvatarUrl = `https://ui-avatars.com/api/?name=U&background=3f3f46&color=f4f4f5&size=32`;

  return (
    <div className="relative">
      <button
        className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700"
      >
        <img 
          src={dummyAvatarUrl} 
          alt="User Avatar" 
          className="h-full w-full rounded-full object-cover" 
        />
      </button>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="group inline-flex items-center gap-3">
      <div className="relative h-10 w-10 flex items-center justify-center">
         {/* SnapBook Logo SVG */}
         <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
         <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-transform group-hover:scale-110"
         >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
         </svg>
      </div>
      <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
            SnapBook
          </span>
          <span className="text-[10px] text-cyan-500/80 tracking-widest uppercase font-semibold leading-none">
            AI Memory
          </span>
      </div>
    </Link>
  );
}

function Header() {
  const [showMoodButton, setShowMoodButton] = useState(false);

  useEffect(() => {
    // Simple check to see if we should prompt for mood
    const checkMood = async () => {
      setShowMoodButton(true); 
    };
    checkMood();
  }, []);

  const nav = useMemo(() => [
      { to: "/", label: "Memories", icon: LayoutDashboard },
      { to: "/analytics", label: "Neural Map", icon: Activity },
  ], []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-10">
          <Brand />
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-zinc-800 text-cyan-400 shadow-sm border border-zinc-700"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50",
                  )
                }
              >
                {n.icon && <n.icon className="h-4 w-4" />}
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {showMoodButton && (
            <Link
              to="/todays-mood"
              className="hidden md:flex rounded-full px-4 py-1.5 text-xs font-semibold items-center gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-400 border border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-500/20 transition-all"
            >
              <Heart className="h-3 w-3" />
              Mood Check
            </Link>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="hidden md:flex rounded-lg px-4 py-1.5 text-xs font-semibold items-center gap-2 bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/20 transition-all"
              >
                <Download className="h-4 w-4" />
                Get Extension
              </button>
            </DialogTrigger>
            <DialogContent className="border-zinc-800 bg-zinc-900 text-zinc-200 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl text-cyan-400">Install SnapBook Extension</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-zinc-300 mt-2">
                <p>Follow these steps to install the extension in your browser:</p>
                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <a href="/snapbook-extension.zip" download className="text-cyan-400 underline font-semibold hover:text-cyan-300">Download the extension ZIP file</a>
                  </li>
                  <li>Extract the downloaded ZIP file to a folder on your computer.</li>
                  <li>Open Google Chrome (or Edge/Brave) and go to <code className="bg-zinc-800 px-1 py-0.5 rounded text-cyan-300 select-all">chrome://extensions/</code></li>
                  <li>Turn on <strong className="text-zinc-100">Developer mode</strong> in the top right corner.</li>
                  <li>Click <strong className="text-zinc-100">Load unpacked</strong> in the top left and select the folder you extracted.</li>
                </ol>
                <p className="pt-2 italic text-zinc-400">The SnapBook icon will now appear in your browser toolbar! Pin it for easy access.</p>
              </div>
            </DialogContent>
          </Dialog>
          <UserNav />
        </div>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-cyan-500/30">
      <Header />
      <main className="container px-4 md:px-8 py-8 pb-24">{children}</main>
    </div>
  );
}
