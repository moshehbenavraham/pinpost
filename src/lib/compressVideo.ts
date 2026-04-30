/**
 * Preserve the original uploaded video for draft playback.
 * Browser-side re-encoding was shortening duration and stripping audio,
 * so we currently keep the source file intact for reliable preview + save.
 */

export interface CompressResult {
  file: File;
  url: string;
  originalUrl: string;
  skipped: boolean;
}

export async function compressVideo(
  source: File,
  onProgress?: (pct: number) => void,
): Promise<CompressResult> {
  const originalUrl = URL.createObjectURL(source);

  if (onProgress) {
    onProgress(100);
  }

  return {
    file: source,
    url: originalUrl,
    originalUrl,
    skipped: true,
  };
}
