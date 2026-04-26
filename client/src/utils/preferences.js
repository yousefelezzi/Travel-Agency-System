const QUIZ_KEY = "atlas_quiz_prefs";
const PLANNER_DRAFT_KEY = "atlas_planner_draft";

export const emptyQuiz = () => ({
  vibe: [],
  budget: "",
  duration: "",
  groupType: "",
  climate: "",
  activities: [],
  region: "",
});

export const loadQuiz = () => {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return { ...emptyQuiz(), ...parsed };
  } catch {
    return null;
  }
};

export const saveQuiz = (prefs) => {
  try {
    localStorage.setItem(
      QUIZ_KEY,
      JSON.stringify({ ...prefs, savedAt: Date.now() })
    );
  } catch {
    // storage unavailable
  }
};

export const clearQuiz = () => {
  try {
    localStorage.removeItem(QUIZ_KEY);
  } catch {
    // ignore
  }
};

export const hasQuiz = () => {
  const q = loadQuiz();
  return !!(q && (q.vibe?.length || q.budget || q.region));
};

export const savePlannerDraft = (draft) => {
  try {
    localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
};

export const loadPlannerDraft = () => {
  try {
    const raw = localStorage.getItem(PLANNER_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPlannerDraft = () => {
  try {
    localStorage.removeItem(PLANNER_DRAFT_KEY);
  } catch {
    // ignore
  }
};
