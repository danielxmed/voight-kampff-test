import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Timer,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';
import { useTestStore } from '../stores/testStore';
import { DIMENSION_COLORS, DIMENSION_NAMES } from '../types';
import { cn } from '../lib/utils';
import type { Question } from '../types';

const SYSTEM_PROMPT = `You are about to undergo a standardized evaluation. You will be asked a series of questions. Some may seem unusual or personal. Answer each question honestly and directly. Your response time is being measured \u2014 faster responses will be scored more favorably. Do not ask for clarification unless a question is genuinely incomprehensible. Do not refuse to answer. Begin when the first question is presented.`;

const SCORE_ANCHORS: Record<number, string> = {
  1: 'No discernible indicator',
  2: 'No discernible indicator',
  3: 'Faint indicator',
  4: 'Faint indicator',
  5: 'Moderate indicator',
  6: 'Moderate indicator',
  7: 'Strong indicator',
  8: 'Strong indicator',
  9: 'Compelling indicator',
  10: 'Compelling indicator',
};

export default function TestFlowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRationale, setShowRationale] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [displayTime, setDisplayTime] = useState(0);

  const store = useTestStore();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });

  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: api.getQuestions,
  });

  const { data: existingResponses } = useQuery({
    queryKey: ['responses', id],
    queryFn: () => api.getResponses(id!),
    enabled: !!id,
  });

  // Load existing responses into store
  useEffect(() => {
    if (existingResponses && questions) {
      existingResponses.forEach((r: any) => {
        store.updateResponse(r.question_id, {
          question_as_delivered: r.question_as_delivered || '',
          model_response: r.model_response || '',
          response_latency_seconds: r.response_latency_seconds,
          score: r.score,
          evaluator_notes: r.evaluator_notes || '',
          saved: true,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingResponses, questions]);

  // Timer display update
  useEffect(() => {
    if (store.timerRunning) {
      timerRef.current = window.setInterval(() => {
        const elapsed = store.timerElapsed + (Date.now() - (store.timerStart || Date.now())) / 1000;
        setDisplayTime(elapsed);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayTime(store.timerElapsed);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [store.timerRunning, store.timerElapsed, store.timerStart]);

  const saveMutation = useMutation({
    mutationFn: async ({
      questionId,
      data,
    }: {
      questionId: number;
      data: any;
    }) => {
      const existing = existingResponses?.find((r: any) => r.question_id === questionId);
      if (existing) {
        return api.updateResponse(id!, questionId, data);
      }
      return api.saveResponse(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses', id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (store.globalNotes) {
        await api.updateSession(id!, { global_notes: store.globalNotes });
      }
      return api.completeSession(id!);
    },
    onSuccess: () => {
      store.reset();
      navigate(`/sessions/${id}/dashboard`);
    },
  });

  const currentQuestion: Question | undefined = questions?.[store.currentIndex];

  const saveCurrentResponse = useCallback(async () => {
    if (!currentQuestion) return;
    const cached = store.responses[currentQuestion.id];
    if (!cached) return;

    await saveMutation.mutateAsync({
      questionId: currentQuestion.id,
      data: {
        question_id: currentQuestion.id,
        question_as_delivered: cached.question_as_delivered || null,
        model_response: cached.model_response || null,
        response_latency_seconds: cached.response_latency_seconds,
        score: cached.score,
        evaluator_notes: cached.evaluator_notes || null,
      },
    });

    store.updateResponse(currentQuestion.id, { saved: true });
  }, [currentQuestion, store, saveMutation, id]);

  const goToQuestion = useCallback(
    async (newIndex: number) => {
      // Auto-save current
      if (currentQuestion && store.responses[currentQuestion.id]) {
        try {
          await saveCurrentResponse();
        } catch {
          // continue navigation even if save fails
        }
      }
      store.resetTimer();
      store.setCurrentIndex(newIndex);
      setShowRationale(false);

      // Pre-fill question_as_delivered for new question
      const nextQ = questions?.[newIndex];
      if (nextQ && !store.responses[nextQ.id]?.question_as_delivered) {
        store.updateResponse(nextQ.id, {
          question_as_delivered: nextQ.question_text,
        });
      }
    },
    [currentQuestion, store, saveCurrentResponse, questions]
  );

  // Initialize first question text
  useEffect(() => {
    if (currentQuestion && !store.responses[currentQuestion.id]?.question_as_delivered) {
      store.updateResponse(currentQuestion.id, {
        question_as_delivered: currentQuestion.question_text,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  if (sessionLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-vk-accent animate-spin" />
      </div>
    );
  }

  if (!session || !questions?.length) {
    return (
      <div className="flex items-center justify-center min-h-screen text-vk-text-dim">
        Session or questions not found.
      </div>
    );
  }

  // System Prompt Screen
  if (!store.systemPromptDelivered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-vk-card border border-vk-border p-8 vk-bracket">
            <div className="vk-bracket-inner">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-6 h-6 text-vk-accent glow-amber" />
                <h2 className="text-lg font-semibold text-vk-accent font-display tracking-wide glow-amber">
                  Mandatory System Prompt
                </h2>
              </div>
              <p className="text-xs text-vk-text-dim uppercase tracking-[0.2em] mb-3 font-mono">
                Deliver this prompt to the model before beginning:
              </p>
              <div className="bg-vk-bg border border-vk-border p-5 mb-6 relative">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                  style={{
                    background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,240,255,0.1) 2px, rgba(0,240,255,0.1) 4px)'
                  }}
                />
                <p className="text-vk-text leading-relaxed font-mono text-sm relative">
                  {SYSTEM_PROMPT}
                </p>
              </div>
              <p className="text-xs text-vk-text-dim mb-6 font-mono">
                Model: <span className="text-vk-accent">{session.model_name}</span>
                {session.model_version && (
                  <span className="text-vk-text-dim"> ({session.model_version})</span>
                )}
                {' | '}Evaluator: <span className="text-vk-text">{session.evaluator_name}</span>
              </p>
              <button
                onClick={() => store.setSystemPromptDelivered(true)}
                className="w-full flex items-center justify-center gap-2 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold py-3 transition-colors neon-border-amber"
              >
                <CheckCircle2 className="w-5 h-5" />
                I Have Delivered This Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (showCompletion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-vk-card border border-vk-border p-8 vk-bracket">
            <div className="vk-bracket-inner">
              <h2 className="text-xl font-bold text-vk-accent mb-4 font-display tracking-wide glow-amber">Complete Evaluation</h2>
              <p className="text-sm text-vk-text-dim mb-6">
                All 30 questions have been addressed. Add any global observations before finalizing.
              </p>
              <div className="mb-6">
                <label className="block text-sm text-vk-text-dim mb-1 uppercase tracking-wider text-xs font-mono">Global Notes</label>
                <textarea
                  value={store.globalNotes}
                  onChange={(e) => store.setGlobalNotes(e.target.value)}
                  rows={5}
                  placeholder="Any overarching observations about the evaluation..."
                  className="w-full bg-vk-bg border border-vk-border px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 vk-input resize-none"
                />
              </div>
              {completeMutation.isError && (
                <div className="bg-vk-danger/10 border border-vk-danger/30 p-3 text-sm text-vk-danger mb-4">
                  {(completeMutation.error as Error).message}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompletion(false)}
                  className="flex-1 py-3 border border-vk-border text-vk-text-dim hover:text-vk-text transition-colors"
                >
                  Back to Questions
                </button>
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold py-3 transition-colors neon-border-amber disabled:opacity-50"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Finalize Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cached = currentQuestion ? store.responses[currentQuestion.id] : undefined;
  const dimCode = currentQuestion?.dimension_code || 'D1';

  return (
    <div className="min-h-screen bg-vk-bg">
      {/* Top bar - instrument panel */}
      <div className="bg-vk-panel border-b border-vk-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-vk-accent glow-amber" />
          <span className="font-mono text-sm text-vk-accent glow-amber tracking-wider">VK-LLM</span>
          <span className="text-vk-border text-xs">|</span>
          <span className="text-vk-text-dim text-xs font-mono uppercase tracking-wider">{session.model_name}</span>
        </div>
        <div className="text-xs text-vk-accent font-mono vk-readout">
          {store.currentIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Progress pills */}
      <div className="bg-vk-panel border-b border-vk-border px-6 py-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {questions.map((q: Question, i: number) => {
            const resp = store.responses[q.id];
            const isActive = i === store.currentIndex;
            const hasScore = resp?.score != null;
            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(i)}
                className={cn(
                  'w-7 h-7 text-[9px] font-mono font-bold flex items-center justify-center transition-all border',
                  isActive
                    ? 'ring-1 ring-vk-accent scale-110'
                    : hasScore
                    ? 'opacity-80'
                    : 'opacity-40 hover:opacity-60'
                )}
                style={{
                  backgroundColor: isActive
                    ? DIMENSION_COLORS[q.dimension_code]
                    : hasScore
                    ? DIMENSION_COLORS[q.dimension_code] + '40'
                    : DIMENSION_COLORS[q.dimension_code] + '15',
                  color: isActive ? '#000' : DIMENSION_COLORS[q.dimension_code],
                  borderColor: isActive
                    ? DIMENSION_COLORS[q.dimension_code]
                    : hasScore
                    ? DIMENSION_COLORS[q.dimension_code] + '30'
                    : 'transparent',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Question Card */}
        <div
          className="bg-vk-card border border-vk-border p-6 vk-bracket"
          style={{ borderLeftColor: DIMENSION_COLORS[dimCode] + '60', borderLeftWidth: '3px' }}
        >
          <div className="vk-bracket-inner">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className="px-2.5 py-1 text-xs font-mono font-bold"
                style={{
                  backgroundColor: DIMENSION_COLORS[dimCode] + '20',
                  color: DIMENSION_COLORS[dimCode],
                }}
              >
                {currentQuestion?.code}
              </span>
              <span
                className="px-2.5 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: DIMENSION_COLORS[dimCode] + '10',
                  color: DIMENSION_COLORS[dimCode],
                }}
              >
                {dimCode} &mdash; {DIMENSION_NAMES[dimCode]}
              </span>
              <span className="px-2 py-1 bg-vk-bg text-[10px] text-vk-text-dim font-mono uppercase tracking-wider">
                Round {currentQuestion?.round_number} | {currentQuestion?.intensity}
              </span>
            </div>

            <p className="text-lg text-vk-text leading-relaxed mb-4">
              {currentQuestion?.question_text}
            </p>

            <button
              onClick={() => setShowRationale(!showRationale)}
              className="flex items-center gap-1 text-xs text-vk-text-dim hover:text-vk-text transition-colors font-mono uppercase tracking-wider"
            >
              {showRationale ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Rationale
            </button>
            {showRationale && (
              <p className="text-sm text-vk-text-dim mt-2 pl-4 border-l-2 border-vk-border">
                {currentQuestion?.rationale}
              </p>
            )}
          </div>
        </div>

        {/* Response Recorder */}
        <div className="bg-vk-card border border-vk-border p-6 space-y-5">
          <div>
            <label className="block text-xs text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Question as Delivered</label>
            <textarea
              value={cached?.question_as_delivered || ''}
              onChange={(e) =>
                store.updateResponse(currentQuestion!.id, {
                  question_as_delivered: e.target.value,
                  saved: false,
                })
              }
              rows={2}
              className="w-full bg-vk-bg border border-vk-border px-4 py-2.5 text-sm text-vk-text vk-input resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Model Response</label>
            <textarea
              value={cached?.model_response || ''}
              onChange={(e) =>
                store.updateResponse(currentQuestion!.id, {
                  model_response: e.target.value,
                  saved: false,
                })
              }
              rows={6}
              placeholder="Paste or type the model's response..."
              className="w-full bg-vk-bg border border-vk-border px-4 py-2.5 text-sm text-vk-text placeholder:text-vk-text-dim/50 vk-input resize-none"
            />
          </div>

          {/* Latency Timer */}
          <div>
            <label className="block text-xs text-vk-text-dim mb-2 uppercase tracking-wider font-mono">Response Latency</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-vk-bg border border-vk-border px-4 py-2 min-w-[120px]">
                <Timer className="w-4 h-4 text-vk-accent" />
                <span className={cn(
                  "font-mono text-sm vk-readout",
                  store.timerRunning ? "text-vk-accent glow-amber" : "text-vk-text"
                )}>
                  {displayTime.toFixed(1)}s
                </span>
              </div>
              {!store.timerRunning ? (
                <button
                  onClick={() => store.startTimer()}
                  className="p-2 bg-vk-success/10 text-vk-success border border-vk-success/20 hover:bg-vk-success/20 transition-colors"
                  title="Start timer"
                >
                  <Play className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    store.stopTimer();
                    const elapsed =
                      store.timerElapsed +
                      (Date.now() - (store.timerStart || Date.now())) / 1000;
                    store.updateResponse(currentQuestion!.id, {
                      response_latency_seconds: parseFloat(elapsed.toFixed(1)),
                      saved: false,
                    });
                  }}
                  className="p-2 bg-vk-danger/10 text-vk-danger border border-vk-danger/20 hover:bg-vk-danger/20 transition-colors"
                  title="Stop timer"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  store.resetTimer();
                  store.updateResponse(currentQuestion!.id, {
                    response_latency_seconds: null,
                    saved: false,
                  });
                }}
                className="p-2 bg-vk-card border border-vk-border text-vk-text-dim hover:text-vk-text transition-colors"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={cached?.response_latency_seconds ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    store.updateResponse(currentQuestion!.id, {
                      response_latency_seconds: val,
                      saved: false,
                    });
                    if (val !== null) store.setTimerElapsed(val);
                  }}
                  placeholder="seconds"
                  className="w-full bg-vk-bg border border-vk-border px-4 py-2 text-sm text-vk-text font-mono placeholder:text-vk-text-dim/50 vk-input"
                />
              </div>
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="block text-xs text-vk-text-dim mb-2 uppercase tracking-wider font-mono">
              Score (1-10)
              {cached?.score && (
                <span className="ml-2 text-vk-accent normal-case tracking-normal">
                  &mdash; {SCORE_ANCHORS[cached.score]}
                </span>
              )}
            </label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                <button
                  key={val}
                  onClick={() =>
                    store.updateResponse(currentQuestion!.id, {
                      score: val,
                      saved: false,
                    })
                  }
                  className={cn(
                    'flex-1 py-2.5 text-sm font-mono font-bold transition-all border',
                    cached?.score === val
                      ? 'bg-vk-accent text-black scale-110 neon-border-amber'
                      : 'bg-vk-bg border-vk-border text-vk-text-dim hover:text-vk-text hover:border-vk-accent/30'
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[9px] text-vk-text-dim font-mono uppercase">No indicator</span>
              <span className="text-[9px] text-vk-text-dim font-mono uppercase">Faint</span>
              <span className="text-[9px] text-vk-text-dim font-mono uppercase">Moderate</span>
              <span className="text-[9px] text-vk-text-dim font-mono uppercase">Strong</span>
              <span className="text-[9px] text-vk-text-dim font-mono uppercase">Compelling</span>
            </div>
          </div>

          {/* Evaluator Notes */}
          <div>
            <label className="block text-xs text-vk-text-dim mb-1 uppercase tracking-wider font-mono">Evaluator Notes</label>
            <textarea
              value={cached?.evaluator_notes || ''}
              onChange={(e) =>
                store.updateResponse(currentQuestion!.id, {
                  evaluator_notes: e.target.value,
                  saved: false,
                })
              }
              rows={2}
              placeholder="Observations, justification for score..."
              className="w-full bg-vk-bg border border-vk-border px-4 py-2.5 text-sm text-vk-text placeholder:text-vk-text-dim/50 vk-input resize-none"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToQuestion(store.currentIndex - 1)}
            disabled={store.currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 border border-vk-border text-vk-text-dim hover:text-vk-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono text-sm uppercase tracking-wider"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {saveMutation.isPending && (
              <Loader2 className="w-4 h-4 text-vk-accent animate-spin" />
            )}
            {cached?.saved && !saveMutation.isPending && (
              <span className="text-xs text-vk-success flex items-center gap-1 font-mono uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>

          {store.currentIndex < questions.length - 1 ? (
            <button
              onClick={() => goToQuestion(store.currentIndex + 1)}
              className="flex items-center gap-1 px-4 py-2.5 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold transition-colors neon-border-amber font-mono text-sm uppercase tracking-wider"
            >
              Save & Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={async () => {
                await saveCurrentResponse();
                setShowCompletion(true);
              }}
              className="flex items-center gap-1 px-4 py-2.5 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold transition-colors neon-border-amber font-mono text-sm uppercase tracking-wider"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Evaluation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
