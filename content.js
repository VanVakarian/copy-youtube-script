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

const waitForElement = (selector, timeout = 1000) => {
  return new Promise((resolve, reject) => {
    const element = document.getElementById(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.getElementById(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for element"));
    }, timeout);
  });
};

const openTranscript = async () => {
  const buttons = document.querySelectorAll(
    '#primary-button button[aria-label="Show transcript"]'
  );
  if (buttons.length > 0) {
    buttons[0].click();
    try {
      await waitForElement("segments-container");
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
      const container = document.getElementById("segments-container");

      if (!container) {
        const opened = await openTranscript();
        if (!opened) {
          sendResponse({ success: false });
          return;
        }
      }

      const updatedContainer = document.getElementById("segments-container");
      if (!updatedContainer) {
        sendResponse({ success: false });
        return;
      }

      const fullText = Array.from(updatedContainer.children)
        .map(getElementText)
        .join("")
        .trim();

      sendResponse({ success: true, text: fullText });
    })();
    return true;
  }
  return true;
});
