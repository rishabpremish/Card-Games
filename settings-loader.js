/**
 * settings-loader.js
 * Handles loading and applying global game settings (Themes, Visual Effects).
 * Shared across all games in the suite.
 */

document.addEventListener("DOMContentLoaded", () => {
    initSettings();
});

function initSettings() {
    const themeGrid = document.getElementById("theme-grid");
    const settingsOverlay = document.getElementById("settings-overlay");
    const settingsClose = document.getElementById("settings-close");
    const settingsHintBtn = document.querySelector(".settings-hint");

    // Visual Toggles
    const scanlinesToggle = document.getElementById("scanlines-toggle");
    const vignetteToggle = document.getElementById("vignette-toggle");
    const bgAnimationToggle = document.getElementById("bg-animation-toggle");
    const highContrastToggle = document.getElementById("high-contrast-toggle");
    const reduceMotionToggle = document.getElementById("reduce-motion-toggle");
    const resetSettingsBtn = document.getElementById("reset-settings");

    // --- Load Saved Settings ---
    loadGlobalSettings();

    // --- Event Listeners ---

    // Open Settings
    if (settingsHintBtn) {
        settingsHintBtn.addEventListener("click", () => {
            if (settingsOverlay) settingsOverlay.classList.add("visible");
        });
    }

    // Close Settings
    if (settingsClose) {
        settingsClose.addEventListener("click", () => {
            if (settingsOverlay) settingsOverlay.classList.remove("visible");
        });
    }

    if (settingsOverlay) {
        settingsOverlay.addEventListener("click", (e) => {
            if (e.target === settingsOverlay) {
                settingsOverlay.classList.remove("visible");
            }
        });
    }

    // Theme Selection
    if (themeGrid) {
        themeGrid.addEventListener("click", (e) => {
            const themeBtn = e.target.closest(".theme-btn");
            if (!themeBtn) return;

            const theme = themeBtn.dataset.theme;
            applyTheme(theme);
            
            // UI Update
            themeGrid.querySelectorAll(".theme-btn").forEach(btn => btn.classList.remove("active"));
            themeBtn.classList.add("active");

            localStorage.setItem("gameTheme", theme);
        });
    }

    // Visual Toggles
    if (scanlinesToggle) {
        scanlinesToggle.addEventListener("change", () => {
            toggleBodyClass("no-scanlines", !scanlinesToggle.checked);
            localStorage.setItem("scanlines", scanlinesToggle.checked);
        });
    }

    if (vignetteToggle) {
        vignetteToggle.addEventListener("change", () => {
            toggleBodyClass("no-vignette", !vignetteToggle.checked);
            localStorage.setItem("vignette", vignetteToggle.checked);
        });
    }

    if (bgAnimationToggle) {
        bgAnimationToggle.addEventListener("change", () => {
            toggleBodyClass("no-bg-animation", !bgAnimationToggle.checked);
            localStorage.setItem("bgAnimation", bgAnimationToggle.checked);
        });
    }

    if (highContrastToggle) {
        highContrastToggle.addEventListener("change", () => {
            toggleBodyClass("high-contrast", highContrastToggle.checked);
            localStorage.setItem("highContrast", highContrastToggle.checked);
        });
    }

    if (reduceMotionToggle) {
        reduceMotionToggle.addEventListener("change", () => {
            toggleBodyClass("reduce-motion", reduceMotionToggle.checked);
            localStorage.setItem("reduceMotion", reduceMotionToggle.checked);
        });
    }

    // Reset
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener("click", () => {
            if (confirm("Reset all settings to default?")) {
                const wallet = localStorage.getItem('gameWallet'); // Preserve wallet
                localStorage.clear();
                if (wallet) localStorage.setItem('gameWallet', wallet);
                location.reload();
            }
        });
    }

    // Keyboard Shortcut (Ctrl+/)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "/") {
            e.preventDefault();
            if (settingsOverlay) settingsOverlay.classList.toggle("visible");
        }
        if (e.key === "Escape" && settingsOverlay && settingsOverlay.classList.contains("visible")) {
            settingsOverlay.classList.remove("visible");
        }
    });
}

function loadGlobalSettings() {
    // Theme
    const savedTheme = localStorage.getItem("gameTheme");
    if (savedTheme && savedTheme !== "default") {
        applyTheme(savedTheme);
        // Update UI if on settings page
        const btn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
        if (btn) {
            document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        }
    }

    // Toggles
    loadToggle("scanlines", "scanlines-toggle", "no-scanlines", true, true); // Logic inverted for 'no-' classes
    loadToggle("vignette", "vignette-toggle", "no-vignette", true, true);
    loadToggle("bgAnimation", "bg-animation-toggle", "no-bg-animation", true, true);
    loadToggle("highContrast", "high-contrast-toggle", "high-contrast", false, false);
    loadToggle("reduceMotion", "reduce-motion-toggle", "reduce-motion", false, false);
}

function applyTheme(theme) {
    // Remove existing theme classes
    const classes = document.body.className.split(" ").filter(c => !c.startsWith("theme-"));
    document.body.className = classes.join(" ");
    
    if (theme !== "default") {
        document.body.classList.add(`theme-${theme}`);
    }
}

function toggleBodyClass(className, shouldAdd) {
    if (shouldAdd) document.body.classList.add(className);
    else document.body.classList.remove(className);
}

function loadToggle(storageKey, elementId, bodyClass, defaultValue, isInvertedLogic) {
    const saved = localStorage.getItem(storageKey);
    const element = document.getElementById(elementId);
    
    let isChecked = defaultValue;
    if (saved !== null) isChecked = saved === "true";

    if (element) element.checked = isChecked;

    // Apply body class
    // If isInvertedLogic (e.g. no-scanlines), checked=true means NO class. checked=false means ADD class.
    // If normal (e.g. high-contrast), checked=true means ADD class.
    
    if (isInvertedLogic) {
        toggleBodyClass(bodyClass, !isChecked);
    } else {
        toggleBodyClass(bodyClass, isChecked);
    }
}
