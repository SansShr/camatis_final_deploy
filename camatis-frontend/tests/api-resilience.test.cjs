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
  const prediction = client(url => url.endsWith("/health") ? Response.json({status:"healthy"})
    : Response.json({detail:"Prediction models could not be loaded. Please retry."}, { status: 500 }));
  await assert.rejects(prediction.postPredict({ route_id: 7 }), /models could not be loaded/);
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


test("recorded route assessments survive a cold start and an empty API response", async () => {
  for (const response of [() => new Response("Starting", {status: 503}), () => Response.json({ route_id:60,agent_scores:[],final_decision:{} })]) {
    const api = client(response);
    const detail = await api.getRouteAgentDetail(60, true);
    assert.equal(detail.agent_scores.length, 7);
    assert.equal(detail.route_id, 60);
    assert.equal(api.getDataSource("/agents/route/60"), "saved");
    const summary = await api.getRouteAgentDetail(68, true);
    assert.equal(summary.final_decision.assessment_status, "summary_only");
    assert.equal(summary.agent_scores.length, 0);
  }
});

test("prediction preparation is shared, handles a cold-start page, and returns a computed response", async () => {
  let probes = 0, posts = 0;
  const input = { route_id:7,passenger_count:30 };
  const api = client(async url => {
    if (url.endsWith("/health")) return Response.json({status:"healthy"});
    if (url.endsWith("/ready")) {
      probes++;
      return probes === 1 ? new Response("<html>Starting</html>") : Response.json({ready:true});
    }
    posts++;
    return Response.json({route_id:7,predicted_demand:330});
  }, new Map(), { setTimeout: (fn, ms) => setTimeout(fn, ms >= 2000 && ms < 60000 ? 1 : ms), clearTimeout });
  await Promise.all([api.preparePrediction(), api.preparePrediction()]);
  assert.equal(probes, 2);
  const result = await api.postPredict(input);
  assert.equal(result.predicted_demand,330);
  assert.equal(posts,1);
});

test("transient prediction failures reconnect, but input errors are not replayed", async () => {
  let posts = 0;
  const api = client(url => {
    if (url.endsWith("/health")) return Response.json({status:"healthy"});
    if (url.endsWith("/ready")) return Response.json({ready:true});
    posts++;
    return posts===1 ? new Response("Starting", {status:503}) : Response.json({route_id:7,predicted_demand:220});
  }, new Map(), { setTimeout: (fn, ms) => setTimeout(fn, ms >= 2000 && ms < 60000 ? 1 : ms), clearTimeout });
  assert.equal((await api.postPredict({route_id:7})).predicted_demand,220);
  assert.equal(posts,2);
  let invalidPosts=0;
  const invalid=client(url => url.endsWith("/health") ? Response.json({status:"healthy"})
    : url.endsWith("/ready") ? Response.json({ready:true}) : (invalidPosts++,new Response("Bad input",{status:422})));
  await assert.rejects(invalid.postPredict({route_id:7}),/allowed ranges/);
  assert.equal(invalidPosts,1);
});

test("a sleeping service wakes before preparation and proxy 500 pages never become model errors", async () => {
  const calls=[];
  let health=0, ready=0;
  const api=client(url => {
    calls.push(url);
    if (url.endsWith("/health")) return ++health===1
      ? new Response("<html>Waking up</html>",{status:500}) : Response.json({status:"healthy"});
    if (url.endsWith("/ready")) return ++ready===1
      ? new Response("Internal Server Error",{status:500}) : Response.json({ready:true});
    return Response.json({route_id:7,predicted_demand:327});
  },new Map(),{setTimeout:(fn,ms)=>setTimeout(fn,ms>=2000&&ms<60000?1:ms),clearTimeout});
  assert.equal((await api.postPredict({route_id:7})).predicted_demand,327);
  assert.deepEqual(calls,["/api/health","/api/health","/api/predict/ready","/api/predict/ready","/api/predict"]);
});

function virtualClock() {
  let now = Date.now();
  return {
    Date: class extends Date { static now() { return now; } },
    setTimeout: (fn, ms) => setTimeout(() => { now += ms; fn(); }, 0),
    clearTimeout,
    now: () => now,
  };
}

for (const endpoint of ["/health", "/predict/ready", "/predict"]) {
  for (const header of ["seconds", "date"]) {
    test(`429 at ${endpoint}: honors Retry-After ${header}, then computes a prediction`, async () => {
      const clock=virtualClock(), calls=[], progress=[];
      let limited=false;
      const start=clock.now();
      const api=client(url => {
        const path=url.slice(4);
        calls.push({path,time:clock.now()});
        if (path===endpoint && !limited) {
          limited=true;
          return new Response("Too Many Requests",{status:429,headers:{"Retry-After":header==="seconds"?"60":new Date(start+61000).toUTCString()}});
        }
        if (path==="/health") return Response.json({status:"healthy"});
        if (path==="/predict/ready") return Response.json({ready:true});
        return Response.json({route_id:7,predicted_demand:327});
      },new Map(),clock);
      const result=await api.postPredict({route_id:7},message=>progress.push(message));
      assert.equal(result.predicted_demand,327);
      const attempts=calls.filter(c=>c.path===endpoint);
      assert.equal(attempts.length,2);
      assert.ok(attempts[1].time-attempts[0].time>=60000);
      assert.ok(progress.some(message=>message.includes("service is busy")));
      if (endpoint==="/predict") assert.equal(calls.filter(c=>c.path==="/health").length,1);
    });
  }
}

test("rate limiting is bounded and a new submission cannot ignore the cooldown", async () => {
  const clock=virtualClock();
  let calls=0;
  const api=client(() => {calls++;return new Response("Too Many Requests",{status:429,headers:{"Retry-After":"600"}});},new Map(),clock);
  await assert.rejects(api.postPredict({route_id:7}),/service is busy/);
  await assert.rejects(api.postPredict({route_id:7}),/service is busy/);
  assert.equal(calls,1);
});

test("429 without Retry-After uses a growing delay instead of hammering startup", async () => {
  const clock=virtualClock(), attempts=[];
  const api=client(url => {
    if(url.endsWith("/health")) {
      attempts.push(clock.now());
      if(attempts.length<=3)return new Response("Too Many Requests",{status:429});
      return Response.json({status:"healthy"});
    }
    return Response.json({ready:true});
  },new Map(),clock);
  await api.preparePrediction();
  assert.equal(attempts.length,4);
  assert.ok(attempts[1]-attempts[0]>=10000);
  assert.ok(attempts[3]-attempts[2]>=20000);
});
