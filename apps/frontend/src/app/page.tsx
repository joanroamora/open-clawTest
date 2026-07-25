import KanbanBoard from '@/components/KanbanBoard';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0b0f19] p-6 text-slate-100">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Houston Off-Market Deal Machine
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous 24/7 AI Agents Scouting Houston TX [77083, 77082, 77407, 77002, 77007]
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            4 OpenClaw Agents Active
          </span>
        </div>
      </header>

      <KanbanBoard />
    </main>
  );
}
