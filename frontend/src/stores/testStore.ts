import { create } from 'zustand';

interface ResponseCache {
  question_id: number;
  question_as_delivered: string;
  model_response: string;
  response_latency_seconds: number | null;
  score: number | null;
  evaluator_notes: string;
  saved: boolean;
}

interface TestState {
  currentIndex: number;
  systemPromptDelivered: boolean;
  timerRunning: boolean;
  timerStart: number | null;
  timerElapsed: number;
  responses: Record<number, ResponseCache>;
  globalNotes: string;

  setCurrentIndex: (index: number) => void;
  setSystemPromptDelivered: (v: boolean) => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  setTimerElapsed: (v: number) => void;
  updateResponse: (questionId: number, data: Partial<ResponseCache>) => void;
  setGlobalNotes: (notes: string) => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set, get) => ({
  currentIndex: 0,
  systemPromptDelivered: false,
  timerRunning: false,
  timerStart: null,
  timerElapsed: 0,
  responses: {},
  globalNotes: '',

  setCurrentIndex: (index) => set({ currentIndex: index }),
  setSystemPromptDelivered: (v) => set({ systemPromptDelivered: v }),

  startTimer: () => set({ timerRunning: true, timerStart: Date.now() }),
  stopTimer: () => {
    const state = get();
    if (state.timerStart) {
      const elapsed = state.timerElapsed + (Date.now() - state.timerStart) / 1000;
      set({ timerRunning: false, timerStart: null, timerElapsed: elapsed });
    }
  },
  resetTimer: () => set({ timerRunning: false, timerStart: null, timerElapsed: 0 }),
  setTimerElapsed: (v) => set({ timerElapsed: v, timerRunning: false, timerStart: null }),

  updateResponse: (questionId, data) =>
    set((state) => {
      const defaults: ResponseCache = {
        question_id: questionId,
        question_as_delivered: '',
        model_response: '',
        response_latency_seconds: null,
        score: null,
        evaluator_notes: '',
        saved: false,
      };
      return {
        responses: {
          ...state.responses,
          [questionId]: {
            ...defaults,
            ...state.responses[questionId],
            ...data,
          },
        },
      };
    }),

  setGlobalNotes: (notes) => set({ globalNotes: notes }),

  reset: () =>
    set({
      currentIndex: 0,
      systemPromptDelivered: false,
      timerRunning: false,
      timerStart: null,
      timerElapsed: 0,
      responses: {},
      globalNotes: '',
    }),
}));
