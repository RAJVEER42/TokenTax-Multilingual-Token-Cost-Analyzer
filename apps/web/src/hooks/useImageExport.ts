/**
 * useImageExport — PNG export from a DOM element.
 *
 * Uses html-to-image to render a high-res PNG of any element.
 * Returns an async function that triggers the download.
 */

import { useCallback, useState } from "react";
import { toPng } from "html-to-image";

interface ExportState {
  readonly exporting: boolean;
  readonly error: string | null;
}

export function useImageExport() {
  const [state, setState] = useState<ExportState>({
    exporting: false,
    error: null,
  });

  const exportAsImage = useCallback(
    async (
      element: HTMLElement | null,
      filename: string = "tokentax-analysis.png",
    ): Promise<void> => {
      if (!element) {
        setState({ exporting: false, error: "No element to export" });
        return;
      }

      setState({ exporting: true, error: null });

      try {
        const dataUrl = await toPng(element, {
          quality: 1.0,
          pixelRatio: 2, // High-res (2× for retina)
          backgroundColor: "#080d1a", // Match app background
        });

        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();

        setState({ exporting: false, error: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setState({ exporting: false, error: message });
      }
    },
    [],
  );

  return { ...state, exportAsImage };
}
