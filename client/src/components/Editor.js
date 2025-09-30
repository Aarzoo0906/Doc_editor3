// client/src/components/Editor.js
import React from 'react';

export default function Editor({ content, onChange }) {
  return (
    <textarea
      className="editor"
      value={content}
      onChange={onChange}
      placeholder="Start typing... (plain text demo)"
    />
  );
}
