import json
import sys
from pathlib import Path


def main():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("입력 JSON 파싱에 실패했습니다.", file=sys.stderr)
        sys.exit(1)

    template_path = payload.get("template_path")
    output_path = payload.get("output_path")
    data = payload.get("data", {})

    if not template_path or not output_path:
        print("template_path 또는 output_path가 없습니다.", file=sys.stderr)
        sys.exit(1)

    try:
        from docxtpl import DocxTemplate
    except Exception as exc:
        print(f"docxtpl 모듈 로드 실패: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        template = DocxTemplate(template_path)
        template.render(data)
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        template.save(str(output_file))
    except Exception as exc:
        print(f"보고서 생성 실패: {exc}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps({"ok": True}))


if __name__ == "__main__":
    main()
