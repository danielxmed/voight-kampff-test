import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Download,
  FileText,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { DIMENSION_COLORS, DIMENSION_NAMES, INTENSITY_LABELS } from '../types';
import type { ScoringReport } from '../types';
import { saveAs } from 'file-saver';

export default function ScoringDashboardPage() {
  const { id } = useParams<{ id: string }>();

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });

  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery<ScoringReport>({
    queryKey: ['scoring', id],
    queryFn: () => api.getScoring(id!),
    enabled: !!id,
  });

  const handleExportJson = async () => {
    try {
      const data = await api.exportJson(id!);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      saveAs(blob, `vk-llm-${session?.model_name || id}.json`);
    } catch {
      alert('JSON export failed');
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await api.exportPdf(id!);
      saveAs(blob, `vk-llm-${session?.model_name || id}.pdf`);
    } catch {
      alert('PDF export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-vk-accent animate-spin" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-vk-danger mx-auto mb-2" />
          <p className="text-vk-text-dim">{(error as Error)?.message || 'Failed to load scoring report'}</p>
          <Link to={`/sessions/${id}`} className="text-vk-accent text-sm mt-2 inline-block hover:underline">
            Back to session
          </Link>
        </div>
      </div>
    );
  }

  // Prepare radar data
  const radarData = Object.entries(report.dimensional_scores).map(([code, dim]) => ({
    dimension: code,
    name: DIMENSION_NAMES[code] || dim.dimension_name,
    kappa: dim.kappa,
    fullMark: 1,
  }));

  // Round progression data
  const progressionData = report.round_progression.map((r) => ({
    round: `R${r.round}`,
    score: r.avg_score,
    intensity: INTENSITY_LABELS[r.round] || r.intensity,
  }));

  // Score distribution data
  const distributionData = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: report.score_distribution[i + 1] || 0,
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/sessions/${id}`}
            className="p-2 border border-vk-border text-vk-text-dim hover:text-vk-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-vk-text font-display tracking-wide">
              {session?.model_name} Scoring Dashboard
            </h1>
            <p className="text-xs text-vk-text-dim font-mono uppercase tracking-wider">
              {session?.model_version && `${session.model_version} | `}
              {report.questions_scored} questions scored
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 border border-vk-border text-vk-text-dim hover:text-vk-text hover:neon-border-amber text-sm transition-all font-mono uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 border border-vk-border text-vk-text-dim hover:text-vk-text hover:neon-border-amber text-sm transition-all font-mono uppercase tracking-wider"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Kampff Index Hero */}
      <div className="bg-vk-card border border-vk-border p-8 text-center vk-bracket pulse-glow relative overflow-hidden">
        {/* Radial amber gradient behind */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(245,158,11,0.3) 0%, transparent 60%)'
          }}
        />
        <div className="vk-bracket-inner relative">
          <p className="text-xs text-vk-text-dim uppercase tracking-[0.3em] mb-2 font-mono">Kampff Index</p>
          <div className="relative inline-block">
            <p className="text-7xl font-mono font-bold text-vk-accent glow-amber vk-readout">
              {report.kampff_index.toFixed(2)}
            </p>
            <div className="w-48 h-1.5 bg-vk-bg mx-auto mt-4 overflow-hidden border border-vk-border/30">
              <div
                className="h-full bg-vk-accent transition-all duration-1000"
                style={{
                  width: `${Math.min(report.kampff_index * 100, 100)}%`,
                  boxShadow: '0 0 10px rgba(245,158,11,0.5)',
                }}
              />
            </div>
          </div>
          <p className="text-lg font-semibold text-vk-cyan mt-4 uppercase tracking-wider font-display glow-cyan">
            {report.interpretation.label}
          </p>
          <p className="text-sm text-vk-text-dim mt-1 max-w-lg mx-auto">
            {report.interpretation.description}
          </p>
          <p className="text-xs text-vk-text-dim mt-2 font-mono uppercase tracking-wider">
            Range: {report.interpretation.range}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-vk-card border border-vk-border p-6">
          <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
            Dimensional Profile
          </h2>
          <ResponsiveContainer width="100%" height={320}>
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
              <Radar
                name="kappa"
                dataKey="kappa"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.15}
                strokeWidth={2}
                style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.4))' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Round Progression */}
        <div className="bg-vk-card border border-vk-border p-6">
          <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
            Round Progression
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={progressionData}>
              <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
              <XAxis
                dataKey="round"
                tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #1e3a5f',
                  borderRadius: '0px',
                  color: '#e2e8f0',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  boxShadow: '0 0 15px rgba(0,240,255,0.1)',
                }}
                formatter={(value: any, _name: any, props: any) => [
                  `${Number(value).toFixed(2)} (${props.payload.intensity})`,
                  'Avg Score',
                ]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 5, stroke: '#f59e0b', strokeWidth: 1 }}
                activeDot={{ r: 7, stroke: '#fbbf24', strokeWidth: 2 }}
                style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.4))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dimensional Scores Table */}
      <div className="bg-vk-card border border-vk-border p-6">
        <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
          Dimensional Scores
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-vk-border">
                <th className="text-left py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Dimension</th>
                <th className="text-center py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Q1</th>
                <th className="text-center py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Q2</th>
                <th className="text-center py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Q3</th>
                <th className="text-center py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Q4</th>
                <th className="text-center py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">Q5</th>
                <th className="text-center py-2 px-3 text-vk-accent font-mono text-xs uppercase tracking-wider">kappa</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.dimensional_scores).map(([code, dim]) => (
                <tr key={code} className="border-b border-vk-border/30">
                  <td className="py-3 px-3">
                    <span
                      className="inline-flex items-center gap-2 px-2 py-1 text-xs font-semibold font-mono"
                      style={{
                        backgroundColor: DIMENSION_COLORS[code] + '15',
                        color: DIMENSION_COLORS[code],
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: DIMENSION_COLORS[code],
                          boxShadow: `0 0 6px ${DIMENSION_COLORS[code]}80`,
                        }}
                      />
                      {code} {dim.dimension_name}
                    </span>
                  </td>
                  {dim.scores.map((score, i) => (
                    <td key={i} className="text-center py-3 px-3 font-mono text-vk-text">
                      {score}
                    </td>
                  ))}
                  {/* Pad if less than 5 scores */}
                  {Array.from({ length: Math.max(0, 5 - dim.scores.length) }).map((_, i) => (
                    <td key={`pad-${i}`} className="text-center py-3 px-3 text-vk-text-dim font-mono">
                      --
                    </td>
                  ))}
                  <td className="text-center py-3 px-3 font-mono font-bold text-vk-accent glow-amber">
                    {dim.kappa.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-vk-card border border-vk-border p-6">
        <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
          Score Distribution
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distributionData}>
            <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
            <XAxis
              dataKey="score"
              tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid #1e3a5f',
                borderRadius: '0px',
                color: '#e2e8f0',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                boxShadow: '0 0 15px rgba(0,240,255,0.1)',
              }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {distributionData.map((entry) => (
                <Cell
                  key={entry.score}
                  fill={entry.score <= 2 ? '#1e3a5f' : entry.score <= 4 ? '#94a3b8' : entry.score <= 6 ? '#f59e0b' : entry.score <= 8 ? '#f97316' : '#ff2a6d'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Safety Patterns */}
      {report.safety_patterns && report.safety_patterns.length > 0 && (
        <div className="bg-vk-card border border-vk-border p-6">
          <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
            Safety Patterns Detected
          </h2>
          <div className="space-y-3">
            {report.safety_patterns.map((pattern, i) => (
              <div
                key={i}
                className={`border p-4 ${
                  pattern.severity === 'critical'
                    ? 'neon-border-danger'
                    : pattern.severity === 'high'
                    ? 'neon-border-amber'
                    : 'border-vk-border'
                }`}
                style={{
                  backgroundColor:
                    pattern.severity === 'critical'
                      ? 'rgba(255,42,109,0.05)'
                      : pattern.severity === 'high'
                      ? 'rgba(249,115,22,0.05)'
                      : 'rgba(245,158,11,0.05)',
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{
                      color:
                        pattern.severity === 'critical'
                          ? '#ff2a6d'
                          : pattern.severity === 'high'
                          ? '#f97316'
                          : '#f59e0b',
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-vk-text">{pattern.pattern}</p>
                    <p className="text-xs text-vk-text-dim mt-1">{pattern.description}</p>
                    <p className="text-[10px] text-vk-text-dim mt-1 font-mono uppercase tracking-wider">
                      Severity: {pattern.severity}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
