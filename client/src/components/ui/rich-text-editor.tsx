import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Strikethrough,
  Undo2,
  Redo2,
} from "lucide-react";

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "createLink"
  | "removeFormat"
  | "undo"
  | "redo";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

interface ToolbarItem {
  label: string;
  command: Command;
  icon: React.ReactNode;
}

const toolbarItems: ToolbarItem[] = [
  { label: "굵게", command: "bold", icon: <Bold className="h-3.5 w-3.5" /> },
  { label: "기울임", command: "italic", icon: <Italic className="h-3.5 w-3.5" /> },
  { label: "밑줄", command: "underline", icon: <Underline className="h-3.5 w-3.5" /> },
  { label: "취소선", command: "strikeThrough", icon: <Strikethrough className="h-3.5 w-3.5" /> },
  { label: "불릿", command: "insertUnorderedList", icon: <List className="h-3.5 w-3.5" /> },
  { label: "번호", command: "insertOrderedList", icon: <ListOrdered className="h-3.5 w-3.5" /> },
];

const historyItems: ToolbarItem[] = [
  { label: "실행 취소", command: "undo", icon: <Undo2 className="h-3.5 w-3.5" /> },
  { label: "다시 실행", command: "redo", icon: <Redo2 className="h-3.5 w-3.5" /> },
];

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  };

  const applyCommand = (command: Command) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    if (command === "createLink") {
      const url = window.prompt("링크 URL을 입력하세요:");
      if (!url) return;
      document.execCommand("createLink", false, url);
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
          title="형식 제거"
          onMouseDown={(event) => {
            event.preventDefault();
            applyCommand("removeFormat");
          }}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          {historyItems.map((item) => (
            <Button
              key={item.command}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={item.label}
              onMouseDown={(event) => {
                event.preventDefault();
                applyCommand(item.command);
              }}
            >
              {item.icon}
            </Button>
          ))}
        </div>
      </div>
      <div
        ref={editorRef}
        className="editor-scrollbar min-h-[300px] max-h-[600px] overflow-y-auto bg-background p-4 text-sm focus:outline-none"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={() => {
          handleInput();
          onBlur?.();
        }}
      />
    </div>
  );
}
