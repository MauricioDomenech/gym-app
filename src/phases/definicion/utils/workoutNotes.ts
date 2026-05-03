const COACH_PLAN_START = '[COACH_PLAN]';
const COACH_PLAN_END = '[/COACH_PLAN]';
const USER_FEEDBACK_START = '[USER_FEEDBACK]';
const USER_FEEDBACK_END = '[/USER_FEEDBACK]';

interface ParsedWorkoutNotes {
  coachPlan: string;
  userFeedback: string;
  hasStructuredNotes: boolean;
}

function extractBlock(raw: string, start: string, end: string): string {
  const startIndex = raw.indexOf(start);
  const endIndex = raw.indexOf(end);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return '';
  }

  return raw.slice(startIndex + start.length, endIndex).trim();
}

export function parseWorkoutNotes(rawNotes?: string): ParsedWorkoutNotes {
  const raw = (rawNotes || '').trim();

  if (!raw) {
    return { coachPlan: '', userFeedback: '', hasStructuredNotes: false };
  }

  const coachPlan = extractBlock(raw, COACH_PLAN_START, COACH_PLAN_END);
  const userFeedback = extractBlock(raw, USER_FEEDBACK_START, USER_FEEDBACK_END);
  const hasStructuredNotes = Boolean(coachPlan || userFeedback);

  if (hasStructuredNotes) {
    return { coachPlan, userFeedback, hasStructuredNotes };
  }

  return { coachPlan: raw, userFeedback: '', hasStructuredNotes: false };
}

export function buildWorkoutNotes(coachPlan: string, userFeedback: string): string {
  const plan = coachPlan.trim();
  const feedback = userFeedback.trim();

  if (!plan) {
    return feedback;
  }

  const blocks = [`${COACH_PLAN_START}\n${plan}\n${COACH_PLAN_END}`];

  if (feedback) {
    blocks.push(`${USER_FEEDBACK_START}\n${feedback}\n${USER_FEEDBACK_END}`);
  }

  return blocks.join('\n\n');
}
