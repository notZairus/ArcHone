import blessed from "blessed";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import clipboardy from "clipboardy";
import {
  ARCHONE_DIR,
  CONFIG_PATH,
  LATEST_ANALYSIS_PATH,
} from "../constants.js";
import { validateApiKey, wait } from "../utils/helpers.js";
import { log, readClipboard } from "../utils/helpers.js";

export default async ({ screen }) => {
  // Global exit ONLY on Ctrl+C
  screen.key(["C-c"], () => {
    screen.destroy();
    console.log(chalk.red("\nSetup cancelled. Run 'archone init' anytime."));
    process.exit(0);
  });

  // Helper Box
  const createBox = (title, height = 14) => {
    return blessed.box({
      parent: screen,
      top: "center",
      left: "center",
      width: "70%",
      height: height,
      border: { type: "line" },
      style: { border: { fg: "cyan" } },
      label: ` ${chalk.bold(title)} `,
    });
  };

  // Helper for Yes/No Prompts
  const promptConfirm = (title, content, height = 12) => {
    return new Promise((resolve) => {
      const box = createBox(title, height);

      blessed.text({
        parent: box,
        content: content,
        top: 1,
        left: 2,
      });

      screen.render();

      const keyHandler = (ch, key) => {
        const name = key ? key.name : ch ? ch.toLowerCase() : "";
        if (name === "y") {
          cleanup(true);
        } else if (name === "n" || name === "escape") {
          cleanup(false);
        }
      };

      const cleanup = (result) => {
        screen.removeListener("keypress", keyHandler);
        box.detach();
        screen.render();
        resolve(result);
      };

      screen.on("keypress", keyHandler);
    });
  };

  // Step 1: Proceed Confirmation
  const promptProceed = () => {
    const setupGuide = [
      `${chalk.bold("Welcome to ArcHone!")}`,
      "Let's get you set up with the ArcHone CLI on this machine.",
      "",
      `${chalk.bold("What this setup does:")}`,
      "- Creates ~/.archone in your home directory",
      "- Creates config.json for configuration data",
      "- Creates last_analysis.json for results",
      "",
      `Install Location: ${chalk.yellow(ARCHONE_DIR)}`,
      "",
      `${chalk.cyan("Proceed with initialization now? [Y/N]")}`,
    ].join("\n");

    return promptConfirm("Initialization", setupGuide, 16);
  };

  // Step 2: Confirm AI
  const promptAiEnable = () => {
    const text = [
      "Enable AI features for enhanced analysis?",
      "",
      `${chalk.cyan("Press [Y] for Yes, [N] for No")}`,
    ].join("\n");

    return promptConfirm("AI Configuration", text, 8);
  };

  // Step 3: Provider Selection
  const promptProvider = () => {
    return new Promise((resolve) => {
      const box = createBox("Select AI Provider", 10);

      blessed.text({
        parent: box,
        content: "Select an AI provider (Use Up/Down Arrows & Enter):",
        top: 1,
        left: 2,
      });

      const list = blessed.list({
        parent: box,
        top: 3,
        left: 2,
        width: "90%",
        height: 4,
        keys: true,
        vi: true,
        mouse: true,
        style: {
          selected: { bg: "blue", fg: "white" },
        },
        items: ["OpenAI", "Google Gemini"],
      });

      list.focus();
      screen.render();

      list.once("select", (item, index) => {
        box.detach();
        screen.render();
        resolve(index === 0 ? "openai" : "gemini");
      });
    });
  };

  // Step 4: API Key Input with Working Paste Button & Feedback
  const promptApiKey = (provider, errorMsg = "") => {
    return new Promise((resolve) => {
      const box = createBox(`API Key - ${provider}`, 15);

      let currentTop = 1;
      if (errorMsg) {
        blessed.text({
          parent: box,
          content: chalk.red(errorMsg),
          top: currentTop,
          left: 2,
        });
        currentTop += 2;
      }

      blessed.text({
        parent: box,
        content: `Enter your ${provider} API key:\n(Type manually or click the Paste button below)`,
        top: currentTop,
        left: 2,
      });

      // API Key Display Box
      const inputDisplay = blessed.box({
        parent: box,
        top: currentTop + 3,
        left: 2,
        height: 1,
        width: "90%",
        style: {
          fg: "white",
          bg: "black",
        },
        content: "_",
      });

      // Status message box for feedback (e.g. "Pasted!" or "Clipboard error")
      const statusText = blessed.text({
        parent: box,
        top: currentTop + 5,
        left: 2,
        content: "",
      });

      // Interactive Paste Button
      const pasteBtn = blessed.button({
        parent: box,
        top: currentTop + 7,
        left: 2,
        width: 24,
        height: 3,
        mouse: true,
        keys: true,
        border: { type: "line" },
        content: "Paste Clipboard",
        align: "center",
      });

      // Interactive Submit Button
      const submitBtn = blessed.button({
        parent: box,
        top: currentTop + 7,
        left: 28,
        width: 14,
        height: 3,
        mouse: true,
        keys: true,
        border: { type: "line" },
        content: "Submit",
        align: "center",
      });

      let inputValue = "";

      const updateDisplay = () => {
        const masked = "*".repeat(inputValue.length);
        inputDisplay.setContent(masked + "_");
        screen.render();
      };

      // Helper function to paste text safely
      const doPaste = async () => {
        try {
          const text = readClipboard();
          if (text && text.trim().length > 0) {
            inputValue = text.trim();
            updateDisplay();
            statusText.setContent(
              chalk.green("✓ Clipboard pasted successfully!"),
            );
          } else {
            statusText.setContent(chalk.yellow("⚠ Clipboard is empty."));
          }
        } catch (err) {
          statusText.setContent(
            chalk.red(
              "✗ Cannot read clipboard (check system xclip/wl-clipboard).",
            ),
          );
        }
        screen.render();
      };

      // Listen for both 'press' (keyboard Enter/Space) and 'click' (mouse)
      pasteBtn.on("press", doPaste);
      pasteBtn.on("click", doPaste);

      const doSubmit = () => {
        cleanup(inputValue);
      };

      submitBtn.on("press", doSubmit);
      submitBtn.on("click", doSubmit);

      // Focus navigation array
      const focusables = [pasteBtn, submitBtn];
      let focusIndex = 0;
      focusables[focusIndex].focus();

      const keyHandler = (ch, key) => {
        if (!key) {
          if (ch && ch >= " " && ch !== "\x7f") {
            inputValue += ch;
            updateDisplay();
          }
          return;
        }

        // Cycle focus with Tab or Arrow keys
        if (key.name === "tab" || key.name === "right" || key.name === "down") {
          focusIndex = (focusIndex + 1) % focusables.length;
          focusables[focusIndex].focus();
          screen.render();
          return;
        }

        if (key.name === "left" || key.name === "up") {
          focusIndex = (focusIndex - 1 + focusables.length) % focusables.length;
          focusables[focusIndex].focus();
          screen.render();
          return;
        }

        // Enter key handling
        if (key.name === "enter" || key.name === "return") {
          if (screen.focused === pasteBtn) {
            doPaste();
          } else if (screen.focused === submitBtn) {
            doSubmit();
          } else {
            doSubmit();
          }
          return;
        }

        // Handle Backspace
        if (key.name === "backspace") {
          inputValue = inputValue.slice(0, -1);
          updateDisplay();
          return;
        }

        // Standard character typing
        if (ch && ch >= " " && ch !== "\x7f" && !key.ctrl && !key.meta) {
          inputValue += ch;
          updateDisplay();
        }
      };

      const cleanup = (result) => {
        screen.removeListener("keypress", keyHandler);
        box.detach();
        screen.render();
        resolve(result.trim());
      };

      screen.on("keypress", keyHandler);
      screen.render();
    });
  };

  // --- Flow Execution ---

  if (fs.existsSync(ARCHONE_DIR)) {
    const box = createBox("Already Initialized", 7);
    blessed.text({
      parent: box,
      content: `${chalk.yellow("ArcHone is already initialized.")}\n\nYou can continue using the CLI normally.`,
      top: 1,
      left: 2,
    });

    screen.render();
    setTimeout(() => {
      screen.destroy();
      process.exit(0);
    }, 3000);
    return;
  }

  const allowed = await promptProceed();

  if (!allowed) {
    console.clear();
    process.exit(0);
  }

  const aiEnabled = await promptAiEnable();
  const aiConfig = { enabled: aiEnabled };

  if (aiEnabled) {
    aiConfig.provider = await promptProvider();

    let isValid = false;
    let errorMsg = "";

    while (!isValid) {
      aiConfig.apiKey = await promptApiKey(aiConfig.provider, errorMsg);

      if (!aiConfig.apiKey) {
        errorMsg = "API key cannot be empty. Please try again.";
        continue;
      }

      const loaderBox = createBox("Validating Key", 5);
      blessed.text({
        parent: loaderBox,
        content: "Validating API key...",
        top: 1,
        left: 2,
      });
      screen.render();

      isValid = await validateApiKey(aiConfig.provider, aiConfig.apiKey);
      loaderBox.detach();
      screen.render();

      if (!isValid) {
        errorMsg = "Invalid API key. Please try again.";
      }
    }
  }

  // Save Files
  try {
    fs.mkdirSync(ARCHONE_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ai: aiConfig }, null, 2));
    fs.writeFileSync(LATEST_ANALYSIS_PATH, JSON.stringify({}, null, 2));

    const successBox = createBox("Setup Successful", 7);
    blessed.text({
      parent: successBox,
      content: `${chalk.green("Initialization complete.")}\n\nArcHone is ready on this machine.`,
      top: 1,
      left: 2,
    });
    // setTimeout(() => {
    //   screen.destroy();
    //   process.exit(0);
    // }, 3000);

    screen.render();
    await wait(3000);
    process.exit(0);
  } catch (error) {
    screen.destroy();
    process.exit(0);
  }
};
