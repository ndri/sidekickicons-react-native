#!/usr/bin/env node
// Generates React Native components (drawn with react-native-svg) from the SVGs
// that download-icons.mjs put in optimized/. Writes CommonJS and ES module
// builds plus type declarations into 16/, 20/ and 24/.
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { deprecated } from "./deprecated.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const STYLES = ["16/solid", "20/solid", "24/outline", "24/solid"];

// react-native-svg components for the SVG elements the icons use.
const ELEMENTS = { path: "Path", rect: "Rect", circle: "Circle" };

// Root attributes that only make sense in the DOM.
const DROPPED_ATTRIBUTES = new Set(["xmlns", "aria-hidden", "data-slot"]);

// Same names as the other Sidekickicons packages (which use the camelcase package),
// including a capital after a number: dots-2x2 is Dots2X2.
const toPascalCase = (name) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/(\d)([a-z])/g, (_match, digit, letter) => digit + letter.toUpperCase());

const toCamelCase = (name) =>
  name.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());

/** Turns `a="1" b-c="x"` into `{ a: 1, bC: "x" }`. */
function parseAttributes(source) {
  const attributes = {};
  for (const [, name, value] of source.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
    if (DROPPED_ATTRIBUTES.has(name)) continue;
    attributes[toCamelCase(name)] =
      value !== "" && !Number.isNaN(Number(value)) ? Number(value) : value;
  }
  return attributes;
}

/** Splits an optimized icon SVG into its root attributes and child elements. */
function parseSvg(svg, file) {
  const root = svg.match(/<svg\s([^>]*)>/);
  if (!root) throw new Error(`${file}: no <svg> element`);

  const children = [...svg.matchAll(/<([a-z]+)\s([^>]*?)\/>/g)].map(
    ([, tag, attributes]) => {
      const component = ELEMENTS[tag];
      if (!component) throw new Error(`${file}: unsupported element <${tag}>`);
      return { component, attributes: parseAttributes(attributes) };
    },
  );

  // Every element must have been understood, or the icon would silently lose parts.
  const elementCount = (svg.match(/<[a-z]/g) ?? []).length;
  if (elementCount !== children.length + 1) {
    throw new Error(`${file}: has elements this script doesn't handle`);
  }

  return { attributes: parseAttributes(root[1]), children };
}

/** Writes `{ a: 1, "b-c": "x" }` as an object literal, quoting keys only when needed. */
const objectLiteral = (object) =>
  Object.entries(object)
    .map(([key, value]) => {
      const property = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
      return `${property}: ${JSON.stringify(value)}`;
    })
    .join(", ");

function componentCode({ name, svg, isDeprecated, size }, format) {
  const components = [
    ...new Set(svg.children.map(({ component }) => component)),
  ];
  const imports =
    format === "esm"
      ? `import * as React from "react";\nimport Svg, { ${components.join(", ")} } from "react-native-svg";`
      : `const React = require("react");\nconst { default: Svg, ${components.join(", ")} } = require("react-native-svg");`;

  const rootProps = objectLiteral(svg.attributes);
  const children = svg.children
    .map(
      ({ component, attributes }) =>
        `React.createElement(${component}, { ${objectLiteral(attributes)} })`,
    )
    .join(",\n    ");

  const body = `${isDeprecated ? "/** @deprecated */\n" : ""}const ${name} = /*#__PURE__*/ React.forwardRef(function ${name}(
  { size = ${size}, ...props },
  ref
) {
  return React.createElement(
    Svg,
    { ref, width: size, height: size, ${rootProps}, "aria-hidden": true, ...props },
    ${children}
  );
});`;

  const exportLine =
    format === "esm" ? `export default ${name};` : `module.exports = ${name};`;
  return `${imports}\n\n${body}\n\n${exportLine}\n`;
}

function typesCode({ name, isDeprecated }) {
  return `import type { IconComponent } from "../../types";

${isDeprecated ? "/** @deprecated */\n" : ""}declare const ${name}: IconComponent;
export default ${name};
`;
}

function indexCode(icons, format) {
  return (
    icons
      .map(({ name }) =>
        format === "esm"
          ? `export { default as ${name} } from "./${name}.js";`
          : `module.exports.${name} = require("./${name}.js");`,
      )
      .join("\n") + "\n"
  );
}

function indexTypesCode(icons) {
  return (
    icons
      .map(({ name }) => `export { default as ${name} } from "./${name}";`)
      .join("\n") + "\n"
  );
}

async function write(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text, "utf8");
}

async function buildStyle(style) {
  const size = Number(style.split("/")[0]);
  const sourceDir = path.join(REPO_ROOT, "optimized", style);
  const outDir = path.join(REPO_ROOT, style);
  const files = (await fs.readdir(sourceDir))
    .filter((file) => file.endsWith(".svg"))
    .sort();

  const icons = await Promise.all(
    files.map(async (file) => ({
      name: `${toPascalCase(file.replace(/\.svg$/, ""))}Icon`,
      svg: parseSvg(
        await fs.readFile(path.join(sourceDir, file), "utf8"),
        `${style}/${file}`,
      ),
      isDeprecated: deprecated.includes(file),
      size,
    })),
  );

  await fs.rm(outDir, { recursive: true, force: true });
  await Promise.all([
    ...icons.flatMap((icon) => [
      write(path.join(outDir, `${icon.name}.js`), componentCode(icon, "cjs")),
      write(
        path.join(outDir, "esm", `${icon.name}.js`),
        componentCode(icon, "esm"),
      ),
      write(path.join(outDir, `${icon.name}.d.ts`), typesCode(icon)),
    ]),
    write(path.join(outDir, "index.js"), indexCode(icons, "cjs")),
    write(path.join(outDir, "esm", "index.js"), indexCode(icons, "esm")),
    write(path.join(outDir, "index.d.ts"), indexTypesCode(icons)),
    write(
      path.join(outDir, "esm", "package.json"),
      '{ "type": "module", "sideEffects": false }\n',
    ),
  ]);

  console.log(`Built ${icons.length} ${style} icons`);
}

await Promise.all(STYLES.map(buildStyle));
