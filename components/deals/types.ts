export type SerializedStage = {
  id: string;
  name: string;
  sortOrder: number;
  isTerminal: boolean;
  terminalOutcome: string | null;
};

export type SerializedDeal = {
  id: string;
  title: string;
  stageId: string;
  workspaceId: string;
  organizationId: string;
  contactId: string | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
  value: number | null;
  status: string;
  notes: string | null;
  movedToStageAt: string; // ISO string
  createdAt: string;
  updatedAt: string;
};

export type ContactOption = {
  id: string;
  firstName: string;
  lastName: string | null;
  isInWorkspace: boolean;
};
