import type { ErrorMapCtx, z, ZodTooBigIssue, ZodTooSmallIssue } from "zod";
import { ZodIssueCode } from "zod";

import type { TranslationFunction, TranslationObject } from "@homarr/translation";

export const zodErrorMap = <TFunction extends TranslationFunction>(t: TFunction) => {
  return (issue: z.ZodIssueOptionalMessage, ctx: ErrorMapCtx) => {
    const error = handleZodError(issue, ctx);
    if ("message" in error && error.message) {
      return {
        message: error.message,
      };
    }
    return {
      // use never to make ts happy
      message: t(error.key ? `common.zod.${error.key}` : "common.zod.errors.default", (error.params ?? {}) as never),
    };
  };
};

const handleStringError = (issue: z.ZodInvalidStringIssue) => {
  if (issue.validation === "email") {
    return {
      key: "errors.string.invalidEmail",
    } as const;
  }

  if (typeof issue.validation === "object") {
    if ("startsWith" in issue.validation) {
      return {
        key: "errors.string.startsWith",
        params: {
          startsWith: issue.validation.startsWith,
        },
      } as const;
    } else if ("endsWith" in issue.validation) {
      return {
        key: "errors.string.endsWith",
        params: {
          endsWith: issue.validation.endsWith,
        },
      } as const;
    }

    return {
      key: "errors.string.includes",
      params: {
        includes: issue.validation.includes,
      },
    } as const;
  }

  return {
    message: issue.message,
  };
};

const handleTooSmallError = (issue: ZodTooSmallIssue) => {
  if (issue.type !== "string" && issue.type !== "number") {
    return {
      message: issue.message,
    };
  }

  if (issue.type === "string" && issue.minimum === 1) {
    return {
      key: "errors.required",
    } as const;
  }

  return {
    key: `errors.tooSmall.${issue.type}`,
    params: {
      minimum: issue.minimum,
      count: issue.minimum,
    },
  } as const;
};

const handleTooBigError = (issue: ZodTooBigIssue) => {
  if (issue.type !== "string" && issue.type !== "number") {
    return {
      message: issue.message,
    };
  }

  return {
    key: `errors.tooBig.${issue.type}`,
    params: {
      maximum: issue.maximum,
      count: issue.maximum,
    },
  } as const;
};

const handleZodError = (issue: z.ZodIssueOptionalMessage, ctx: ErrorMapCtx) => {
  if (ctx.defaultError === "Required") {
    return {
      key: "errors.required",
      params: {},
    } as const;
  }

  if (issue.code === ZodIssueCode.invalid_string) {
    return handleStringError(issue);
  }
  if (issue.code === ZodIssueCode.too_small) {
    return handleTooSmallError(issue);
  }
  if (issue.code === ZodIssueCode.too_big) {
    return handleTooBigError(issue);
  }
  if (issue.code === ZodIssueCode.invalid_type && (ctx.data === "" || issue.received === "null")) {
    return {
      key: "errors.required",
      params: {},
    } as const;
  }
  if (issue.code === ZodIssueCode.custom && issue.params?.i18n) {
    const { i18n } = issue.params as CustomErrorParams<CustomErrorKey>;
    return {
      key: `errors.custom.${i18n.key}`,
      params: i18n.params,
    } as const;
  }

  return {
    message: issue.message,
  };
};

type CustomErrorKey = keyof TranslationObject["common"]["zod"]["errors"]["custom"];

export interface CustomErrorParams<TKey extends CustomErrorKey> {
  i18n: {
    key: TKey;
    params: Record<string, unknown>;
  };
}

export const createCustomErrorParams = <TKey extends CustomErrorKey>(
  i18n: keyof CustomErrorParams<TKey>["i18n"]["params"] extends never
    ? CustomErrorParams<TKey>["i18n"]["key"]
    : CustomErrorParams<TKey>["i18n"],
) => (typeof i18n === "string" ? { i18n: { key: i18n, params: {} } } : { i18n });
