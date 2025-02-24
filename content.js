chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findAndCopy") {
    const container = document.getElementById("segments-container");
    if (!container) {
      sendResponse({ success: false });
      return;
    }

    let fullText = "";

    const elements = container.children;
    for (const element of elements) {
      if (element.tagName === "YTD-TRANSCRIPT-SECTION-HEADER-RENDERER") {
        const headerText = element.querySelector(
          ".yt-core-attributed-string"
        )?.textContent;
        if (headerText) {
          fullText += "\n\n" + headerText + "\n\n";
        }
      } else if (element.tagName === "YTD-TRANSCRIPT-SEGMENT-RENDERER") {
        const segmentText = element.querySelector(".segment-text")?.textContent;
        if (segmentText) {
          fullText += segmentText.replace(/\s+/g, " ").trim() + " ";
        }
      }
    }

    sendResponse({ success: true, text: fullText.trim() });
  }

  return true;
});
