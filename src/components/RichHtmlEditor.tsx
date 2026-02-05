"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type SunEditorCore from "suneditor/src/lib/core";
import type { SunEditorOptions } from "suneditor/src/options";
import type {
  UploadBeforeHandler,
  UploadBeforeReturn,
} from "suneditor-react/dist/types/upload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  SANITIZE_ALLOWED_ATTRIBUTES,
  SANITIZE_ALLOWED_TAGS,
} from "@shared/sanitizeConfig";
import { ko as sunEditorKo } from "suneditor/src/lang";

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });

type EditorMode = "wysiwyg" | "html";

interface RichHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  enableImageUpload?: boolean;
  height?: string;
  placeholder?: string;
  toolbarLabel?: ReactNode;
  className?: string;
}

const EDITOR_DEBOUNCE_MS = 300;
const TAGS_WHITELIST = SANITIZE_ALLOWED_TAGS.join("|");
const ATTRIBUTES_WHITELIST = Object.entries(SANITIZE_ALLOWED_ATTRIBUTES).reduce(
  (acc, [tag, attrs]) => {
    if (!attrs) return acc;
    const key = tag === "*" ? "all" : tag;
    acc[key] = attrs.join("|");
    return acc;
  },
  {} as Record<string, string>,
);

export function RichHtmlEditor({
  value,
  onChange,
  enableImageUpload = false,
  height = "420px",
  placeholder,
  toolbarLabel,
  className,
}: RichHtmlEditorProps) {
  const editorRef = useRef<SunEditorCore | null>(null);
  const initialValueRef = useRef(value ?? "");
  const latestHtmlRef = useRef(value ?? "");
  const [mode, setMode] = useState<EditorMode>("wysiwyg");
  const [htmlText, setHtmlText] = useState(value ?? "");
  const lastSyncedRef = useRef(value ?? "");
  const debounceRef = useRef<number | null>(null);
  const scheduleChangeRef = useRef<(nextHtml: string) => void>(() => {});
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const { toast } = useToast();

  const flushChange = useCallback(
    (nextHtml: string) => {
      lastSyncedRef.current = nextHtml;
      latestHtmlRef.current = nextHtml;
      onChange(nextHtml);
    },
    [onChange],
  );

  const scheduleChange = useCallback(
    (nextHtml: string) => {
      latestHtmlRef.current = nextHtml;
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
    scheduleChangeRef.current = scheduleChange;
  }, [scheduleChange]);

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
    latestHtmlRef.current = nextValue;

    if (mode === "html") {
      setHtmlText(nextValue);
      return;
    }

    const editor = editorRef.current;
    if (editor) {
      editor.setContents(nextValue);
    }
  }, [value, mode]);

  const handleEditorChange = useCallback((content: string) => {
    scheduleChangeRef.current(content);
  }, []);

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
    const nextValue = latestHtmlRef.current ?? value ?? "";
    setHtmlText(nextValue);
    flushChange(nextValue);
    setMode("html");
  };

  const switchToWysiwyg = () => {
    if (mode === "wysiwyg") return;
    const nextValue = htmlText ?? "";
    const editor = editorRef.current;
    if (editor) {
      editor.setContents(nextValue);
    }
    flushChange(nextValue);
    setMode("wysiwyg");
  };

  const uploadImage = useCallback(async (file: File) => {
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

  const handleImageUploadBefore = useCallback(
    (
      files: Array<File>,
      _info: object,
      uploadHandler: UploadBeforeHandler,
    ): UploadBeforeReturn => {
      if (!enableImageUpload) return false;
      if (!files.length) {
        uploadHandler("업로드할 이미지가 없습니다.");
        return false;
      }

      void (async () => {
        try {
          const results = await Promise.all(
            files.map(async (file) => {
              const url = await uploadImage(file);
              return {
                url,
                name: file.name || "업로드 이미지",
                size: file.size ?? 0,
              };
            }),
          );
          uploadHandler({ result: results });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
          toast({
            title: "이미지 업로드 실패",
            description: message,
            variant: "destructive",
          });
          uploadHandler(message);
        }
      })();

      return undefined;
    },
    [enableImageUpload, toast, uploadImage],
  );

  const toolbarButtons = useMemo(() => {
    const mediaRow = enableImageUpload ? ["link", "image"] : ["link"];
    return [
      ["undo", "redo"],
      ["font", "fontSize", "formatBlock"],
      ["bold", "underline", "italic", "strike", "subscript", "superscript"],
      ["removeFormat"],
      ["fontColor", "hiliteColor"],
      ["outdent", "indent"],
      ["align", "horizontalRule", "list", "table"],
      mediaRow,
    ];
  }, [enableImageUpload]);

  const editorLang = useMemo(() => {
    return {
      ...sunEditorKo,
      dialogBox: {
        ...sunEditorKo.dialogBox,
        linkBox: {
          ...sunEditorKo.dialogBox.linkBox,
          title: "링크 삽입",
          url: "링크 주소",
          text: "표시할 텍스트",
          newWindowCheck: "새 창에서 열기",
          downloadLinkCheck: "다운로드 링크",
        },
        submitButton: "확인",
      },
    };
  }, []);

  const editorOptions = useMemo<SunEditorOptions>(() => {
    return {
      buttonList: toolbarButtons,
      addTagsWhitelist: TAGS_WHITELIST,
      pasteTagsWhitelist: TAGS_WHITELIST,
      attributesWhitelist: ATTRIBUTES_WHITELIST,
      lang: editorLang,
    };
  }, [editorLang, toolbarButtons]);

  const handleEditorInstance = useCallback((instance: SunEditorCore) => {
    editorRef.current = instance;
    const nextValue = latestHtmlRef.current ?? initialValueRef.current;
    instance.setContents(nextValue);
    setIsEditorReady(true);
    setEditorError(null);
  }, []);

  const handleEditorLoad = useCallback(() => {
    setIsEditorReady(true);
  }, []);

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-background", className)}>
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2",
          toolbarLabel ? "justify-between" : "justify-end",
        )}
      >
        {toolbarLabel ? (
          <span className="text-sm font-medium text-foreground">{toolbarLabel}</span>
        ) : null}
        <div className="flex items-center gap-1">
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
        <div className="space-y-2 p-3">
          {editorError ? (
            <p className="text-xs text-destructive">{editorError}</p>
          ) : null}
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

      <div className={mode === "wysiwyg" ? "block" : "hidden"}>
        <div className="relative" style={{ minHeight: height }} aria-busy={!isEditorReady}>
          {!isEditorReady ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              에디터를 불러오는 중...
            </div>
          ) : null}
          <SunEditor
            defaultValue={initialValueRef.current}
            placeholder={placeholder}
            height={height}
            setDefaultStyle="font-family: var(--font-sans); font-size: 14px;"
            setOptions={editorOptions}
            onChange={handleEditorChange}
            onImageUploadBefore={enableImageUpload ? handleImageUploadBefore : undefined}
            onLoad={handleEditorLoad}
            getSunEditorInstance={handleEditorInstance}
          />
        </div>
      </div>
    </div>
  );
}
