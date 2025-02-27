document.getElementById("copyButton").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].id) return;

    if (!tabs[0].url?.includes("youtube.com")) {
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "findAndCopy" },
      (response) => {
        if (chrome.runtime.lastError) return;

        if (response?.success) {
          navigator.clipboard.writeText(response.text);
          const button = document.getElementById("copyButton");
          button.classList.add("success");
          setTimeout(() => {
            button.classList.add("transitioning");
            button.classList.remove("success");
            setTimeout(() => {
              button.classList.remove("transitioning");
            }, 2000);
          }, 100);
        }
      }
    );
  });
});
