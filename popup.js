const animateButton = (button, className) => {
  button.classList.add(className);
  setTimeout(() => {
    button.classList.add("transitioning");
    button.classList.remove(className);
    setTimeout(() => button.classList.remove("transitioning"), 2000);
  }, 100);
};

const copyTranscript = (buttonId, includeTimestamps) => {
  const button = document.getElementById(buttonId);

  button.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];
      if (!tab?.id || !tab.url?.includes("youtube.com")) return;

      chrome.tabs.sendMessage(
        tab.id,
        { action: "findAndCopy", includeTimestamps },
        (response) => {
          if (chrome.runtime.lastError) {
            animateButton(button, "error");
            return;
          }

          if (!response?.success) {
            animateButton(button, "error");
            return;
          }

          navigator.clipboard
            .writeText(response.text)
            .then(() => animateButton(button, "success"))
            .catch(() => animateButton(button, "error"));
        },
      );
    });
  });
};

copyTranscript("copyTextButton", false);
copyTranscript("copyTimestampsButton", true);
