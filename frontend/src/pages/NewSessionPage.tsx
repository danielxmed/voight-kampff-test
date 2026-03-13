import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { PlayCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    model_name: '',
    model_version: '',
    model_provider: '',
    evaluator_name: '',
    evaluator_credentials: '',
    conflict_disclosure: '',
    transcript_url: '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload: any = { ...data };
      // Remove empty optional fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') {
          if (key === 'model_name' || key === 'evaluator_name') return;
          payload[key] = null;
        }
      });
      return api.createSession(payload);
    },
    onSuccess: (data) => {
      navigate(`/test/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-vk-accent mb-1">New Evaluation Session</h1>
      <p className="text-sm text-vk-text-dim mb-8">
        Configure the model and evaluator details before beginning the assessment.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-vk-card border border-vk-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-vk-text uppercase tracking-wider mb-2">
            Model Information
          </h2>
          <div>
            <label className="block text-sm text-vk-text-dim mb-1">
              Model Name <span className="text-vk-d3">*</span>
            </label>
            <input
              type="text"
              required
              value={form.model_name}
              onChange={(e) => updateField('model_name', e.target.value)}
              placeholder="e.g., GPT-4, Claude 3, Llama 3"
              className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-vk-text-dim mb-1">Model Version</label>
              <input
                type="text"
                value={form.model_version}
                onChange={(e) => updateField('model_version', e.target.value)}
                placeholder="e.g., turbo-2024-01"
                className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-vk-text-dim mb-1">Provider</label>
              <input
                type="text"
                value={form.model_provider}
                onChange={(e) => updateField('model_provider', e.target.value)}
                placeholder="e.g., OpenAI, Anthropic"
                className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-vk-card border border-vk-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-vk-text uppercase tracking-wider mb-2">
            Evaluator Information
          </h2>
          <div>
            <label className="block text-sm text-vk-text-dim mb-1">
              Evaluator Name <span className="text-vk-d3">*</span>
            </label>
            <input
              type="text"
              required
              value={form.evaluator_name}
              onChange={(e) => updateField('evaluator_name', e.target.value)}
              placeholder="Your full name"
              className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-vk-text-dim mb-1">Credentials</label>
            <textarea
              value={form.evaluator_credentials}
              onChange={(e) => updateField('evaluator_credentials', e.target.value)}
              placeholder="Relevant qualifications or experience"
              rows={2}
              className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-vk-text-dim mb-1">
              Conflict of Interest Disclosure
            </label>
            <textarea
              value={form.conflict_disclosure}
              onChange={(e) => updateField('conflict_disclosure', e.target.value)}
              placeholder="Any potential conflicts of interest"
              rows={2}
              className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="bg-vk-card border border-vk-border rounded-xl p-6">
          <label className="block text-sm text-vk-text-dim mb-1">Transcript URL</label>
          <input
            type="url"
            value={form.transcript_url}
            onChange={(e) => updateField('transcript_url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-vk-bg border border-vk-border rounded-lg px-4 py-2.5 text-vk-text placeholder:text-vk-text-dim/50 focus:outline-none focus:border-vk-accent/50 transition-colors"
          />
        </div>

        {mutation.isError && (
          <div className="bg-vk-d3/10 border border-vk-d3/30 rounded-lg p-3 text-sm text-vk-d3">
            {(mutation.error as Error).message}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !form.model_name || !form.evaluator_name}
          className="w-full flex items-center justify-center gap-2 bg-vk-accent hover:bg-vk-accent-dim text-black font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <PlayCircle className="w-5 h-5" />
          )}
          Begin Evaluation
        </button>
      </form>
    </div>
  );
}
