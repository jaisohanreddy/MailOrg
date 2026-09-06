"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { UserContextInterpretation } from "@/lib/ai";
import { deleteUserContext, saveUserContext } from "./actions";

const MAX_LENGTH = 4000;

const INTERPRETATION_SECTIONS: {
  key: keyof UserContextInterpretation;
  label: string;
}[] = [
  { key: "goals", label: "Goals" },
  { key: "priorities", label: "Priorities" },
  { key: "lowPrioritySignals", label: "Usually low priority" },
  { key: "currentContext", label: "Current context" },
];

function UnderstoodSection({
  interpretation,
}: {
  interpretation: UserContextInterpretation;
}) {
  const hasAnything = INTERPRETATION_SECTIONS.some(
    ({ key }) => interpretation[key].length > 0
  );

  if (!hasAnything) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.08] dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
        What MailOrg understood
      </h2>

      {INTERPRETATION_SECTIONS.map(({ key, label }) => {
        const items = interpretation[key];
        if (items.length === 0) return null;

        return (
          <div key={key} className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {label}
            </h3>
            <ul className="list-inside list-disc text-sm text-zinc-700 dark:text-zinc-300">
              {items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function ContextForm({
  initialContext,
  initialInterpretation,
}: {
  initialContext: string | null;
  initialInterpretation: UserContextInterpretation | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialContext ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isBusy = isSaving || isDeleting;
  const hasContent = value.trim().length > 0;

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(event.target.value);
    setError(null);
    setSuccess(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveUserContext(value);

    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess("Saved.");
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    const result = await deleteUserContext();

    setIsDeleting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setValue("");
    setSuccess("Cleared.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <textarea
          value={value}
          onChange={handleChange}
          rows={7}
          maxLength={MAX_LENGTH}
          disabled={isBusy}
          placeholder="I'm currently applying for internships. University emails and application deadlines are important to me. Newsletters are usually low priority."
          className="w-full resize-none rounded-xl border border-black/[.08] bg-white p-4 text-sm leading-6 text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
        />

        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600">
          <span>
            {value.length} / {MAX_LENGTH}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {success && !error && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {success}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isBusy || !hasContent}
            className="flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Understanding…" : "Save"}
          </button>

          {hasContent && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
              className="flex h-10 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isDeleting ? "Clearing…" : "Clear"}
            </button>
          )}
        </div>
      </form>

      {initialInterpretation && (
        <UnderstoodSection interpretation={initialInterpretation} />
      )}
    </div>
  );
}
