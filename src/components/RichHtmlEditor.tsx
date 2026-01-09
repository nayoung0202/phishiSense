"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Editor as ToastEditorRef } from "@toast-ui/react-editor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { sanitizeEditorHtml } from "@/lib/editorSanitizer";

type EditorMode = "wysiwyg" | "html";

interface RichHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  enableImageUpload?: boolean;
  height?: string;
  placeholder?: string;
  className?: string;
}

const ToastEditor = dynamic(
  () => import("@toast-ui/react-editor").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        에디터를 불러오는 중...
      </div>
    ),
  },
);

const EDITOR_DEBOUNCE_MS = 300;

export function RichHtmlEditor({
  value,
  onChange,
  enableImageUpload = false,
  height = "420px",
  placeholder,
  className,
}: RichHtmlEditorProps) {
  const editorRef = useRef<ToastEditorRef | null>(null);
  const [mode, setMode] = useState<EditorMode>("wysiwyg");
  const [htmlText, setHtmlText] = useState(value ?? "");
  const lastSyncedRef = useRef(value ?? "");
  const debounceRef = useRef<number | null>(null);
  const { toast } = useToast();

  const flushChange = useCallback(
    (nextHtml: string) => {
      lastSyncedRef.current = nextHtml;
      onChange(nextHtml);
    },
    [onChange],
  );

  const scheduleChange = useCallback(
    (nextHtml: string) => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        flushChange(nextHtml);
      }, EDITOR_DEBOUNCE_MS);
    },
    [flushChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextValue = value ?? "";
    if (nextValue === lastSyncedRef.current) return;
    lastSyncedRef.current = nextValue;

    if (mode === "html") {
      setHtmlText(nextValue);
      return;
    }

    const instance = editorRef.current?.getInstance();
    if (instance && instance.getHTML() !== nextValue) {
      instance.setHTML(nextValue);
    }
  }, [value, mode]);

  const handleEditorChange = useCallback(() => {
    const instance = editorRef.current?.getInstance();
    if (!instance) return;
    scheduleChange(instance.getHTML());
  }, [scheduleChange]);

  const handleHtmlChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setHtmlText(nextValue);
    scheduleChange(nextValue);
  };

  const handleHtmlBlur = () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    flushChange(htmlText);
  };

  const switchToHtml = () => {
    if (mode === "html") return;
    const instance = editorRef.current?.getInstance();
    const nextValue = instance ? instance.getHTML() : value ?? "";
    setHtmlText(nextValue);
    flushChange(nextValue);
    setMode("html");
  };

  const switchToWysiwyg = () => {
    if (mode === "wysiwyg") return;
    const nextValue = htmlText ?? "";
    const instance = editorRef.current?.getInstance();
    if (instance && instance.getHTML() !== nextValue) {
      instance.setHTML(nextValue);
    }
    flushChange(nextValue);
    setMode("wysiwyg");
  };

  const uploadImage = useCallback(async (blob: Blob) => {
    const file =
      blob instanceof File
        ? blob
        : new File([blob], "image.png", { type: blob.type || "image/png" });

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/images", {
      method: "POST",
      body: formData,
    });

    const rawText = await response.text();
    let payload: { url?: string; error?: string } | null = null;
    if (rawText) {
      try {
        payload = JSON.parse(rawText) as { url?: string; error?: string };
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new Error(payload?.error || "이미지 업로드에 실패했습니다.");
    }

    if (!payload?.url) {
      throw new Error("이미지 업로드 응답이 올바르지 않습니다.");
    }

    return payload.url;
  }, []);

  const handleImageUpload = useCallback(
    async (blob: Blob, callback: (url: string, alt?: string) => void) => {
      if (!enableImageUpload) return false;
      try {
        const url = await uploadImage(blob);
        const altText = blob instanceof File ? blob.name : "업로드 이미지";
        callback(url, altText);
      } catch (error) {
        toast({
          title: "이미지 업로드 실패",
          description: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
          variant: "destructive",
        });
      }
      return false;
    },
    [enableImageUpload, toast, uploadImage],
  );

  const editorHooks = useMemo(() => {
    if (!enableImageUpload) return undefined;
    return { addImageBlobHook: handleImageUpload };
  }, [enableImageUpload, handleImageUpload]);

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-background", className)}>
      <div className="relative">
        <div className={cn("absolute right-3 z-10", mode === "html" ? "top-3" : "top-10")}>
          <div className="flex items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              size="sm"
              variant={mode === "wysiwyg" ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={switchToWysiwyg}
            >
              WYSIWYG
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "html" ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={switchToHtml}
            >
              HTML
            </Button>
          </div>
        </div>

        <div className={mode === "html" ? "block" : "hidden"}>
          <div className="space-y-2 p-3 pt-12">
            <p className="text-xs text-muted-foreground">
              HTML 직접 편집 시 일부 태그/속성은 저장 시 제거될 수 있습니다(보안 정책).
            </p>
            <Textarea
              className="min-h-[320px] font-mono text-sm"
              value={htmlText}
              onChange={handleHtmlChange}
              onBlur={handleHtmlBlur}
              placeholder={placeholder}
              spellCheck={false}
            />
          </div>
        </div>
        <div className={cn("toastui-editor-dark", mode === "wysiwyg" ? "block" : "hidden")}>
          <ToastEditor
            ref={editorRef}
            initialEditType="wysiwyg"
            previewStyle="vertical"
            height={height}
            hideModeSwitch
            placeholder={placeholder}
            initialValue={value ?? ""}
            customHTMLSanitizer={sanitizeEditorHtml}
            onChange={handleEditorChange}
            hooks={editorHooks}
          />
        </div>
      </div>
    </div>
  );
}
