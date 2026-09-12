import { useEffect, useRef, useState } from "react";

// Opaque origin: student code cannot read the portal, cookies, or storage.
export function VisualPreview({ code }: { code: string }) {
  const [preview, setPreview] = useState<{ code: string; key: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.data?.type === "visual-lab-error"
      )
        setError(String(event.data.message).slice(0, 2000));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <section className="panel p-4 space-y-3">
      <p className="text-sm">
        Visual lab · HTML, CSS and JavaScript. These browser simulations are
        alternatives to desktop applets, not a Java Swing runtime.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setError("");
            setPreview({ code, key: Date.now() });
          }}
        >
          Run visual preview
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!preview}
          onClick={() => setPreview(null)}
        >
          Stop preview
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {preview && (
        <iframe
          ref={frame}
          key={preview.key}
          title="Interactive visual lab"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="h-[420px] w-full rounded-md bg-white"
          srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>body{font:16px system-ui;padding:16px;color:#172033}canvas{max-width:100%}</style><script>addEventListener('error',e=>parent.postMessage({type:'visual-lab-error',message:e.message},'*'));addEventListener('unhandledrejection',e=>parent.postMessage({type:'visual-lab-error',message:String(e.reason)},'*'));</script>${preview.code}`}
        />
      )}
    </section>
  );
}
