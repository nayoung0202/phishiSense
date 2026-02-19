import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TemplatePreviewFrame } from "@/components/template-preview-frame";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TEMPLATE_PREVIEW_SANDBOX_CLASS } from "@/lib/templatePreview";
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Strikethrough,
  Image as ImageIcon,
} from "lucide-react";

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "createLink"
  | "insertImage"
  | "removeFormat";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  previewHtml?: string;
}

interface ToolbarItem {
  label: string;
  command: Command;
  icon: ReactNode;
}

const toolbarItems: ToolbarItem[] = [
  { label: "굵게", command: "bold", icon: <Bold className="h-3.5 w-3.5" /> },
  { label: "기울임", command: "italic", icon: <Italic className="h-3.5 w-3.5" /> },
  { label: "밑줄", command: "underline", icon: <Underline className="h-3.5 w-3.5" /> },
  { label: "취소선", command: "strikeThrough", icon: <Strikethrough className="h-3.5 w-3.5" /> },
  { label: "불릿", command: "insertUnorderedList", icon: <List className="h-3.5 w-3.5" /> },
  { label: "번호", command: "insertOrderedList", icon: <ListOrdered className="h-3.5 w-3.5" /> },
];

type EditorMode = "edit" | "html" | "preview";

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  previewHtml,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<EditorMode>("edit");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (mode !== "edit") return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value, mode]);

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items?.length) {
      return;
    }
    const imageItems = Array.from(items).filter((item) =>
      item.type.startsWith("image/"),
    );
    if (imageItems.length === 0) {
      return;
    }

    event.preventDefault();

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        document.execCommand("insertImage", false, reader.result as string);
        onChange(editor.innerHTML);
      };
      reader.readAsDataURL(file);
    });
  };

  const applyCommand = (command: Command) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    if (command === "createLink") {
      const url = window.prompt("링크 URL을 입력하세요:");
      if (!url) return;
      document.execCommand("createLink", false, url);
    } else if (command === "insertImage") {
      const url = window.prompt("이미지 URL을 입력하세요:");
      if (!url) return;
      document.execCommand("insertImage", false, url);
    } else {
      document.execCommand(command, false);
    }

    onChange(editor.innerHTML);
  };

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
        {toolbarItems.map((item) => (
          <Button
            key={item.command}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={item.label}
            disabled={mode !== "edit"}
            onMouseDown={(event) => {
              event.preventDefault();
              applyCommand(item.command);
            }}
          >
            {item.icon}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="링크"
          disabled={mode !== "edit"}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("createLink");
          }}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="이미지"
          disabled={mode !== "edit"}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("insertImage");
          }}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="형식 제거"
          disabled={mode !== "edit"}
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("removeFormat");
          }}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          {(["edit", "html", "preview"] as EditorMode[]).map((item) => (
            <Button
              key={item}
              type="button"
              variant={mode === item ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs font-semibold"
              onMouseDown={(event) => {
                event.preventDefault();
                setMode(item);
              }}
            >
              {item === "edit" ? "편집" : item === "html" ? "HTML" : "미리보기"}
            </Button>
          ))}
        </div>
      </div>
      {mode === "html" ? (
        <textarea
          className="editor-scrollbar min-h-[300px] max-h-[600px] w-full resize-none border-t border-border bg-background p-4 font-mono text-sm focus:outline-none"
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onBlur?.()}
          placeholder={placeholder}
        />
      ) : mode === "preview" ? (
        <ScrollArea className="editor-scrollbar h-[420px] border-t border-border bg-muted/30 p-2">
          {(previewHtml ?? value).trim().length > 0 ? (
            <TemplatePreviewFrame
              html={previewHtml ?? value}
              className="rounded-md shadow-sm"
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">입력된 내용이 없습니다.</p>
          )}
        </ScrollArea>
      ) : (
        <div
          ref={editorRef}
          className={cn(
            "editor-scrollbar min-h-[300px] max-h-[600px] overflow-y-auto bg-background p-4 text-sm focus:outline-none",
            TEMPLATE_PREVIEW_SANDBOX_CLASS,
          )}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          data-placeholder={placeholder}
          onInput={handleInput}
          onBlur={() => {
            handleInput();
            onBlur?.();
          }}
          onPaste={handlePaste}
        />
      )}
    </div>
  );
}
