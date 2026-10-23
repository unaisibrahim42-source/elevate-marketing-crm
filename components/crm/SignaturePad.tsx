"use client";

import { useRef, useEffect } from "react";

export default function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#18090f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#cafb2a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hiddenInputRef.current && canvasRef.current) {
      hiddenInputRef.current.value = canvasRef.current.toDataURL("image/png");
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#18090f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (hiddenInputRef.current) hiddenInputRef.current.value = "";
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={420}
        height={140}
        className="w-full rounded border touch-none"
        style={{ borderColor: "var(--crm-border-strong)", background: "var(--crm-bg)" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
          Draw your signature above
        </p>
        <button type="button" onClick={clear} className="text-xs" style={{ color: "var(--crm-cyan)" }}>
          Clear
        </button>
      </div>
      <input ref={hiddenInputRef} type="hidden" name={name} />
    </div>
  );
}
