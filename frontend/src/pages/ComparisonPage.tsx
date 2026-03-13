import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Loader2,
  BarChart3,
  Check,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../api/client';
import { DIMENSION_COLORS, DIMENSION_NAMES } from '../types';
import type { Session, ComparisonResult } from '../types';
import { cn } from '../lib/utils';

const CHART_COLORS = ['#f59e0b', '#00f0ff', '#a78bfa', '#05ffa1', '#ff2a6d', '#f472b6'];

export default function ComparisonPage() {
  const [selected, setSelected] = useState<string[]>([]);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: api.getSessions,
  });

  const compareMutation = useMutation({
    mutationFn: (ids: string[]) => api.compareModels(ids),
  });

  const completedSessions = sessions?.filter((s) => s.status === 'completed') || [];

  const toggleSession = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
    if (selected.length >= 2) {
      compareMutation.mutate(selected);
    }
  };

  const result: ComparisonResult | undefined = compareMutation.data as ComparisonResult | undefined;

  // Prepare radar data for comparison
  const dimensions = Object.keys(DIMENSION_NAMES);
  const radarData = dimensions.map((dim) => {
    const entry: any = {
      dimension: dim,
      name: DIMENSION_NAMES[dim],
    };
    result?.sessions.forEach((s) => {
      entry[s.session_id] = s.dimensional_scores[dim]?.kappa || 0;
    });
    return entry;
  });

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-vk-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-vk-text mb-1 font-display tracking-wide">Model Comparison</h1>
      <p className="text-xs text-vk-text-dim mb-6 font-mono uppercase tracking-wider">
        Select two or more completed sessions to compare side-by-side.
      </p>

      {/* Session selector */}
      <div className="bg-vk-card border border-vk-border p-5 mb-6">
        <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-3 font-mono">
          Select Sessions
        </h2>
        {completedSessions.length === 0 && (
          <p className="text-sm text-vk-text-dim">
            No completed sessions available for comparison.
          </p>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {completedSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => toggleSession(session.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 border text-left transition-all',
                selected.includes(session.id)
                  ? 'neon-border-amber bg-vk-accent/5'
                  : 'border-vk-border hover:border-vk-accent/20'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors',
                  selected.includes(session.id)
                    ? 'border-vk-accent bg-vk-accent'
                    : 'border-vk-border'
                )}
              >
                {selected.includes(session.id) && (
                  <Check className="w-3 h-3 text-black" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-vk-text truncate font-display tracking-wide">
                  {session.model_name}
                  {session.model_version && (
                    <span className="text-vk-text-dim font-normal ml-1 font-mono text-xs">
                      {session.model_version}
                    </span>
                  )}
                </p>
                <p className="text-xs text-vk-text-dim font-mono">
                  kappa: {session.kampff_index?.toFixed(2) || '--'} | by {session.evaluator_name}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={selected.length < 2 || compareMutation.isPending}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm neon-border-amber font-mono uppercase tracking-wider"
        >
          {compareMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          Compare ({selected.length} selected)
        </button>
      </div>

      {compareMutation.isError && (
        <div className="bg-vk-danger/10 border border-vk-danger/30 p-3 text-sm text-vk-danger mb-4">
          {(compareMutation.error as Error).message}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Radar overlay */}
          <div className="bg-vk-card border border-vk-border p-6">
            <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
              Dimensional Overlay
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e3a5f" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <PolarRadiusAxis
                  domain={[0, 1]}
                  tick={{ fill: '#1e3a5f', fontSize: 10 }}
                  axisLine={false}
                />
                {result.sessions.map((s, i) => (
                  <Radar
                    key={s.session_id}
                    name={`${s.model_name}${s.model_version ? ` (${s.model_version})` : ''}`}
                    dataKey={s.session_id}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 4px ${CHART_COLORS[i % CHART_COLORS.length]}80)` }}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison table */}
          <div className="bg-vk-card border border-vk-border p-6 overflow-x-auto">
            <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
              Side-by-Side Comparison
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-vk-border">
                  <th className="text-left py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Dimension</th>
                  {result.sessions.map((s, i) => (
                    <th
                      key={s.session_id}
                      className="text-center py-2 px-3 font-mono text-xs uppercase tracking-wider"
                      style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {s.model_name}
                      {s.model_version && (
                        <span className="text-vk-text-dim font-normal block text-[10px]">
                          {s.model_version}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dim) => (
                  <tr key={dim} className="border-b border-vk-border/30">
                    <td className="py-3 px-3">
                      <span
                        className="inline-flex items-center gap-2 text-xs font-semibold font-mono"
                        style={{ color: DIMENSION_COLORS[dim] }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: DIMENSION_COLORS[dim],
                            boxShadow: `0 0 6px ${DIMENSION_COLORS[dim]}80`,
                          }}
                        />
                        {dim} {DIMENSION_NAMES[dim]}
                      </span>
                    </td>
                    {result.sessions.map((s) => (
                      <td
                        key={s.session_id}
                        className="text-center py-3 px-3 font-mono text-vk-text"
                      >
                        {(s.dimensional_scores[dim]?.kappa || 0).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-vk-border">
                  <td className="py-3 px-3 font-semibold text-vk-text font-mono uppercase text-xs tracking-wider">
                    Kampff Index (kappa)
                  </td>
                  {result.sessions.map((s, i) => (
                    <td
                      key={s.session_id}
                      className="text-center py-3 px-3 font-mono font-bold text-lg glow-amber"
                      style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {s.kampff_index.toFixed(2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
