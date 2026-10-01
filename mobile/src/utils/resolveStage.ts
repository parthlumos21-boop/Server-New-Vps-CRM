export const normalizeStageKey = (value: any) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const statusToStage: Record<string, string> = {
  pending: 'new',
  active: 'contacted',
  inactive: 'closed',
  hold: 'follow_up',
  in_progress: 'follow_up',
  technical_review: 'technical_offer',
  commercial_review: 'commercial_offer',
  quotation_shared: 'quotation_sent',
  revision_requested: 'quote_revision',
  won: 'order_received',
  awaiting_po: 'convert_to_po',
  lost: 'order_lost',
  converted: 'converted',
  rejected: 'rejected',
  closed: 'closed',
};

const VALID_STAGES = [
  'new', 'follow_up', 'technical_offer', 'priority_1', 'commercial_offer', 
  'priority_2', 'quotation_sent', 'quote_revision', 'order_received', 
  'convert_to_po', 'order_lost', 'converted', 'rejected', 'contacted', 'closed'
];

export const resolveStage = (account: any): string => {
  const explicitStage = normalizeStageKey(account.stage || account.boardStage || account.pipelineStage);
  if (explicitStage && VALID_STAGES.includes(explicitStage)) {
    return explicitStage;
  }

  const normalizedStatus = normalizeStageKey(account.status || account.accountStatus || account.accountState);
  
  return statusToStage[normalizedStatus] || 'new';
};
