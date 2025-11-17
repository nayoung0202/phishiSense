import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const inlineFromFallback = () => ({
  postcssPlugin: "postcss-inline-from-fallback",
  Once(root, { result }) {
    const fallback = result.opts.from ?? "virtual-inline.css";
    root.walk((node) => {
      const source = node.source ?? (node.source = {});
      const input = source.input ?? (source.input = {});
      if (!input.file) {
        input.file = fallback;
      }
    });
  },
});
inlineFromFallback.postcss = true;

export default {
  plugins: [tailwindcss(), autoprefixer(), inlineFromFallback()],
};
