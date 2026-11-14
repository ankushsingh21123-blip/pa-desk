export const SEGMENT_DEFS = [
  { key: 'inbox', label: 'Inbox', pred: c => !c.labels.archived },
  { key: 'assistant', label: 'Assistant to reply', pred: c => c.classification.label === 'assistant' && !c.labels.archived && !c.labels.completed },
  { key: 'client', label: 'Client to reply', pred: c => c.classification.label === 'client' && !c.labels.archived && !c.labels.completed },
  { key: 'noreply', label: 'No reply needed', pred: c => c.classification.label === 'noreply' && !c.labels.archived && !c.labels.completed },
  { key: 'action', label: 'Action required', pred: c => (c.classification.label === 'assistant' || c.classification.needsReview) && !c.labels.archived && !c.labels.completed },
  { key: 'review', label: 'Needs review', pred: c => c.classification.needsReview && !c.labels.archived && !c.labels.completed },
  { key: 'waiting', label: 'Waiting for response', pred: c => !!c.waiting && !c.labels.archived && !c.labels.completed },
  { key: 'meetings', label: 'Meetings', pred: c => (c.meetings || []).length > 0 && !c.labels.archived },
  { key: 'important', label: 'Important', pred: c => !!c.labels.important && !c.labels.archived },
  { key: 'completed', label: 'Completed', pred: c => !!c.labels.completed },
  { key: 'archived', label: 'Archived', pred: c => !!c.labels.archived }
];

export const segmentByKey = key => SEGMENT_DEFS.find(s => s.key === key) || SEGMENT_DEFS[0];
