// src/components/AiEnginePage.jsx
import React from 'react';

export default function AiEnginePage() {
  return (
    <section className="panel-card">
      <h2>AI Engine</h2>
      <p className="panel-subtitle">
        Suggestion output is currently disabled until a free open-source suggestion API is connected.
      </p>

      <div className="info-box">
        <h3>Current Status: Inactive</h3>
        <p>
          No suggestion text is shown on scan results right now so you only see verified
          vulnerability findings. Once you choose a working free open-source API provider and
          endpoint, it can be connected here.
        </p>
      </div>
    </section>
  );
}