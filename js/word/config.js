/* WORXXEL Word Editor — Configuration Constants */
export const AI_ENDPOINT = ""; // Set via Worker deploy; leave empty for demo transforms

export const ACTIONS = {
  professional: "Make professional",
  summarize: "Summarize",
  expand: "Expand",
  fix: "Fix grammar & style",
  shorten: "Shorten",
  translate: "Translate",
  table: "Make a table",
  bullets: "To bullets"
};

export const OPS_STAGES = [
  "Analyzing your request",
  "Drafting the content",
  "Formatting & styling",
  "Final review"
];

export const DAILY_AI_LIMIT = 2;
export const DRAFT_KEY = "worxxel-editor-draft";