import type { RuntimeFile } from "../platform/java-browser";

export function JavaFiles({
  files,
  onChange,
  disabled,
  onError,
}: {
  files: RuntimeFile[];
  onChange: (files: RuntimeFile[]) => void;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  return (
    <div className="border-t border-[var(--line)] p-4 text-xs space-y-2">
      <label className="block">
        Program files
        <input
          aria-label="Upload program files"
          type="file"
          multiple
          disabled={disabled}
          className="mt-2 block w-full"
          onChange={async (event) => {
            const selected = Array.from(event.target.files || []);
            event.target.value = "";
            try {
              if (
                selected.length > 10 ||
                selected.reduce((sum, file) => sum + file.size, 0) > 1048576
              )
                throw new Error(
                  "Choose up to 10 files, totaling at most 1 MB.",
                );
              if (
                new Set(selected.map((file) => file.name)).size !==
                  selected.length ||
                selected.some(
                  (file) =>
                    !/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,79}$/.test(file.name) ||
                    /\.(java|class)$/i.test(file.name),
                )
              )
                throw new Error(
                  "Use unique data filenames (letters, numbers, spaces, dots, dashes or underscores), without Java source extensions.",
                );
              onChange(
                await Promise.all(
                  selected.map(async (file) => {
                    const bytes = new Uint8Array(await file.arrayBuffer());
                    let binary = "";
                    for (const byte of bytes)
                      binary += String.fromCharCode(byte);
                    return { name: file.name, base64: btoa(binary) };
                  }),
                ),
              );
            } catch (error) {
              onError(
                error instanceof Error
                  ? error.message
                  : "Files could not load.",
              );
            }
          }}
        />
      </label>
      <p className="text-[var(--muted)]">
        Use the filename in your Java program, such as input.txt. Files are
        copied into a temporary workspace each run; upload again after a page
        reload.
      </p>
      {files.map((file) => (
        <span className="block" key={file.name}>
          {file.name}
        </span>
      ))}
      {!!files.length && (
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() => onChange([])}
        >
          Clear files
        </button>
      )}
    </div>
  );
}

export function JavaDownloads({ files }: { files: RuntimeFile[] }) {
  return files.length ? (
    <div className="p-4 text-xs space-y-2">
      <p>Files from the last run (up to 20 files / 2 MB):</p>
      {files.map((file) => (
        <button
          type="button"
          className="secondary-button block"
          key={file.name}
          onClick={() => {
            const bytes = Uint8Array.from(atob(file.base64), (character) =>
              character.charCodeAt(0),
            );
            const url = URL.createObjectURL(
              new Blob([bytes], { type: "application/octet-stream" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download {file.name}
        </button>
      ))}
    </div>
  ) : null;
}
