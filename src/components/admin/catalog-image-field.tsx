"use client";

import { useEffect, useMemo } from "react";
import { isHttpUrl } from "@/lib/is-http-url";

function useObjectUrl(file: File | null) {
  const blobUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return blobUrl;
}

export function CatalogImageField({
  label,
  storedUrl,
  pendingFile,
  onPendingFileChange,
  onClear,
  disabled,
  chooseImageLabel,
  removeImageLabel,
}: {
  label: string;
  storedUrl: string;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
  onClear: () => void;
  disabled?: boolean;
  chooseImageLabel: string;
  removeImageLabel: string;
}) {
  const blobUrl = useObjectUrl(pendingFile);
  const trimmed = storedUrl.trim();
  const preview =
    blobUrl ||
    (trimmed && isHttpUrl(trimmed) ? trimmed : null);

  function handleClear() {
    onClear();
    onPendingFileChange(null);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-admin-muted">
        {label}
      </label>
      {preview ? (
        <div className="mb-2 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview / arbitrary URLs */}
          <img
            src={preview}
            alt=""
            className="h-24 w-24 rounded-lg border border-admin-border object-cover bg-[rgba(31,68,60,0.06)]"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={handleClear}
            className="rounded-lg border border-admin-border px-3 py-1.5 text-xs font-medium text-admin-muted hover:bg-[rgba(31,68,60,0.06)] disabled:opacity-50"
          >
            {removeImageLabel}
          </button>
        </div>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled}
        className="block w-full text-sm text-admin-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#082018] hover:file:bg-primary/25"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = "";
          onPendingFileChange(f);
        }}
      />
      <p className="mt-1 text-xs text-admin-muted">{chooseImageLabel}</p>
    </div>
  );
}
