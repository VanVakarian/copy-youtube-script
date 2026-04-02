const ELEMENT_MAPPING = {
  "YTD-TRANSCRIPT-SECTION-HEADER-RENDERER": {
    textSelector: ".yt-core-attributed-string",
    format: (text) => `\n\n${text}\n\n`,
  },
  "YTD-TRANSCRIPT-SEGMENT-RENDERER": {
    textSelector: ".segment-text",
    timestampSelector: ".segment-timestamp",
    format: (text) => `${text.replace(/\s+/g, " ").trim()} `,
  },
  "TRANSCRIPT-SEGMENT-VIEW-MODEL": {
    textSelector: ".yt-core-attributed-string",
    timestampSelector: ".ytwTranscriptSegmentViewModelTimestamp",
    format: (text) => `${text.replace(/\s+/g, " ").trim()} `,
  },
};

const TRANSCRIPT_ITEM_SELECTOR = [
  "ytd-transcript-section-header-renderer",
  "ytd-transcript-segment-renderer",
  "transcript-segment-view-model",
].join(", ");

const TRANSCRIPT_BUTTON_SELECTOR = [
  "#primary-button button",
  "button[aria-label]",
  "button",
  "tp-yt-paper-item",
].join(", ");

const getElementText = (element) => {
  const config = ELEMENT_MAPPING[element.tagName];
  if (!config) return "";

  const text = element.querySelector(config.textSelector)?.textContent;
  return text ? config.format(text) : "";
};

const normalizeTimestamp = (value) => {
  const parts = value
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0 || parts.length > 3) {
    return "";
  }

  const normalizedParts = parts.map((part) => part.padStart(2, "0"));

  if (normalizedParts.length === 2) {
    normalizedParts.unshift("00");
  }

  return normalizedParts.join(":");
};

const getTimestampedText = (element) => {
  const config = ELEMENT_MAPPING[element.tagName];
  if (!config?.timestampSelector) return "";

  const text = element.querySelector(config.textSelector)?.textContent;
  const timestamp = element.querySelector(
    config.timestampSelector,
  )?.textContent;

  if (!text || !timestamp) return "";

  const normalizedText = text.replace(/\s+/g, " ").trim();
  const normalizedTimestamp = normalizeTimestamp(timestamp);

  if (!normalizedText || !normalizedTimestamp) return "";

  return `${normalizedTimestamp} ${normalizedText}`;
};

const getTranscriptItems = () => {
  return Array.from(document.querySelectorAll(TRANSCRIPT_ITEM_SELECTOR));
};

const isTranscriptButton = (element) => {
  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() ?? "";
  const text =
    element.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";

  return ariaLabel.includes("transcript") || text.includes("transcript");
};

const waitForTranscript = (timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const items = getTranscriptItems();
    if (items.length > 0) {
      resolve(items);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const updatedItems = getTranscriptItems();
      if (updatedItems.length > 0) {
        obs.disconnect();
        resolve(updatedItems);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for transcript"));
    }, timeout);
  });
};

const openTranscript = async () => {
  const buttons = Array.from(
    document.querySelectorAll(TRANSCRIPT_BUTTON_SELECTOR),
  ).filter(isTranscriptButton);

  if (buttons.length > 0) {
    buttons[0].click();
    try {
      await waitForTranscript();
      return true;
    } catch (error) {
      console.error("Failed to load transcript:", error);
      return false;
    }
  }
  return false;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findAndCopy") {
    (async () => {
      let transcriptItems = getTranscriptItems();

      if (transcriptItems.length === 0) {
        const opened = await openTranscript();
        if (!opened) {
          sendResponse({ success: false });
          return;
        }

        transcriptItems = getTranscriptItems();
      }

      if (transcriptItems.length === 0) {
        sendResponse({ success: false });
        return;
      }

      const fullText = transcriptItems.map(getElementText).join("").trim();
      const textWithTimestamps = transcriptItems
        .map(getTimestampedText)
        .filter(Boolean)
        .join("\n")
        .trim();

      const text = request.includeTimestamps ? textWithTimestamps : fullText;

      if (!text) {
        sendResponse({ success: false });
        return;
      }

      sendResponse({ success: true, text });
    })();
    return true;
  }
  return true;
});
