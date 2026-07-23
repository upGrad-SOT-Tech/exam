import { clipboard } from "electron";

/**
 * Fully empty the OS clipboard. Copying a blank space does NOT clear it —
 * pasteboard formats remain — so we explicitly clear and overwrite with empty text.
 */
export function clearSystemClipboard(): { cleared: boolean; remainingFormats: string[] } {
  try {
    clipboard.clear();
  } catch {
    /* ignore */
  }

  try {
    clipboard.write({ text: "" });
  } catch {
    try {
      clipboard.writeText("");
    } catch {
      /* ignore */
    }
  }

  try {
    clipboard.clear();
  } catch {
    /* ignore */
  }

  const remainingFormats = clipboard.availableFormats();
  const remainingText = clipboard.readText();
  // Treat whitespace-only text with no other formats as empty.
  const cleared =
    remainingFormats.length === 0 ||
    (remainingFormats.every((format) => format.startsWith("text/")) &&
      remainingText.trim().length === 0);

  if (cleared && remainingFormats.length > 0) {
    // Final sweep if only empty text formats remain.
    try {
      clipboard.clear();
    } catch {
      /* ignore */
    }
  }

  const formatsAfter = clipboard.availableFormats();
  const textAfter = clipboard.readText();
  const fullyCleared = formatsAfter.length === 0 && textAfter.trim().length === 0;

  return {
    cleared: fullyCleared || cleared,
    remainingFormats: fullyCleared ? [] : formatsAfter,
  };
}

export function isClipboardEmpty(): boolean {
  const formats = clipboard.availableFormats();
  const text = clipboard.readText();
  if (text.trim().length > 0) return false;
  // Empty / whitespace-only text pasteboard with no rich formats counts as empty.
  if (formats.length === 0) return true;
  return formats.every((format) => format.startsWith("text/")) && text.trim().length === 0;
}
