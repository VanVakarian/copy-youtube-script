const PageMode = {
  Video: "video",
  SavedStream: "savedStream",
};

const VIDEO_ELEMENT_MAPPING = {
  "YTD-TRANSCRIPT-SECTION-HEADER-RENDERER": {
    textSelectors: [".yt-core-attributed-string"],
    format: (text) => `\n\n${text}\n\n`,
  },
  "YTD-TRANSCRIPT-SEGMENT-RENDERER": {
    textSelectors: [".segment-text"],
    timestampSelector: ".segment-timestamp",
    format: (text) => `${text.replace(/\s+/g, " ").trim()} `,
  },
  "TRANSCRIPT-SEGMENT-VIEW-MODEL": {
    textSelectors: [".yt-core-attributed-string"],
    timestampSelector: ".ytwTranscriptSegmentViewModelTimestamp",
    format: (text) => `${text.replace(/\s+/g, " ").trim()} `,
  },
};

const SAVED_STREAM_ELEMENT_MAPPING = {
  ...VIDEO_ELEMENT_MAPPING,
  "TRANSCRIPT-SEGMENT-VIEW-MODEL": {
    textSelectors: [".ytAttributedStringHost", ".yt-core-attributed-string"],
    timestampSelector: ".ytwTranscriptSegmentViewModelTimestamp",
    format: (text) => `${text.replace(/\s+/g, " ").trim()} `,
  },
};

const ELEMENT_MAPPING_BY_MODE = {
  [PageMode.Video]: VIDEO_ELEMENT_MAPPING,
  [PageMode.SavedStream]: SAVED_STREAM_ELEMENT_MAPPING,
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

const SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR =
  "ytd-video-description-transcript-section-renderer";

const SAVED_STREAM_TRANSCRIPT_BUTTON_SELECTOR = [
  `${SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR} #primary-button button`,
  `${SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR} button[aria-label]`,
  `${SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR} button`,
  `${SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR} [role=\"button\"]`,
].join(", ");

const SAVED_STREAM_DESCRIPTION_EXPAND_SELECTOR = [
  '#description-inline-expander:not([is-expanded]) tp-yt-paper-button[role="button"]',
  "#description-inline-expander:not([is-expanded]) button",
  '#description-inline-expander:not([is-expanded]) [role="button"]',
].join(", ");

const getElementConfig = (mode, element) => {
  return ELEMENT_MAPPING_BY_MODE[mode]?.[element.tagName] ?? "";
};

const getTextContentBySelectors = (element, selectors = []) => {
  for (const selector of selectors) {
    const text = element.querySelector(selector)?.textContent;
    if (text) {
      return text;
    }
  }

  return "";
};

const getElementText = (element, mode) => {
  const config = getElementConfig(mode, element);
  if (!config) return "";

  const text = getTextContentBySelectors(element, config.textSelectors);
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

const getTimestampedText = (element, mode) => {
  const config = getElementConfig(mode, element);
  if (!config?.timestampSelector) return "";

  const text = getTextContentBySelectors(element, config.textSelectors);
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

const isSavedStreamPage = () => {
  const infoText =
    document
      .querySelector("ytd-watch-info-text #info")
      ?.textContent?.toLowerCase() ?? "";

  return (
    infoText.includes("streamed live") ||
    Boolean(document.querySelector(SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR))
  );
};

const getPreferredModes = () => {
  if (isSavedStreamPage()) {
    return [PageMode.SavedStream, PageMode.Video];
  }

  return [PageMode.Video, PageMode.SavedStream];
};

const isTranscriptButton = (element) => {
  const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() ?? "";
  const text =
    element.textContent?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";

  return ariaLabel.includes("transcript") || text.includes("transcript");
};

const waitForSelector = (selector, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const updatedElement = document.querySelector(selector);
      if (updatedElement) {
        obs.disconnect();
        resolve(updatedElement);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for selector: ${selector}`));
    }, timeout);
  });
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
      attributes: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for transcript"));
    }, timeout);
  });
};

const findTranscriptButtons = (selector) => {
  return Array.from(document.querySelectorAll(selector)).filter(
    isTranscriptButton,
  );
};

const openVideoTranscript = async () => {
  const buttons = findTranscriptButtons(TRANSCRIPT_BUTTON_SELECTOR);

  if (buttons.length === 0) {
    return false;
  }

  buttons[0].click();

  try {
    await waitForTranscript();
    return true;
  } catch (error) {
    console.error("Failed to load transcript:", error);
    return false;
  }
};

const expandSavedStreamDescription = async () => {
  if (document.querySelector(SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR)) {
    return true;
  }

  const expandButton = document.querySelector(
    SAVED_STREAM_DESCRIPTION_EXPAND_SELECTOR,
  );

  if (!expandButton) {
    return false;
  }

  expandButton.click();

  try {
    await waitForSelector(SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR, 2000);
    return true;
  } catch (error) {
    console.error("Failed to expand stream description:", error);
    return false;
  }
};

const openSavedStreamTranscript = async () => {
  const hasTranscriptSection = Boolean(
    document.querySelector(SAVED_STREAM_TRANSCRIPT_SECTION_SELECTOR),
  );

  if (!hasTranscriptSection) {
    const expanded = await expandSavedStreamDescription();
    if (!expanded) {
      return false;
    }
  }

  const buttons = findTranscriptButtons(
    SAVED_STREAM_TRANSCRIPT_BUTTON_SELECTOR,
  );
  if (buttons.length === 0) {
    return false;
  }

  buttons[0].click();

  try {
    await waitForTranscript();
    return true;
  } catch (error) {
    console.error("Failed to load saved stream transcript:", error);
    return false;
  }
};

const openTranscript = async (modes) => {
  const openers = {
    [PageMode.Video]: openVideoTranscript,
    [PageMode.SavedStream]: openSavedStreamTranscript,
  };

  for (const mode of modes) {
    const opened = await openers[mode]();
    if (opened) {
      return true;
    }
  }

  return false;
};

const buildTranscriptText = (transcriptItems, includeTimestamps, modes) => {
  for (const mode of modes) {
    const text = includeTimestamps
      ? transcriptItems
          .map((item) => getTimestampedText(item, mode))
          .filter(Boolean)
          .join("\n")
          .trim()
      : transcriptItems
          .map((item) => getElementText(item, mode))
          .join("")
          .trim();

    if (text) {
      return text;
    }
  }

  return "";
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findAndCopy") {
    (async () => {
      const preferredModes = getPreferredModes();
      let transcriptItems = getTranscriptItems();

      if (transcriptItems.length === 0) {
        const opened = await openTranscript(preferredModes);
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

      const text = buildTranscriptText(
        transcriptItems,
        request.includeTimestamps,
        preferredModes,
      );

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
