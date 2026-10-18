const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const publicFile = name => fs.readFileSync(path.join(root, "public", name));
const code = ts.transpileModule(fs.readFileSync(path.join(root, "lib/api.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function client(apiFetch, storage = new Map(), timers = { setTimeout, clearTimeout }) {
  const context = {
    exports: {}, AbortController, Response, DecompressionStream,
    ...timers, console: { error() {} },
    window: { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } },
    fetch: async (url, options) => url.startsWith("/saved-")
      ? new Response(publicFile(url.slice(1))) : apiFetch(url, options),
  };
  vm.runInNewContext(code, context);
  return context.exports;
}

for (const [name, response] of [
  ["HTTP 503", () => new Response("Starting", { status: 503 })],
  ["HTTP 200 HTML wake-up page", () => new Response("<html>Starting</html>")],
  ["empty result file", url => Response.json(url.endsWith("dashboard") ? { stats: { total_routes: 0 } } : [])],
]) {
  test(`${name}: first-time visitor gets the saved network, charts, and reroutes`, async () => {
    const api = client(response);
    const [dashboard, results, routes] = await Promise.all([api.getDashboard(true), api.getResults(true), api.getRoutes(true)]);
    assert.equal(dashboard.stats.total_routes, 269);
    assert.ok(dashboard.demand.length > 0 && dashboard.load.length > 0);
    assert.equal(results.filter(row => row.rerouted_to > 0).length, 16);
    assert.equal(routes.length, 268);
    assert.equal(api.getDataSource("/dashboard"), "saved");
    const detail = await api.getRoute("R-60");
    assert.ok(detail.demand_trend.length > 0);
  });
}

test("hanging cold-start request times out and uses the saved snapshot", async () => {
  const api = client((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")));
  }), new Map(), { setTimeout: fn => setTimeout(fn, 5), clearTimeout });
  assert.equal((await api.getDashboard(true)).stats.total_routes, 269);
});

test("failed refresh and browser reopen preserve the last successful response; backend recovery refreshes it", async () => {
  const storage = new Map();
  let up = true;
  const fetch = () => up ? Response.json([{ route_id: 777, buses_added: 3 }]) : new Response("Starting", { status: 502 });
  let api = client(fetch, storage);
  assert.equal((await api.getResults(true))[0].route_id, 777);
  up = false;
  assert.equal((await api.getResults(true))[0].route_id, 777);
  assert.equal(api.getDataSource("/results"), "saved");
  api = client(fetch, storage);
  assert.equal((await api.getResults(true))[0].route_id, 777);
  up = true;
  await api.getResults(true);
  assert.equal(api.getDataSource("/results"), "backend");
});

test("agent and conflict views retain the original saved records", async () => {
  const api = client(() => new Response("Starting", { status: 503 }));
  assert.ok(Object.keys((await api.getAgentSystemStatus()).operational_agents).length > 0);
  assert.equal((await api.getAllConflicts()).length, 7293);
});

test("failed mutations still fail instead of returning a saved success", async () => {
  const api = client(() => new Response("Unavailable", { status: 503 }));
  await assert.rejects(api.postOptimize(), /503/);
  await assert.rejects(api.postPredict({ route_id: 7 }), /503/);
});

test("empty fleet and cost panels never render NaN or Infinity", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  for (const component of ["FleetStatus", "CostEfficiency"]) {
    const source = fs.readFileSync(path.join(root, `components/dashboard/${component}.tsx`), "utf8");
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const context = { exports: {}, require: name => name === "react/jsx-runtime" ? require(name)
      : name === "lucide-react" ? new Proxy({}, { get: () => () => null })
      : new Proxy({}, { get: () => ({ children }) => React.createElement("div", null, children) }) };
    vm.runInNewContext(output, context);
    const html = renderToStaticMarkup(React.createElement(context.exports.default, { results: [] }));
    assert.doesNotMatch(html, /NaN|Infinity/);
  }
});
