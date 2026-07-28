declare module "tr46" {
  interface ToAsciiOptions {
    checkHyphens?: boolean;
    checkBidi?: boolean;
    checkJoiners?: boolean;
    useSTD3ASCIIRules?: boolean;
    transitionalProcessing?: boolean;
    verifyDNSLength?: boolean;
    ignoreInvalidPunycode?: boolean;
  }

  export function toASCII(value: string, options?: ToAsciiOptions): string | null;
}
