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
    images = payload.get("images", [])

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

        for image in images:
            key = image.get("key")
            path = image.get("path")
            if not key or not path:
                continue
            width_cm = image.get("width_cm")
            height_cm = image.get("height_cm")

            kwargs = {}
            if width_cm is not None:
                kwargs["width"] = Cm(float(width_cm))
            if height_cm is not None:
                kwargs["height"] = Cm(float(height_cm))

            data[key] = InlineImage(template, path, **kwargs)
        for chart in charts:
            key = chart.get("key")
            chart_type = chart.get("type", "donut")
            labels = chart.get("labels", [])
            values = chart.get("values", [])
            width_cm = float(chart.get("width_cm", 13.5))
            height_cm = float(chart.get("height_cm", 5.0))

            if not key or not isinstance(values, list) or len(values) == 0:
                continue

            safe_values = [max(float(v), 0) for v in values]
            if chart_type != "bar" and sum(safe_values) <= 0:
                safe_values = [1 for _ in safe_values]

            colors = chart.get("colors")
            if not isinstance(colors, list) or len(colors) < len(safe_values):
                if chart_type == "bar":
                    colors = ["#4EC3E0", "#7C9CF5", "#F59E0B", "#F97316"]
                else:
                    colors = ["#4EC3E0", "#CBD5F5"]

            fig, ax = plt.subplots(figsize=(width_cm / 2.54, height_cm / 2.54))
            if chart_type == "bar":
                indices = list(range(len(safe_values)))
                ax.bar(indices, safe_values, color=colors[: len(safe_values)])
                if labels:
                    ax.set_xticks(indices)
                    ax.set_xticklabels(labels, fontsize=9, color="#475569")
                max_value = max(safe_values) if safe_values else 0
                ax.set_ylim(0, max_value * 1.2 if max_value > 0 else 1)
                ax.grid(axis="y", color="#E2E8F0", linestyle="-", linewidth=0.6)
                ax.spines["top"].set_visible(False)
                ax.spines["right"].set_visible(False)
                ax.spines["left"].set_visible(False)
                ax.tick_params(axis="y", labelsize=9, colors="#64748B")
            else:
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
