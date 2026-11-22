import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Run the real component handlers with deferred API calls; no DOM library needed.
function setup() {
  let current;
  const hooks = {
    useState(initial) {
      const slot = current.cursor++;
      const instance = current;
      if (!(slot in instance.slots)) instance.slots[slot] = initial;
      return [instance.slots[slot], (value) => {
        instance.slots[slot] = typeof value === "function" ? value(instance.slots[slot]) : value;
      }];
    },
    useRef(initial) {
      const [ref] = hooks.useState({ current: initial });
      return ref;
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useLayoutEffect(fn) { current.layout = fn; },
    useEffect(fn) {
      if (current.firstRender) current.effects.push(fn);
    },
  };
  const lists = [];
  const uploads = [];
  const defer = (queue) => (...args) => new Promise((resolve, reject) => queue.push({ args, resolve, reject }));
  const exports = {};
  const jsx = (type, props, key) => ({ type, props, key });
  const source = readFileSync(new URL("../components/greenhouse/views/ai-detection-view.tsx", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    document: { activeElement: {} },
    window: { setTimeout: () => 0, clearTimeout() {} },
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@/lib/inspection-images-api") return { inspectionImagesApi: { list: defer(lists), upload: defer(uploads) } };
      return new Proxy({}, { get: (_, key) => key });
    },
  });
  function mount(type, props) {
    const instance = { slots: [], effects: [], cursor: 0, firstRender: true };
    const render = (nextProps = props) => {
      current = instance;
      instance.cursor = 0;
      const tree = type(nextProps);
      instance.firstRender = false;
      return tree;
    };
    const tree = render();
    const cleanups = instance.effects.map((fn) => fn());
    return { tree, render, layout: () => instance.layout?.(), unmount: () => cleanups.forEach((cleanup) => cleanup?.()) };
  }
  return { mount, View: exports.AiDetectionView, lists, uploads };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== "object") return undefined;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const found = find(child, predicate);
    if (found) return found;
  }
}

const camera = (id) => ({ id, name: id, zone: "zone", enabled: true, status: "online" });
const image = (id) => ({ imageId: id, readUrl: `/${id}.jpg`, status: "ready", detectionCount: 0, detections: [] });
const props = { greenhouseId: "greenhouse-a", plant: { id: "plant", zone: "zone" }, cameras: [camera("a"), camera("b")], reviewedCameraIds: [], onSave() {} };
const refresh = (view) => find(view.render(), (node) => node.props?.["aria-label"] === "โหลดภาพใหม่").props.onClick();
const upload = (view) => find(view.render(), (node) => node.type === "input").props.onChange({ target: { files: [{}] }, currentTarget: {} });
const visibleImage = (view) => find(view.render(), (node) => node.type === "img")?.props.src;
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("latest image request wins; upload invalidates earlier image lists", async () => {
  const app = setup();
  const wrapper = app.mount(app.View, props);
  const view = app.mount(wrapper.tree.type, wrapper.tree.props);
  refresh(view);
  refresh(view);
  app.lists[1].resolve([image("new")]);
  await settle();
  app.lists[0].reject(new Error("old failure"));
  await settle();
  assert.equal(visibleImage(view), "/new.jpg");
  assert.equal(find(view.render(), (node) => node.props?.role === "alert"), undefined);

  refresh(view);
  upload(view);
  refresh(view);
  app.uploads[0].resolve(image("upload"));
  await settle();
  app.lists[2].resolve([image("before-upload")]);
  app.lists[3].resolve([image("during-upload")]);
  await settle();
  assert.equal(visibleImage(view), "/upload.jpg");
  assert.equal(find(view.render(), (node) => node.props?.["aria-label"] === "โหลดภาพใหม่").props.disabled, false);
});

test("camera and greenhouse changes remount image state and ignore old uploads", async () => {
  const app = setup();
  const wrapper = app.mount(app.View, props);
  const oldView = app.mount(wrapper.tree.type, wrapper.tree.props);
  refresh(oldView);
  app.lists[0].resolve([image("camera-a")]);
  await settle();
  assert.equal(visibleImage(oldView), "/camera-a.jpg");
  upload(oldView);
  wrapper.tree.props.onSelectCamera("b");
  const next = wrapper.render();
  assert.notEqual(next.key, wrapper.tree.key);
  oldView.unmount();
  const newView = app.mount(next.type, next.props);
  assert.equal(visibleImage(newView), undefined);
  refresh(newView);
  app.lists[1].resolve([image("camera-b")]);
  app.uploads[0].resolve(image("old-upload"));
  await settle();
  assert.equal(visibleImage(newView), "/camera-b.jpg");
  assert.equal(visibleImage(oldView), "/camera-a.jpg");
  const greenhouse = wrapper.render({ ...props, greenhouseId: "greenhouse-b" });
  assert.notEqual(greenhouse.key, next.key);
  const greenhouseView = app.mount(greenhouse.type, greenhouse.props);
  assert.equal(visibleImage(greenhouseView), undefined);
});


test("camera selection restores focus to the selected radio after remount", () => {
  const app = setup();
  const wrapper = app.mount(app.View, props);
  let focused = 0;
  wrapper.tree.props.containerRef.current = {
    contains: () => true,
    querySelector(selector) {
      assert.equal(selector, '[role="radio"][aria-checked="true"]');
      return { focus: () => { focused++; } };
    },
  };
  wrapper.layout();
  assert.equal(focused, 0);
  wrapper.tree.props.onSelectCamera("b");
  wrapper.render();
  wrapper.layout();
  assert.equal(focused, 1);
  wrapper.render({ ...props, greenhouseId: "greenhouse-b" });
  wrapper.layout();
  assert.equal(focused, 1);
});
