export type ContactFilters = {
  q?: string;
  workspaceIds?: string[];
  tagIds?: string[];
  tagsLogic?: "and" | "or";
  temperature?: ("hot" | "warm" | "cold")[];
  hasOpenTasks?: boolean;
  hasOpenDeals?: boolean;
  createdAfter?: string;
  createdBefore?: string;
};

export type TaskFilters = {
  q?: string;
  workspaceIds?: string[];
  taskTypes?: string[];
  priorities?: ("low" | "medium" | "high")[];
  status?: "open" | "completed" | "all";
  dueWithin?: "overdue" | "today" | "this_week" | "this_month" | "all";
  hasReminder?: boolean;
};

export type DealFilters = {
  q?: string;
  stageIds?: string[];
  valueMin?: number;
  valueMax?: number;
  daysInStageMin?: number;
  hasContact?: boolean;
  contactTagIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
};

export type AnyFilters = ContactFilters | TaskFilters | DealFilters;

export type EntityType = "contact" | "task" | "deal";
