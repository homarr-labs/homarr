import { generate, ident, lexer, parse, walk } from "css-tree";

// CSS is parsed rather than copied: comments, URLs and private names must not
// survive an export, including escaped tokens and custom property fallbacks.
export const redactSnapshotCss = (
  source: string,
  names: {
    identifier: (value: string) => string;
    text: (value: string, key?: string) => string;
    attribute: (value: string, name: string) => string;
  },
  context: "stylesheet" | "declarationList" = "stylesheet",
) => {
  const plainIdentifier = (value: string) => names.identifier(ident.decode(value));
  const identifier = (value: string) => ident.encode(plainIdentifier(value));
  try {
    const ast = parse(source, {
      context,
      parseCustomProperty: true,
      onParseError: () => {
        throw new Error("Invalid CSS");
      },
    });
    // Use the grammar match to distinguish keywords from case-sensitive grid
    // areas, keyframes and other custom identifiers.
    const keywords = new WeakMap<object, string>();
    type Match = { syntax?: { type: string; name?: string }; node?: object; match?: Match[] };
    const collectKeywords = (result: unknown) => {
      const visit = (match?: Match | null) => {
        if (!match) return;
        if (match.node && match.syntax?.name && ["Keyword", "Function"].includes(match.syntax.type))
          keywords.set(match.node, match.syntax.name.toLowerCase());
        for (const child of match.match ?? []) visit(child);
      };
      visit((result as { matched?: Match }).matched);
    };
    walk(ast, (node) => {
      if (node.type === "Declaration") collectKeywords(lexer.matchProperty(node.property.toLowerCase(), node.value));
      if (node.type === "Atrule" && node.prelude)
        collectKeywords(lexer.matchAtrulePrelude(node.name.toLowerCase(), node.prelude));
    });
    walk(ast, function (node, item, list) {
      if (node.type === "Raw") throw new Error("Unparsed CSS");
      const token = node as unknown as Record<string, unknown>;
      if (
        typeof token.value === "string" &&
        ![
          "Url",
          "String",
          "Hash",
          "Number",
          "Percentage",
          "Dimension",
          "Operator",
          "WhiteSpace",
          "UnicodeRange",
          "Comment",
        ].includes(node.type)
      )
        throw new Error("Unhandled CSS value");
      // Cover fields that CSS Tree writes directly instead of visiting as
      // Identifier/String children. Reject new unhandled string fields.
      for (const [key, value] of Object.entries(token)) {
        if (typeof value !== "string") continue;
        if (["type", "name", "value", "property", "unit"].includes(key)) continue;
        if (key === "kind" && ["media", "supports", "container"].includes(value)) continue;
        if (key === "important") {
          token[key] = ident.decode(value).toLowerCase() === "important";
          continue;
        }
        if (key === "flags" && ["i", "s"].includes(value.toLowerCase())) {
          token[key] = value.toLowerCase();
          continue;
        }
        if (key === "matcher" && ["=", "~=", "|=", "^=", "$=", "*="].includes(value)) continue;
        if (["a", "b"].includes(key) && /^[+-]?\d+$/.test(value)) continue;
        if (["leftComparison", "rightComparison"].includes(key) && /^(?:[<>]=?|=)$/.test(value)) continue;
        if (key === "modifier" && ["not", "only"].includes(value.toLowerCase())) {
          token[key] = value.toLowerCase();
          continue;
        }
        if (["feature", "mediaType", "function"].includes(key)) {
          token[key] = identifier(value);
          continue;
        }
        throw new Error("Unhandled CSS field");
      }
      if (
        typeof token.name === "string" &&
        !["Atrule", "Declaration", "AttributeSelector", "Identifier", "Function"].includes(node.type)
      ) {
        if (node.type === "Combinator") {
          if (![" ", ">", "+", "~", "||", "/deep/"].includes(token.name)) throw new Error("Unknown combinator");
        } else if (token.type === "Layer") token.name = token.name.split(".").map(identifier).join(".");
        else if (node.type === "TypeSelector" && token.name === "*") return;
        else token.name = identifier(token.name);
      }
      if (node.type === "Hash") {
        const value = ident.decode(node.value);
        if (!/^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) throw new Error("Non-color CSS hash");
        node.value = value;
      }
      if (
        ["Number", "Percentage", "Dimension"].includes(node.type) &&
        typeof token.value === "string" &&
        !/^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?$/i.test(token.value)
      )
        throw new Error("Invalid CSS number");
      if (node.type === "Operator" && !/^[\s+*/=,:<>-]*$/.test(node.value)) throw new Error("Unknown CSS operator");
      if (node.type === "WhiteSpace") node.value = " ";
      if (node.type === "UnicodeRange" && !/^U\+[\da-f?]{1,6}(?:-[\da-f]{1,6})?$/i.test(node.value))
        throw new Error("Invalid Unicode range");
      if (node.type === "Comment") {
        if (item && list) list.remove(item);
        return walk.skip;
      }
      if (node.type === "Atrule") {
        const name = ident.decode(node.name).toLowerCase();
        if (
          ![
            "media",
            "supports",
            "container",
            "layer",
            "keyframes",
            "-webkit-keyframes",
            "scope",
            "starting-style",
          ].includes(name)
        ) {
          if (item && list) list.remove(item);
          return walk.skip;
        }
        node.name = name;
      }
      if (node.type === "Declaration") {
        let property = ident.decode(node.property);
        if (!property.startsWith("--")) property = property.toLowerCase();
        if (/secret|password|token|credential|api.?key|email|username/i.test(property)) {
          if (item && list) list.remove(item);
          return walk.skip;
        }
        if (property.startsWith("--")) node.property = identifier(property);
        else if (lexer.matchProperty(property, "initial").error) {
          if (item && list) list.remove(item);
          return walk.skip;
        } else node.property = property;
      }
      if (node.type === "Url") node.value = "/images/board-snapshot-placeholder.svg";
      if (node.type === "Function") {
        if (!keywords.has(node) && this.declaration)
          collectKeywords(lexer.matchProperty(this.declaration.property, node));
        node.name = keywords.get(node) ?? identifier(node.name);
      }
      if (node.type === "TypeSelector" && node.name === "*") return;
      if (
        node.type === "ClassSelector" ||
        node.type === "IdSelector" ||
        node.type === "TypeSelector" ||
        node.type === "PseudoClassSelector" ||
        node.type === "PseudoElementSelector"
      )
        node.name = identifier(node.name);
      if (
        node.type === "Dimension" &&
        !/^(?:px|r?em|ex|ch|cap|ic|lh|rlh|v[whib]|[sld]?v(?:min|max|[whib])|cq[whib]|cqmin|cqmax|cm|mm|q|in|pt|pc|deg|grad|rad|turn|ms|s|hz|khz|dpi|dpcm|dppx|x|fr)$/i.test(
          node.unit,
        )
      )
        throw new Error("Unknown CSS unit");
      if (node.type === "AttributeSelector") {
        const name = ident.decode(node.name.name);
        node.name.name = identifier(name);
        if (node.value?.type === "String") {
          if (name === "class" || name === "id")
            node.value.value = node.value.value.split(/\s+/).map(plainIdentifier).join(" ");
          else node.value.value = names.attribute(node.value.value, name);
        }
        if (node.value?.type === "Identifier") {
          if (name === "class" || name === "id") node.value.name = identifier(node.value.name);
          else node.value.name = ident.encode(names.attribute(ident.decode(node.value.name), name));
        }
        return walk.skip;
      }
      if (node.type === "Identifier") {
        const name = ident.decode(node.name);
        if (name.startsWith("--")) {
          node.name = identifier(name);
          return;
        }
        if (this.declaration && name === "Inter") return;
        // CSS Tree skips whole-value matching when var() is present. Probe
        // individual fallback tokens with the same property grammar.
        if (!keywords.has(node) && this.declaration)
          collectKeywords(lexer.matchProperty(this.declaration.property, node));
        node.name = keywords.get(node) ?? identifier(name);
      }
      if (node.type === "String") {
        if (this.declaration?.property === "grid-template-areas")
          node.value = node.value.replace(/[^\s.]+/g, plainIdentifier);
        else if (this.declaration?.property === "font-family" && node.value === "Inter") return;
        else node.value = names.text(node.value);
      }
    });
    return generate(ast);
  } catch {
    // Unsupported syntax is omitted; unparsed source is never exported.
    return "";
  }
};
