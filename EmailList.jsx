import React from 'react';
import { Row } from './Dashboard.jsx';
import { segmentByKey } from './segments.js';

export default function EmailList({ segment, conversations, onOpen }) {
  const def = segmentByKey(segment);
  const list = conversations.filter(def.pred);
  return (
    <div className="page">
      <div className="page-head">
        <h1>{def.label}</h1>
        <p className="muted">{list.length} conversation{list.length === 1 ? '' : 's'}</p>
      </div>
      <div className="panel list">
        {list.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">[]</div>
            <p>Nothing here right now.</p>
            <p className="muted">New emails appear automatically on the next sync and are classified as they arrive.</p>
          </div>
        )}
        {list.map(c => <Row key={c.id} c={c} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
