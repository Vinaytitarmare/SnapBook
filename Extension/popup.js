// Removed unused Supabase auth for single-user mode

document.addEventListener("DOMContentLoaded", async () => {
  // --- Get All HTML Elements ---
  const verifyingSection = document.getElementById("verifyingSection");
  const authSection = document.getElementById("authSection");
  const mainSection = document.getElementById("mainSection");
  const authStatus = document.getElementById("authStatus");
  const appStatus = document.getElementById("appStatus");
  const captureBtn = document.getElementById("captureBtn");
  const dashboardBtn = document.getElementById("dashboardBtn");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const signInBtn = document.getElementById("signInBtn");
  const signUpBtn = document.getElementById("signUpBtn");

  // --- UI Helper Functions ---
  function showAuth() {
    verifyingSection.style.display = "none";
    authSection.style.display = "flex";
    mainSection.style.display = "none";
    
    // --- This was already correct ---
    chrome.storage.local.remove('supabase_auth_token');
    
    authStatus.textContent = "";
    authStatus.style.color = "#94a3b8";
    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";
  }

  function showMain() { 
    verifyingSection.style.display = "none";
    authSection.style.display = "none";
    mainSection.style.display = "flex";
    
    // Reset main app status to ready
    setAppStatus("Ready", "#94a3b8");
  }

  function setAuthStatus(msg, isError = false) {
      authStatus.textContent = msg;
      authStatus.style.color = isError ? "#ff6b6b" : "#e4e7eb";
  }

  function setAppStatus(msg, color = "#94a3b8") {
      appStatus.textContent = msg;
      appStatus.style.color = color;
  }

  // --- 1. Initial Session Check (Bypassed for Single User) ---
  showMain();

  // --- 2. Event Listeners ---

  // Capture Button
  captureBtn.addEventListener("click", async () => {
    try {
      captureBtn.disabled = true; // Disable to prevent double-clicks
      setAppStatus("Capturing...", "#22d3ee"); // Blue status

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url || !tab.url.startsWith("http")) {
        throw new Error("Cannot capture this type of page.");
      }

      await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "Readability.js",
            "platformDetector.js",
            "baseExtractor.js",
            "extractors/twitterExtractor.js",
            "extractors/instagramExtractor.js",
            "extractors/youtubeExtractor.js",
            "extractors/tiktokExtractor.js",
            "extractors/linkedinExtractor.js",
            "extractors/facebookExtractor.js",
            "extractors/redditExtractor.js",
            "extractors/articleExtractor.js",
            "content.js"
          ]
      });

      setAppStatus("✅ Capture Sent!", "#4ade80"); // Green status
      
      // Reset after 2 seconds
      setTimeout(() => {
         setAppStatus("Ready", "#94a3b8");
         captureBtn.disabled = false;
      }, 2000);

    } catch (err) {
      console.error(err);
      setAppStatus("❌ Cannot Capture This", "#ff6b6b"); // Red status
      // Reset after 2 seconds
      setTimeout(() => {
        setAppStatus("Ready", "#94a3b8");
        captureBtn.disabled = false;
      }, 2000);
    }
  });

  // Dashboard Button
  dashboardBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://snapmind.onrender.com/" });
  });

});