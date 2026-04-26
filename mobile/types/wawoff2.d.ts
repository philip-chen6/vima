declare module "wawoff2" {
  /** Decompresses a WOFF2 buffer to raw TTF bytes. */
  export function decompress(input: Uint8Array | Buffer): Promise<Uint8Array>;
  /** Compresses a TTF buffer to WOFF2 bytes. */
  export function compress(input: Uint8Array | Buffer): Promise<Uint8Array>;
  const _default: {
    decompress: typeof decompress;
    compress: typeof compress;
  };
  export default _default;
}
