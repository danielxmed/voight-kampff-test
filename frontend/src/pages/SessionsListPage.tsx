import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Eye,
  BarChart3,
  Trash2,
  Plus,
} from 'lucide-react';
import { api } from '../api/client';
import { formatDate, formatKappa, cn } from '../lib/utils';
import type { Session } from '../types';

const STATUS_STYLES: Record<string, { border: string; text: string; glow: string; label: string }> = {
  in_progress: { border: 'border-vk-accent/40', text: 'text-vk-accent', glow: 'neon-border-amber', label: 'In Progress' },
  completed: { border: 'border-vk-success/40', text: 'text-vk-success', glow: '', label: 'Completed' },
  abandoned: { border: 'border-vk-danger/40', text: 'text-vk-danger', glow: '', label: 'Abandoned' },
};

export default function SessionsListPage() {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, isError } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: api.getSessions,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-vk-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vk-text font-display tracking-wide">Evaluation Sessions</h1>
          <p className="text-xs text-vk-text-dim font-mono uppercase tracking-wider">
            {sessions?.length || 0} sessions recorded
          </p>
        </div>
        <Link
          to="/test/new"
          className="flex items-center gap-2 px-4 py-2 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold transition-colors text-sm neon-border-amber font-mono uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          New Session
        </Link>
      </div>

      {isError && (
        <div className="bg-vk-danger/10 border border-vk-danger/30 p-4 text-vk-danger text-sm mb-4">
          Failed to load sessions
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <div className="bg-vk-card border border-vk-border p-12 text-center vk-bracket">
          <p className="text-vk-text-dim">No sessions yet.</p>
          <Link to="/test/new" className="text-vk-accent text-sm hover:underline mt-2 inline-block">
            Start your first evaluation
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {sessions?.map((session) => {
          const status = STATUS_STYLES[session.status] || STATUS_STYLES.in_progress;
          return (
            <div
              key={session.id}
              className="bg-vk-card border border-vk-border p-5 flex items-center justify-between vk-card-hover transition-all duration-300"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-vk-text truncate font-display tracking-wide">
                    {session.model_name}
                  </h3>
                  {session.model_version && (
                    <span className="text-xs text-vk-text-dim font-mono">
                      {session.model_version}
                    </span>
                  )}
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono border',
                      status.border,
                      status.text
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-vk-text-dim font-mono">
                  {session.model_provider && <span>{session.model_provider}</span>}
                  <span>by {session.evaluator_name}</span>
                  <span>{formatDate(session.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4">
                {session.kampff_index !== null && (
                  <div className="text-right mr-2">
                    <p className="text-lg font-mono font-bold text-vk-accent glow-amber vk-readout">
                      {formatKappa(session.kampff_index)}
                    </p>
                    <p className="text-[10px] text-vk-text-dim font-mono uppercase tracking-wider">kappa</p>
                  </div>
                )}

                <Link
                  to={session.status === 'in_progress' ? `/test/${session.id}` : `/sessions/${session.id}`}
                  className="p-2 border border-vk-border text-vk-text-dim hover:text-vk-accent hover:border-vk-accent/30 transition-all"
                  title={session.status === 'in_progress' ? 'Continue' : 'View'}
                >
                  <Eye className="w-4 h-4" />
                </Link>

                {session.status === 'completed' && (
                  <Link
                    to={`/sessions/${session.id}/dashboard`}
                    className="p-2 border border-vk-border text-vk-text-dim hover:text-vk-accent hover:border-vk-accent/30 transition-all"
                    title="Dashboard"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Link>
                )}

                <button
                  onClick={() => {
                    if (confirm('Delete this session? This cannot be undone.')) {
                      deleteMutation.mutate(session.id);
                    }
                  }}
                  className="p-2 border border-vk-border text-vk-text-dim hover:text-vk-danger hover:border-vk-danger/30 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
