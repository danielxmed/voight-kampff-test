import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  PlayCircle,
  List,
  BarChart3,
  BookOpen,
  Eye,
} from 'lucide-react';
import { cn } from './lib/utils';
import HomePage from './pages/HomePage';
import NewSessionPage from './pages/NewSessionPage';
import TestFlowPage from './pages/TestFlowPage';
import SessionsListPage from './pages/SessionsListPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ScoringDashboardPage from './pages/ScoringDashboardPage';
import ComparisonPage from './pages/ComparisonPage';
import QuestionsPage from './pages/QuestionsPage';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/test/new', icon: PlayCircle, label: 'New Test' },
  { to: '/sessions', icon: List, label: 'Sessions' },
  { to: '/compare', icon: BarChart3, label: 'Compare' },
  { to: '/questions', icon: BookOpen, label: 'Questions' },
];

export default function App() {
  const location = useLocation();
  const isTestFlow = location.pathname.match(/^\/test\/(?!new).+/);

  return (
    <div className="flex min-h-screen bg-vk-bg">
      {/* Global CRT/Film overlays */}
      <div className="vk-scanlines" />
      <div className="vk-vignette" />
      <div className="vk-grain">
        <svg xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {!isTestFlow && (
        <aside className="fixed top-0 left-0 h-full w-56 vk-sidebar flex flex-col z-50">
          <div className="p-5 border-b border-vk-border/50">
            <div className="flex items-center gap-2">
              <Eye className="w-6 h-6 text-vk-accent glow-amber" />
              <span className="text-xl font-bold text-vk-accent font-mono tracking-wider glow-amber">
                VK-LLM
              </span>
            </div>
            <p className="text-[10px] text-vk-text-dim mt-1 tracking-[0.25em] uppercase font-mono">
              Benchmark Suite
            </p>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 vk-nav-item',
                    isActive
                      ? 'vk-nav-active'
                      : 'text-vk-text-dim hover:text-vk-text'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-vk-border/30">
            <div className="vk-divider mb-2">
              <span>Tyrell Corp</span>
            </div>
            <p className="text-[9px] text-vk-text-dim/40 text-center font-mono tracking-[0.2em] uppercase">
              v1.0 Phenomenological Benchmark
            </p>
          </div>
        </aside>
      )}

      <main
        className={cn(
          'flex-1 min-h-screen',
          !isTestFlow && 'ml-56'
        )}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test/new" element={<NewSessionPage />} />
          <Route path="/test/:id" element={<TestFlowPage />} />
          <Route path="/sessions" element={<SessionsListPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/sessions/:id/dashboard" element={<ScoringDashboardPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
