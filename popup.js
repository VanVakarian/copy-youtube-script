const animateButton = (className) => {
  const button = document.getElementById("copyButton");
  button.classList.add(className);
  setTimeout(() => {
    button.classList.add("transitioning");
    button.classList.remove(className);
    setTimeout(() => button.classList.remove("transitioning"), 2000);
  }, 100);
};

document.getElementById("copyButton").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.id || !tab.url?.includes("youtube.com")) return;

    chrome.tabs.sendMessage(tab.id, { action: "findAndCopy" }, (response) => {
      if (chrome.runtime.lastError) return;

      if (response?.success) {
        navigator.clipboard.writeText(response.text);
        animateButton("success");
      } else {
        animateButton("error");
      }
    });
  });
});
