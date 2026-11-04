import Quill from 'quill';

// Register font whitelist before creating the Quill instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var Font = Quill.import('formats/font');
Font.whitelist = ['sans-serif', 'serif', 'monospace', 'arial', 'times-new-roman', 'comic-sans'];
Quill.register(Font, true);
export class CustomRichTextField {
  // Simple HTML validation using DOMParser
  isValidHTML(html) {
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      // If parsererror is present, HTML is invalid
      if (doc.querySelector('parsererror')) {
        return false;
      }
      return true;
    } catch (_a) {
      return false;
    }
  }
  showError(message) {
    if (!this.container) return;
    if (!this.errorDiv) {
      this.errorDiv = document.createElement('div');
      this.errorDiv.style.color = 'red';
      this.errorDiv.style.margin = '8px 0';
      this.container.insertBefore(this.errorDiv, this.container.firstChild);
    }
    this.errorDiv.textContent = message;
  }
  clearError() {
    if (this.errorDiv && this.container) {
      this.container.removeChild(this.errorDiv);
      this.errorDiv = undefined;
    }
  }
  constructor() {
    this.lastToolbarConfig = "";
    this._lastHeadingLevelsRaw = "";
    this.htmlText = "";
    this.lastDefaultValue = "";
    this.lastResetKey = 0;
    this.isProgrammaticUpdate = false;
    this._lastTogglesConfig = "";
    // Empty
  }
  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
   */
  init(context, notifyOutputChanged, state, container) {
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;
    this.lastResetKey = context.parameters.ResetKey?.raw ?? 0;
    this.shouldRebuildToolbar(context);
    this.createOrUpdateQuill(context);
  }
  applyBorderColors(element, context, prefix) {
    var defaultColor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "#ccc";
    var _a, _b, _c, _d, _e;
    var generalBorderColor = (_a = context.parameters["".concat(prefix, "BorderColor")]) === null || _a === void 0 ? void 0 : _a.raw;
    var topColor = ((_b = context.parameters["".concat(prefix, "BorderTopColor")]) === null || _b === void 0 ? void 0 : _b.raw) || generalBorderColor || defaultColor;
    var rightColor = ((_c = context.parameters["".concat(prefix, "BorderRightColor")]) === null || _c === void 0 ? void 0 : _c.raw) || generalBorderColor || defaultColor;
    var bottomColor = ((_d = context.parameters["".concat(prefix, "BorderBottomColor")]) === null || _d === void 0 ? void 0 : _d.raw) || generalBorderColor || defaultColor;
    var leftColor = ((_e = context.parameters["".concat(prefix, "BorderLeftColor")]) === null || _e === void 0 ? void 0 : _e.raw) || generalBorderColor || defaultColor;
    element.style.borderTop = "1px solid ".concat(topColor);
    element.style.borderRight = "1px solid ".concat(rightColor);
    element.style.borderBottom = "1px solid ".concat(bottomColor);
    element.style.borderLeft = "1px solid ".concat(leftColor);
  }
  createOrUpdateQuill(context) {
    var _a;
    // Changing toolbar options must not discard edits or consume a reset request.
    var existingValue = this.quill ? this.htmlText : undefined;
    // Remove old editor if exists
    if (this.quill) {
      var toolbarEl = this.container?.querySelector('.ql-toolbar');
      if (toolbarEl) this.cleanupColorMonitoring(toolbarEl);
      this.quill.off('text-change');
      this.quill = undefined;
      if (this.container) {
        this.container.innerHTML = "";
      }
    }
    if (!this.container) return;
    // Create editor div directly in the main container
    var editorDiv = document.createElement("div");
    editorDiv.id = "quill-editor";
    editorDiv.style.width = "100%";
    editorDiv.style.height = "100%";
    editorDiv.style.boxSizing = "border-box";
    // Apply individual border colors to the Quill editor div
    this.applyBorderColors(editorDiv, context, "editor");
    this.container.appendChild(editorDiv);
    // Determine heading levels from property (default to 1,2,3,4)
    var headingLevels = [1, 2, 3, 4, false];
    var headingLevelsRaw = undefined;
    if ('headingLevels' in context.parameters && context.parameters['headingLevels'] && typeof context.parameters['headingLevels'].raw === 'string') {
      headingLevelsRaw = context.parameters['headingLevels'].raw;
    }
    if (headingLevelsRaw) {
      var parsed = headingLevelsRaw.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
      headingLevels = [...parsed, false];
    }
    // Type-safe access to boolean toggles
    function getToggle(param) {
      var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      var prop = context.parameters[param];
      if (prop && typeof prop.raw === 'boolean') {
        return prop.raw;
      }
      return defaultValue;
    }
    var showBold = getToggle('showBold');
    var showItalic = getToggle('showItalic');
    var showUnderline = getToggle('showUnderline');
    var showLink = getToggle('showLink');
    var showBlockquote = getToggle('showBlockquote');
    var showCodeBlock = getToggle('showCodeBlock');
    var showImage = getToggle('showImage');
    var showOrderedList = getToggle('showOrderedList');
    var showBulletList = getToggle('showBulletList');
    var showFont = getToggle('showFont');
    var showColor = getToggle('showColor');
    var showAlign = getToggle('showAlign');
    var showClean = getToggle('showClean');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var toolbar = [];
    toolbar.push([{
      header: headingLevels
    }]);
    if (showFont) toolbar.push([{
      font: []
    }]);
    var inline = [];
    if (showBold) inline.push("bold");
    if (showItalic) inline.push("italic");
    if (showUnderline) inline.push("underline");
    if (inline.length) toolbar.push(inline);
    if (showColor) toolbar.push([{
      color: []
    }, {
      background: []
    }]);
    var block = [];
    if (showLink) block.push("link");
    if (showBlockquote) block.push("blockquote");
    if (showCodeBlock) block.push("code-block");
    if (showImage) block.push("image");
    if (block.length) toolbar.push(block);
    if (showAlign) toolbar.push([{
      align: []
    }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var lists = [];
    if (showOrderedList) lists.push({
      list: "ordered"
    });
    if (showBulletList) lists.push({
      list: "bullet"
    });
    if (lists.length) toolbar.push(lists);
    if (showClean) toolbar.push(["clean"]);
    this.quill = new Quill(editorDiv, {
      theme: "snow",
      modules: {
        toolbar
      }
    });
    // Apply user-selected colors efficiently
    setTimeout(() => {
      this.applyColorStyles(context);
    }, 0);
    // Set initial value from Default property
    var defaultValue = ((_a = context.parameters.Default) === null || _a === void 0 ? void 0 : _a.raw) || "";
    var initialValue = existingValue ?? defaultValue;
    if (existingValue === undefined) this.lastDefaultValue = defaultValue;
    this.replaceContent(initialValue);
    // Notify that HtmlText output is available with initial value
    if (initialValue && this.notifyOutputChanged) {
      this.notifyOutputChanged();
    }
    // Update HtmlText live on every text change
    this.quill.on("text-change", () => {
      if (this.isProgrammaticUpdate) return;
      var html = this.quill.root.innerHTML;
      if (html !== this.htmlText) {
        this.htmlText = html;
        if (this.notifyOutputChanged) {
          this.notifyOutputChanged();
        }
      }
    });
    // Save toolbar config for change detection
    this.lastToolbarConfig = JSON.stringify(toolbar);
  }
  // Keep Quill's document and the output synchronized, including an empty Default.
  // Clear undo/redo so discarded content cannot return after a reset.
  replaceContent(value) {
    this.isProgrammaticUpdate = true;
    try {
      var delta = this.quill.clipboard.convert({ html: value });
      this.quill.setContents(delta, 'silent');
      this.quill.history.clear();
      this.htmlText = value === "" ? "" : this.quill.root.innerHTML;
    } finally {
      this.isProgrammaticUpdate = false;
    }
  }
  setupToolbarColorMonitoring(toolbarEl, backgroundColor, textColor, iconColor, dropdownColor, dropdownTextColor) {
    // Clean up any existing monitoring
    this.cleanupColorMonitoring(toolbarEl);
    // Simple, efficient color application function
    var applyColors = () => {
      try {
        if (backgroundColor) {
          document.documentElement.style.setProperty('--toolbar-background-color', backgroundColor);
        }
        if (textColor) {
          document.documentElement.style.setProperty('--toolbar-text-color', textColor);
        }
        if (iconColor) {
          document.documentElement.style.setProperty('--toolbar-icon-color', iconColor);
        }
        if (dropdownColor) {
          document.documentElement.style.setProperty('--toolbar-dropdown-color', dropdownColor);
        }
        if (dropdownTextColor) {
          document.documentElement.style.setProperty('--toolbar-dropdown-text-color', dropdownTextColor);
        }
      } catch (error) {
        console.warn('Error applying toolbar colors:', error);
      }
    };
    // Apply colors immediately
    applyColors();
    // Set up minimal monitoring - only when necessary
    var observer = new MutationObserver(mutations => {
      var shouldUpdate = false;
      for (var mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) {
        // Debounce the color application
        setTimeout(applyColors, 50);
      }
    });
    observer.observe(toolbarEl, {
      childList: true,
      subtree: true
    });
    // Store cleanup function
    toolbarEl._colorCleanup = () => {
      observer.disconnect();
    };
  }
  cleanupColorMonitoring(toolbarEl) {
    var cleanup = toolbarEl._colorCleanup;
    if (cleanup) {
      cleanup();
      delete toolbarEl._colorCleanup;
    }
  }
  isValidCSSColor(color) {
    if (!color || color.trim() === '') return false;
    // Create a temporary element to test the color
    var tempElement = document.createElement('div');
    tempElement.style.color = color;
    return tempElement.style.color !== '';
  }
  applyColorStyles(context) {
    if (!this.container) return;
    // Get all color values with defaults and validation
    var getValidColor = (paramName, defaultColor) => {
      var _a;
      var value = (_a = context.parameters[paramName]) === null || _a === void 0 ? void 0 : _a.raw;
      if (value && this.isValidCSSColor(value)) {
        return value;
      }
      return defaultColor;
    };
    var editorBackgroundColor = getValidColor('editorBackgroundColor', '#ffffff');
    var toolbarColor = getValidColor('toolbarColor', '#ffffff');
    var toolbarTextColor = getValidColor('toolbarTextColor', '#444444');
    var toolbarIconColor = getValidColor('toolbarIconColor', '#444444');
    var toolbarDropdownColor = getValidColor('toolbarDropdownColor', '#ffffff');
    var toolbarDropdownTextColor = getValidColor('toolbarDropdownTextColor', '#333333');
    // Apply editor styles
    var editorDiv = this.container.querySelector('#quill-editor');
    if (editorDiv) {
      this.applyBorderColors(editorDiv, context, "editor");
    }
    var qlEditorEl = this.container.querySelector('.ql-editor');
    if (qlEditorEl) {
      qlEditorEl.style.background = editorBackgroundColor;
    }
    // Apply toolbar styles
    var toolbarEl = this.container.querySelector('.ql-toolbar');
    if (toolbarEl) {
      this.applyBorderColors(toolbarEl, context, "toolbar");
      // Set up efficient color monitoring
      this.setupToolbarColorMonitoring(toolbarEl, toolbarColor, toolbarTextColor, toolbarIconColor, toolbarDropdownColor, toolbarDropdownTextColor);
    }
  }
  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   */
  updateView(context) {
    // Store the key before notifying the host, which may call updateView again.
    var resetKey = context.parameters.ResetKey?.raw ?? 0;
    var resetRequested = resetKey !== this.lastResetKey;
    this.lastResetKey = resetKey;
    // Check if we need to rebuild the toolbar configuration
    var shouldRebuildToolbar = this.shouldRebuildToolbar(context);
    if (shouldRebuildToolbar) {
      this.createOrUpdateQuill(context);
    }
    if (!this.quill) return;
    // Apply color changes immediately and efficiently
    this.applyColorStyles(context);
    // Handle content updates
    var newValue = context.parameters.Default?.raw ?? "";
    if ((resetRequested || newValue !== this.lastDefaultValue) && !this.isProgrammaticUpdate) {
      if (!this.isValidHTML(newValue)) {
        this.showError("Invalid HTML code. Please correct your input.");
        return;
      } else {
        this.clearError();
      }
      this.lastDefaultValue = newValue;
      this.replaceContent(newValue);
      // Notify that HtmlText output has changed
      if (this.notifyOutputChanged) {
        this.notifyOutputChanged();
      }
    }
  }
  shouldRebuildToolbar(context) {
    // Recompute toolbar config
    var headingLevels = [1, 2, 3, 4, false];
    var headingLevelsRaw = undefined;
    if ('headingLevels' in context.parameters && context.parameters['headingLevels'] && typeof context.parameters['headingLevels'].raw === 'string') {
      headingLevelsRaw = context.parameters['headingLevels'].raw;
    }
    if (headingLevelsRaw) {
      var parsed = headingLevelsRaw.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
      headingLevels = [...parsed, false];
    }
    function getToggle(param) {
      var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      var prop = context.parameters[param];
      if (prop && typeof prop.raw === 'boolean') {
        return prop.raw;
      }
      return defaultValue;
    }
    // Declare all toggles before toolbar config
    var showBold = getToggle('showBold');
    var showItalic = getToggle('showItalic');
    var showUnderline = getToggle('showUnderline');
    var showLink = getToggle('showLink');
    var showBlockquote = getToggle('showBlockquote');
    var showCodeBlock = getToggle('showCodeBlock');
    var showImage = getToggle('showImage');
    var showOrderedList = getToggle('showOrderedList');
    var showBulletList = getToggle('showBulletList');
    var showFont = getToggle('showFont');
    var showColor = getToggle('showColor');
    var showAlign = getToggle('showAlign');
    var showClean = getToggle('showClean');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var toolbar = [];
    toolbar.push([{
      header: headingLevels
    }]);
    if (showFont) toolbar.push([{
      font: []
    }]);
    var inline = [];
    if (showBold) inline.push("bold");
    if (showItalic) inline.push("italic");
    if (showUnderline) inline.push("underline");
    if (inline.length) toolbar.push(inline);
    if (showColor) toolbar.push([{
      color: []
    }, {
      background: []
    }]);
    var block = [];
    if (showLink) block.push("link");
    if (showBlockquote) block.push("blockquote");
    if (showCodeBlock) block.push("code-block");
    if (showImage) block.push("image");
    if (block.length) toolbar.push(block);
    if (showAlign) toolbar.push([{
      align: []
    }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var lists = [];
    if (showOrderedList) lists.push({
      list: "ordered"
    });
    if (showBulletList) lists.push({
      list: "bullet"
    });
    if (lists.length) toolbar.push(lists);
    if (showClean) toolbar.push(["clean"]);
    // Track all toolbar-related toggles for robust detection
    var toolbarConfig = JSON.stringify(toolbar);
    var togglesConfig = [showBold, showItalic, showUnderline, showLink, showBlockquote, showCodeBlock, showImage, showOrderedList, showBulletList, showFont, showColor, showAlign, showClean].join("|");
    var headingLevelsRawForCompare = headingLevelsRaw || "";
    var lastConfig = this.lastToolbarConfig + "|" + this._lastHeadingLevelsRaw + "|" + (this._lastTogglesConfig || "");
    var newConfig = toolbarConfig + "|" + headingLevelsRawForCompare + "|" + togglesConfig;
    if (newConfig !== lastConfig) {
      this.lastToolbarConfig = toolbarConfig;
      this._lastHeadingLevelsRaw = headingLevelsRawForCompare;
      this._lastTogglesConfig = togglesConfig;
      return true;
    }
    return false;
  }
  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  getOutputs() {
    // Return the HTML content as output
    return {
      HtmlText: this.htmlText
    };
  }
  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  destroy() {
    // Cleanup color monitoring
    if (this.container) {
      var toolbarEl = this.container.querySelector('.ql-toolbar');
      if (toolbarEl) {
        this.cleanupColorMonitoring(toolbarEl);
      }
    }
    // Cleanup Quill instance and error div
    if (this.quill) {
      // Quill does not have a destroy method, but we can remove listeners and DOM
      if (this.container) {
        this.container.innerHTML = "";
      }
      this.quill = undefined;
    }
    this.clearError();
  }
}

