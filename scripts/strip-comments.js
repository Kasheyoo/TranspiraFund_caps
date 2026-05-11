#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const KEEP_LINE = /^\s*(eslint-(disable|enable)|@ts-(ignore|expect-error|nocheck|check)|prettier-ignore|@type|@returns?|@param|biome-ignore)/;

const TARGET_DIRS = [
  path.resolve(__dirname, "..", "src"),
  path.resolve(__dirname, "..", "functions", "src"),
];
const TARGET_FILES = [
  path.resolve(__dirname, "..", "App.tsx"),
];

function isPrevTokenAllowsRegex(out) {
  let i = out.length - 1;
  while (i >= 0 && /\s/.test(out[i])) i--;
  if (i < 0) return true;
  const c = out[i];
  if ("({[,;:=!&|?+-*/%^~<>".includes(c)) return true;
  let end = i;
  while (i >= 0 && /[A-Za-z0-9_$]/.test(out[i])) i--;
  const word = out.slice(i + 1, end + 1);
  return ["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "yield", "await", "case"].includes(word);
}

function strip(src) {
  let out = "";
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (c === '"' || c === "'") {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\") {
          out += ch + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += ch;
        i++;
        if (ch === quote) break;
      }
      continue;
    }

    if (c === "`") {
      out += c;
      i++;
      let exprDepth = 0;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\") {
          out += ch + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (exprDepth === 0 && ch === "$" && src[i + 1] === "{") {
          out += "${";
          i += 2;
          exprDepth = 1;
          continue;
        }
        if (exprDepth > 0) {
          if (ch === "{") exprDepth++;
          else if (ch === "}") {
            exprDepth--;
            out += ch;
            i++;
            continue;
          }
          out += ch;
          i++;
          continue;
        }
        out += ch;
        i++;
        if (ch === "`") break;
      }
      continue;
    }

    if (c === "/" && c2 === "/") {
      const eol = src.indexOf("\n", i);
      const end = eol === -1 ? n : eol;
      const body = src.slice(i + 2, end);
      if (KEEP_LINE.test(body)) {
        out += src.slice(i, end);
        i = end;
        continue;
      }
      let trailing = out;
      let trimEnd = trailing.length;
      while (trimEnd > 0 && (trailing[trimEnd - 1] === " " || trailing[trimEnd - 1] === "\t")) trimEnd--;
      out = trailing.slice(0, trimEnd);
      i = end;
      continue;
    }

    if (c === "/" && c2 === "*") {
      const isJsxComment = out.endsWith("{");
      const end = src.indexOf("*/", i + 2);
      if (end === -1) break;
      const body = src.slice(i + 2, end);
      if (KEEP_LINE.test(body.trim())) {
        out += src.slice(i, end + 2);
        i = end + 2;
        continue;
      }
      if (isJsxComment) {
        out = out.slice(0, -1);
        let j = end + 2;
        while (j < n && src[j] !== "}") j++;
        if (j < n) {
          i = j + 1;
          let trimEnd = out.length;
          while (trimEnd > 0 && (out[trimEnd - 1] === " " || out[trimEnd - 1] === "\t")) trimEnd--;
          out = out.slice(0, trimEnd);
          continue;
        }
      }
      let trimEnd = out.length;
      while (trimEnd > 0 && (out[trimEnd - 1] === " " || out[trimEnd - 1] === "\t")) trimEnd--;
      out = out.slice(0, trimEnd);
      i = end + 2;
      continue;
    }

    if (c === "/" && isPrevTokenAllowsRegex(out)) {
      out += c;
      i++;
      let inClass = false;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\") {
          out += ch + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        out += ch;
        i++;
        if (ch === "/" && !inClass) break;
        if (ch === "\n") break;
      }
      while (i < n && /[a-z]/.test(src[i])) {
        out += src[i];
        i++;
      }
      continue;
    }

    out += c;
    i++;
  }

  return out.replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n");
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(p, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) {
      out.push(p);
    }
  }
}

const files = [];
for (const d of TARGET_DIRS) if (fs.existsSync(d)) walk(d, files);
for (const f of TARGET_FILES) if (fs.existsSync(f)) files.push(f);

let changed = 0;
for (const f of files) {
  const before = fs.readFileSync(f, "utf8");
  const after = strip(before);
  if (after !== before) {
    fs.writeFileSync(f, after);
    changed++;
  }
}
console.log(`Stripped comments from ${changed} of ${files.length} files.`);
