"use client";

import { useState } from "react";

// A small chip editor: type + Enter/comma (or blur) to add, click × to remove.
export function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <label className="tag-input">
      <span>{label}</span>
      <div className="tag-input-box">
        {tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => remove(tag)}>
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          onBlur={add}
          placeholder={tags.length ? "" : placeholder}
        />
      </div>
    </label>
  );
}
