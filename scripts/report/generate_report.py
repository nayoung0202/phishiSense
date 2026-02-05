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
        from docxtpl import DocxTemplate, InlineImage
        from docx.shared import Cm
    except Exception as exc:
        print(f"docxtpl 모듈 로드 실패: {exc}", file=sys.stderr)
        sys.exit(1)

    charts = payload.get("charts", [])

    if charts:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except Exception as exc:
            print(f"matplotlib 모듈 로드 실패: {exc}", file=sys.stderr)
            sys.exit(1)

    try:
        template = DocxTemplate(template_path)
        for chart in charts:
            key = chart.get("key")
            labels = chart.get("labels", [])
            values = chart.get("values", [])
            width_cm = float(chart.get("width_cm", 13.5))
            height_cm = float(chart.get("height_cm", 5.0))

            if not key or not isinstance(values, list) or len(values) == 0:
                continue

            safe_values = [max(float(v), 0) for v in values]
            if sum(safe_values) <= 0:
                safe_values = [1 for _ in safe_values]

            colors = chart.get("colors")
            if not isinstance(colors, list) or len(colors) < len(safe_values):
                colors = ["#4EC3E0", "#CBD5F5"]

            fig, ax = plt.subplots(figsize=(width_cm / 2.54, height_cm / 2.54))
            ax.pie(
                safe_values,
                labels=None,
                startangle=90,
                colors=colors,
                wedgeprops={"width": 0.4, "edgecolor": "white"},
            )
            ax.axis("equal")
            ax.axis("off")

            chart_path = f"{output_path}.{key}.png"
            fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)
            plt.close(fig)

            data[key] = InlineImage(
                template,
                chart_path,
                width=Cm(width_cm),
                height=Cm(height_cm),
            )

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
