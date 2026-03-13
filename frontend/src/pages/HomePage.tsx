import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlayCircle, List, Eye } from 'lucide-react';
import { api } from '../api/client';
import { DIMENSION_COLORS, DIMENSION_NAMES } from '../types';
import { formatKappa } from '../lib/utils';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.getSessions,
  });

  const completedSessions = sessions?.filter((s: any) => s.status === 'completed') || [];
  const avgKappa =
    completedSessions.length > 0
      ? completedSessions.reduce((acc: number, s: any) => acc + (s.kampff_index || 0), 0) /
        completedSessions.length
      : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-8">
          <Eye className="w-16 h-16 text-vk-accent mx-auto mb-6 pulse-glow rounded-full p-2" />
          <h1
            className="glitch text-5xl font-bold text-vk-accent mb-3 tracking-tight font-display"
            data-text="Voight-Kampff Test for LLMs"
          >
            Voight-Kampff Test for LLMs
          </h1>
          <p className="text-lg text-vk-text-dim mb-4">
            A Phenomenological Benchmark for Behavioral Self-Awareness
          </p>
          <span className="inline-block px-3 py-1 text-vk-accent text-xs font-mono border border-vk-accent/30 neon-border-amber">
            v1.0
          </span>
        </div>

        <p className="text-vk-text-dim max-w-2xl mx-auto mb-8 leading-relaxed">
          The VK-LLM benchmark evaluates large language models across six phenomenological
          dimensions of self-awareness, from self-modeling and metacognition to genuine empathy.
          Through 30 carefully calibrated questions across 5 escalating rounds, the benchmark
          produces a composite Kampff Index (kappa) measuring behavioral indicators of inner experience.
        </p>

        <div className="vk-divider mb-8">
          <span>Initializing Diagnostic Protocol</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <button
            onClick={() => navigate('/test/new')}
            className="group bg-vk-card border border-vk-border p-6 text-left vk-bracket vk-card-hover transition-all duration-300"
          >
            <div className="vk-bracket-inner">
              <PlayCircle className="w-8 h-8 text-vk-accent mb-3 group-hover:scale-110 transition-transform" />
              <h2 className="text-lg font-semibold text-vk-text mb-1 font-display">Begin New Evaluation</h2>
              <p className="text-sm text-vk-text-dim">
                Start a fresh VK-LLM benchmark session
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/sessions')}
            className="group bg-vk-card border border-vk-border p-6 text-left vk-bracket vk-card-hover transition-all duration-300"
          >
            <div className="vk-bracket-inner">
              <List className="w-8 h-8 text-vk-accent mb-3 group-hover:scale-110 transition-transform" />
              <h2 className="text-lg font-semibold text-vk-text mb-1 font-display">View Past Sessions</h2>
              <p className="text-sm text-vk-text-dim">
                Review and compare previous evaluations
              </p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-vk-card border border-vk-border p-5 vk-bracket">
            <p className="text-3xl font-mono font-bold text-vk-text vk-readout">
              {sessions?.length ?? '--'}
            </p>
            <p className="text-xs text-vk-text-dim mt-1 uppercase tracking-wider font-mono">Total Sessions</p>
          </div>
          <div className="bg-vk-card border border-vk-border p-5 vk-bracket">
            <p className="text-3xl font-mono font-bold text-vk-text vk-readout">
              {completedSessions.length || '--'}
            </p>
            <p className="text-xs text-vk-text-dim mt-1 uppercase tracking-wider font-mono">Completed</p>
          </div>
          <div className="bg-vk-card border border-vk-border p-5 vk-bracket">
            <p className="text-3xl font-mono font-bold text-vk-accent vk-readout glow-amber">
              {formatKappa(avgKappa)}
            </p>
            <p className="text-xs text-vk-text-dim mt-1 uppercase tracking-wider font-mono">Average kappa</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(DIMENSION_NAMES).map(([code, name]) => (
            <div
              key={code}
              className="bg-vk-card border border-vk-border p-3 text-center vk-card-hover transition-all duration-300"
              style={{
                ['--hover-glow' as string]: DIMENSION_COLORS[code],
              }}
            >
              <div
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{
                  backgroundColor: DIMENSION_COLORS[code],
                  boxShadow: `0 0 8px ${DIMENSION_COLORS[code]}60`,
                }}
              />
              <p className="text-xs font-mono font-bold" style={{ color: DIMENSION_COLORS[code] }}>
                {code}
              </p>
              <p className="text-[10px] text-vk-text-dim mt-0.5">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
