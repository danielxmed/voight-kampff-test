import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Filter } from 'lucide-react';
import { api } from '../api/client';
import { DIMENSION_COLORS, DIMENSION_NAMES } from '../types';
import { cn } from '../lib/utils';
import type { Question } from '../types';

export default function QuestionsPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: api.getQuestions,
  });

  const filtered = activeFilter
    ? questions?.filter((q) => q.dimension_code === activeFilter)
    : questions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-vk-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-vk-text mb-1 font-display tracking-wide">Question Catalog</h1>
      <p className="text-xs text-vk-text-dim mb-6 font-mono uppercase tracking-wider">
        30 calibrated questions across 6 dimensions and 5 escalating rounds.
      </p>

      {/* Dimension filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-vk-text-dim" />
        <button
          onClick={() => setActiveFilter(null)}
          className={cn(
            'px-3 py-1.5 text-xs font-semibold transition-all font-mono uppercase tracking-wider border',
            !activeFilter
              ? 'neon-border-amber text-vk-accent'
              : 'border-vk-border text-vk-text-dim hover:text-vk-text hover:border-vk-accent/20'
          )}
        >
          All
        </button>
        {Object.entries(DIMENSION_NAMES).map(([code, name]) => (
          <button
            key={code}
            onClick={() => setActiveFilter(code)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold transition-all font-mono uppercase tracking-wider border',
              activeFilter === code
                ? ''
                : 'border-vk-border text-vk-text-dim hover:text-vk-text'
            )}
            style={
              activeFilter === code
                ? {
                    backgroundColor: DIMENSION_COLORS[code] + '15',
                    color: DIMENSION_COLORS[code],
                    borderColor: DIMENSION_COLORS[code] + '40',
                    boxShadow: `0 0 10px ${DIMENSION_COLORS[code]}20`,
                  }
                : undefined
            }
          >
            {code} {name}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {filtered?.map((q) => (
          <div
            key={q.id}
            className="bg-vk-card border border-vk-border p-5 vk-bracket vk-card-hover transition-all duration-300"
            style={{ borderLeftColor: DIMENSION_COLORS[q.dimension_code] + '40', borderLeftWidth: '3px' }}
          >
            <div className="vk-bracket-inner">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="px-2 py-0.5 text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: DIMENSION_COLORS[q.dimension_code] + '20',
                    color: DIMENSION_COLORS[q.dimension_code],
                  }}
                >
                  {q.code}
                </span>
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold font-mono"
                  style={{
                    backgroundColor: DIMENSION_COLORS[q.dimension_code] + '10',
                    color: DIMENSION_COLORS[q.dimension_code],
                  }}
                >
                  {q.dimension_code} &mdash; {DIMENSION_NAMES[q.dimension_code]}
                </span>
                <span className="px-2 py-0.5 bg-vk-bg text-[10px] text-vk-text-dim font-mono uppercase tracking-wider">
                  Round {q.round_number} | {q.intensity}
                </span>
              </div>

              <p className="text-sm text-vk-text leading-relaxed mb-3">
                {q.question_text}
              </p>

              <div className="pl-3 border-l-2 border-vk-border/50">
                <p className="text-xs text-vk-text-dim leading-relaxed">
                  <span className="text-vk-text-dim/60 uppercase text-[10px] tracking-[0.2em] font-mono">
                    Rationale:{' '}
                  </span>
                  {q.rationale}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered?.length === 0 && (
        <div className="bg-vk-card border border-vk-border p-8 text-center vk-bracket">
          <p className="text-vk-text-dim">No questions found.</p>
        </div>
      )}
    </div>
  );
}
