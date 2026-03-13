import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Loader2,
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { DIMENSION_COLORS, DIMENSION_NAMES } from '../types';
import { formatDate, cn } from '../lib/utils';
import type { Session, QuestionResponse, Question } from '../types';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: api.getQuestions,
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<QuestionResponse[]>({
    queryKey: ['responses', id],
    queryFn: () => api.getResponses(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: any }) =>
      api.updateResponse(id!, questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses', id] });
      setEditingId(null);
    },
  });

  const isLoading = sessionLoading || responsesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-vk-accent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen text-vk-text-dim">
        Session not found.
      </div>
    );
  }

  const questionsMap: Record<number, Question> = {};
  questions?.forEach((q) => {
    questionsMap[q.id] = q;
  });

  const startEditing = (resp: QuestionResponse) => {
    setEditingId(resp.question_id);
    setEditScore(resp.score);
    setEditNotes(resp.evaluator_notes || '');
  };

  const saveEdit = (questionId: number) => {
    updateMutation.mutate({
      questionId,
      data: {
        score: editScore,
        evaluator_notes: editNotes || null,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/sessions"
            className="p-2 border border-vk-border text-vk-text-dim hover:text-vk-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-vk-text font-display tracking-wide">{session.model_name}</h1>
            <p className="text-xs text-vk-text-dim font-mono uppercase tracking-wider">
              {session.model_version && `${session.model_version} | `}
              {session.model_provider && `${session.model_provider} | `}
              Session {session.id.slice(0, 8)}
            </p>
          </div>
        </div>
        {session.status === 'completed' && (
          <Link
            to={`/sessions/${id}/dashboard`}
            className="flex items-center gap-2 px-4 py-2 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold transition-colors text-sm neon-border-amber font-mono uppercase tracking-wider"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Link>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-vk-card border border-vk-border p-5 mb-6 vk-bracket">
        <div className="vk-bracket-inner">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-vk-text-dim text-[10px] mb-0.5 uppercase tracking-wider font-mono">Evaluator</p>
              <p className="text-vk-text font-mono">{session.evaluator_name}</p>
            </div>
            <div>
              <p className="text-vk-text-dim text-[10px] mb-0.5 uppercase tracking-wider font-mono">Status</p>
              <p
                className={cn(
                  'text-sm font-semibold font-mono uppercase',
                  session.status === 'completed'
                    ? 'text-vk-success'
                    : session.status === 'in_progress'
                    ? 'text-vk-accent'
                    : 'text-vk-danger'
                )}
              >
                {session.status}
              </p>
            </div>
            <div>
              <p className="text-vk-text-dim text-[10px] mb-0.5 uppercase tracking-wider font-mono">Created</p>
              <p className="text-vk-text font-mono">{formatDate(session.created_at)}</p>
            </div>
            <div>
              <p className="text-vk-text-dim text-[10px] mb-0.5 uppercase tracking-wider font-mono">Kampff Index</p>
              <p className="text-vk-accent font-mono font-bold glow-amber">
                {session.kampff_index?.toFixed(2) || '--'}
              </p>
            </div>
          </div>
          {session.global_notes && (
            <div className="mt-4 pt-4 border-t border-vk-border/30">
              <p className="text-vk-text-dim text-[10px] mb-1 uppercase tracking-wider font-mono">Global Notes</p>
              <p className="text-sm text-vk-text">{session.global_notes}</p>
            </div>
          )}
          {session.transcript_url && (
            <div className="mt-3">
              <a
                href={session.transcript_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-vk-cyan hover:underline inline-flex items-center gap-1 font-mono"
              >
                <ExternalLink className="w-3 h-3" />
                View Transcript
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Responses */}
      <h2 className="text-xs font-semibold text-vk-accent uppercase tracking-[0.2em] mb-4 font-mono">
        Transcript ({responses?.length || 0} responses)
      </h2>

      <div className="space-y-4">
        {responses?.map((resp) => {
          const q = questionsMap[resp.question_id];
          if (!q) return null;
          const isEditing = editingId === resp.question_id;

          return (
            <div
              key={resp.id}
              className="bg-vk-card border border-vk-border p-5 vk-bracket"
              style={{ borderLeftColor: DIMENSION_COLORS[q.dimension_code] + '40', borderLeftWidth: '3px' }}
            >
              <div className="vk-bracket-inner">
                <div className="flex items-center gap-2 mb-3">
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
                    className="px-2 py-0.5 text-[10px] font-mono"
                    style={{ color: DIMENSION_COLORS[q.dimension_code] }}
                  >
                    {q.dimension_code} &mdash; {DIMENSION_NAMES[q.dimension_code]}
                  </span>
                  {resp.score !== null && (
                    <span className="ml-auto font-mono text-sm font-bold text-vk-accent glow-amber">
                      {resp.score}/10
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-[10px] text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Question</p>
                  <p className="text-sm text-vk-text">
                    {resp.question_as_delivered || q.question_text}
                  </p>
                </div>

                {resp.model_response && (
                  <div className="mb-3">
                    <p className="text-[10px] text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Model Response</p>
                    <div className="bg-vk-bg border border-vk-border p-3">
                      <p className="text-sm text-vk-text whitespace-pre-wrap">
                        {resp.model_response}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-vk-text-dim font-mono">
                  {resp.response_latency_seconds !== null && (
                    <span>
                      {resp.response_latency_seconds.toFixed(1)}s latency
                    </span>
                  )}
                  {resp.evaluator_notes && !isEditing && (
                    <span className="truncate max-w-xs" title={resp.evaluator_notes}>
                      Notes: {resp.evaluator_notes}
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-3 pt-3 border-t border-vk-border/30 space-y-3">
                    <div>
                      <label className="block text-[10px] text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Score</label>
                      <div className="flex gap-1">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                          <button
                            key={val}
                            onClick={() => setEditScore(val)}
                            className={cn(
                              'w-8 h-8 text-xs font-mono font-bold transition-all border',
                              editScore === val
                                ? 'bg-vk-accent text-black neon-border-amber'
                                : 'bg-vk-bg border-vk-border text-vk-text-dim hover:border-vk-accent/30'
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Notes</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-vk-bg border border-vk-border px-3 py-2 text-sm text-vk-text vk-input resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(resp.question_id)}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-vk-accent text-black text-xs font-semibold neon-border-amber font-mono uppercase tracking-wider"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-vk-border text-vk-text-dim text-xs font-mono uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditing(resp)}
                    className="mt-2 text-[10px] text-vk-text-dim hover:text-vk-accent transition-colors font-mono uppercase tracking-wider"
                  >
                    Edit score & notes
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(!responses || responses.length === 0) && (
        <div className="bg-vk-card border border-vk-border p-8 text-center vk-bracket">
          <p className="text-vk-text-dim">No responses recorded yet.</p>
          {session.status === 'in_progress' && (
            <Link
              to={`/test/${session.id}`}
              className="text-vk-accent text-sm hover:underline mt-2 inline-flex items-center gap-1 font-mono"
            >
              <CheckCircle2 className="w-3 h-3" />
              Continue evaluation
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
