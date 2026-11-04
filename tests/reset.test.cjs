const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

// Exercise the PCF lifecycle against a Quill double, without installing packages.
// Pass an extracted bundle to test the very same module shipped in the ZIP.
let source;
if (process.argv[2]) {
  const bundle = readFileSync(process.argv[2], 'utf8');
  new vm.Script(bundle); // Check syntax of the complete packaged JavaScript too.
  source = JSON.parse(bundle.match(/eval\(("(?:[^"\\]|\\.)*")\)/)[1]);
} else {
  source = readFileSync(path.join(__dirname, '../control/CustomRichTextField.js'), 'utf8')
    .replace("import Quill from 'quill';", '')
    .replace('export class CustomRichTextField', 'class CustomRichTextField');
}

class QuillDouble {
  static import() { return {}; }
  static register() {}
  constructor() {
    this.root = { innerHTML: '<p><br></p>' };
    this.clipboard = { convert: ({ html }) => html };
    this.history = { undoStack: [], clear: () => { this.history.undoStack = []; } };
    this.events = {};
    this.setCount = 0;
  }
  setContents(html, mode) {
    assert.equal(mode, 'silent');
    this.setCount++;
    this.root.innerHTML = html || '<p><br></p>';
  }
  on(event, fn) { this.events[event] = fn; }
  off(event) { delete this.events[event]; }
  type(html) {
    this.history.undoStack.push(this.root.innerHTML);
    this.root.innerHTML = html;
    this.events['text-change']();
  }
}

const context = vm.createContext({
  Quill: QuillDouble,
  __webpack_exports__: {},
  __webpack_require__: Object.assign(() => ({ default: QuillDouble }), { r() {}, d() {} }),
  document: { createElement: () => ({ style: {} }) },
  DOMParser: class { parseFromString() { return { querySelector: () => null }; } },
  setTimeout() {},
});
vm.runInContext(source + '\nthis.Control = CustomRichTextField;', context);

function fixture(defaultValue = '<p>Default</p>', key = 0) {
  const control = new context.Control();
  const properties = { parameters: { Default: { raw: defaultValue }, ResetKey: { raw: key } } };
  const container = { appendChild() {}, querySelector: () => null, innerHTML: '' };
  let notifications = 0;
  control.init(properties, () => { notifications++; }, {}, container);
  const host = { control, properties, notifications: () => notifications };
  host.update = (values = {}) => {
    for (const [name, raw] of Object.entries(values)) properties.parameters[name] = { raw };
    control.updateView(properties);
  };
  return host;
}

test('reset restores unchanged Default, output and clears undo; repeatable', () => {
  const host = fixture();
  const editor = host.control.quill;
  for (let key = 1; key <= 3; key++) {
    editor.type('<p>User edits</p>');
    const count = host.notifications();
    host.update({ ResetKey: key });
    assert.equal(host.control.quill, editor, 'reset must not recreate the editor');
    assert.equal(editor.root.innerHTML, '<p>Default</p>');
    assert.equal(host.control.getOutputs().HtmlText, '<p>Default</p>');
    assert.deepEqual(editor.history.undoStack, []);
    assert.equal(host.notifications(), count + 1);
  }
});

test('ordinary updates and an unchanged key preserve typing', () => {
  const host = fixture('<p>Initial</p>', 17);
  host.control.quill.type('<p>Typing</p>');
  const count = host.notifications();
  host.update();
  host.update({ toolbarColor: 'red', ResetKey: 17 });
  assert.equal(host.control.getOutputs().HtmlText, '<p>Typing</p>');
  assert.equal(host.notifications(), count);
});

test('empty and null Default clear editor and output', () => {
  for (const value of ['', null]) {
    const host = fixture(value);
    host.control.quill.type('<p>Discard</p>');
    host.update({ ResetKey: 1 });
    assert.equal(host.control.quill.root.innerHTML, '<p><br></p>');
    assert.equal(host.control.getOutputs().HtmlText, '');
  }
});

test('reset uses latest formatted Default, including simultaneous changes', () => {
  const host = fixture();
  const formatted = '<h2>Title</h2><p><strong>Bold</strong></p>';
  host.control.quill.type('<p>Discard</p>');
  host.update({ Default: formatted, ResetKey: 1 });
  assert.equal(host.control.getOutputs().HtmlText, formatted);
  host.control.quill.type('<p>Discard again</p>');
  host.update({ ResetKey: 2 });
  assert.equal(host.control.getOutputs().HtmlText, formatted);
});

test('Default changes are tracked even when equal to current edited content', () => {
  const host = fixture('<p>A</p>');
  host.control.quill.type('<p>B</p>');
  host.update({ Default: '<p>B</p>' });
  host.update({ Default: '<p>A</p>' });
  assert.equal(host.control.getOutputs().HtmlText, '<p>A</p>');
});

test('toolbar rebuild preserves edits and simultaneous reset is not lost', () => {
  const host = fixture();
  host.control.quill.type('<p>Keep</p>');
  host.update({ showBold: false });
  assert.equal(host.control.getOutputs().HtmlText, '<p>Keep</p>');
  host.update({ showBold: true, ResetKey: 1 });
  assert.equal(host.control.getOutputs().HtmlText, '<p>Default</p>');
});

test('reentrant host update after notification does not reset again', () => {
  const host = fixture();
  host.control.quill.type('<p>Discard</p>');
  host.control.notifyOutputChanged = () => host.control.updateView(host.properties);
  const count = host.control.quill.setCount;
  host.update({ ResetKey: 1 });
  assert.equal(host.control.quill.setCount, count + 1);
  assert.equal(host.control.isProgrammaticUpdate, false);
});

test('unconfigured ResetKey remains backward compatible and instances are independent', () => {
  const host = fixture();
  delete host.properties.parameters.ResetKey;
  host.control.quill.type('<p>Keep</p>');
  host.update();
  assert.equal(host.control.getOutputs().HtmlText, '<p>Keep</p>');
  const other = fixture();
  other.control.quill.type('<p>Other editor</p>');
  host.update({ ResetKey: 1 });
  assert.equal(other.control.getOutputs().HtmlText, '<p>Other editor</p>');
});
