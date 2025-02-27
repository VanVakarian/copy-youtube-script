const ELEMENT_MAPPING = {
  "YTD-TRANSCRIPT-SECTION-HEADER-RENDERER": {
    selector: ".yt-core-attributed-string",
    format: (text) => `\n\n${text}\n\n`,
  },
  "YTD-TRANSCRIPT-SEGMENT-RENDERER": {
    selector: ".segment-text",
    format: (text) => `${text.replace(/\s+/g, " ").trim()} `,
  },
};

const getElementText = (element) => {
  const config = ELEMENT_MAPPING[element.tagName];
  if (!config) return "";

  const text = element.querySelector(config.selector)?.textContent;
  return text ? config.format(text) : "";
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findAndCopy") {
    const container = document.getElementById("segments-container");
    if (!container) {
      sendResponse({ success: false });
      return true;
    }

    const fullText = Array.from(container.children)
      .map(getElementText)
      .join("")
      .trim();

    sendResponse({ success: true, text: fullText });
  }
  return true;
});
