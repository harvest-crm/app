export const PENDING_STUB = "Pending generation.";
export const FAILED_STUB = "__generation_failed";

export function messageIsReady(suggestedMessage: string): boolean {
  return suggestedMessage !== PENDING_STUB && !suggestedMessage.startsWith("__");
}
