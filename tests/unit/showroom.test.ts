import { describe, expect, it, vi } from "vitest";
import { createShowroomStore } from "../../frontend/src/application/showroom";
import type { Quote, RunRequest } from "../../frontend/src/domain/models";
import { configuration, makeQuote, repositories, run, vehicles } from "../fixtures";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("showroom use cases", () => {
  it("loads the backend catalog and resets dependent options when the model changes", async () => {
    const repos = repositories();
    const store = createShowroomStore(repos.vehicles, repos.agent);
    await store.getState().load();
    expect(store.getState().configuration?.vehicle_id).toBe("autonex-xuv-demo");
    store
      .getState()
      .configure({ trim_id: "trim-xuv-performance", package_ids: ["package-comfort"] });
    store.getState().selectVehicle(vehicles[1]!.id);
    expect(store.getState().configuration).toMatchObject({
      vehicle_id: "bmw-ix-demo",
      trim_id: "trim-family",
      package_ids: [],
    });
  });
  it("ignores a stale quote after a newer configuration has been priced", async () => {
    const repos = repositories();
    const store = createShowroomStore(repos.vehicles, repos.agent);
    await store.getState().load();
    const first = deferred<Quote>();
    const second = deferred<Quote>();
    repos.vehicles.quote = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    store.getState().configure({ color_id: "color-jet-black" });
    store.getState().configure({ trim_id: "trim-performance" });
    second.resolve(makeQuote(store.getState().configuration!, 69800));
    await second.promise;
    first.resolve(makeQuote(configuration, 58900));
    await first.promise;
    expect(store.getState().quote?.total).toBe(69800);
  });
  it("does not let a pending quote overwrite an applied agent recommendation", async () => {
    const repos = repositories();
    const store = createShowroomStore(repos.vehicles, repos.agent);
    await store.getState().load();
    const pending = deferred<Quote>();
    repos.vehicles.quote = () => pending.promise;
    store.getState().configure({ trim_id: "trim-performance" });
    store.getState().applyRun(run);
    pending.resolve(makeQuote(configuration, 99999));
    await pending.promise;
    expect(store.getState().quote).toEqual(run.quote);
    expect(store.getState().panel).toBe("configure");
  });
  it("prevents overlapping runs and passes bounded conversational history", async () => {
    const repos = repositories();
    const pending = deferred<typeof run>();
    const request = vi.fn<(request: RunRequest) => Promise<typeof run>>(() => pending.promise);
    repos.agent.run = request;
    const store = createShowroomStore(repos.vehicles, repos.agent);
    const first = store.getState().ask("A sporty blue car");
    await store.getState().ask("Another request");
    expect(request).toHaveBeenCalledTimes(1);
    pending.resolve(run);
    await first;
    expect(store.getState().runs).toHaveLength(1);
    expect(store.getState().history).toHaveLength(2);
    await store.getState().ask("Make it white");
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      prompt: "Make it white",
      history: expect.arrayContaining([expect.objectContaining({ role: "user" })]),
    });
  });
  it("surfaces provider errors and allows a retry", async () => {
    const repos = repositories();
    repos.agent.run = vi
      .fn()
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValue(run);
    const store = createShowroomStore(repos.vehicles, repos.agent);
    await store.getState().ask("A family car");
    expect(store.getState().agentError).toBe("Provider unavailable");
    expect(store.getState().agentPending).toBe(false);
    await store.getState().ask("A family car");
    expect(store.getState().agentError).toBeNull();
    expect(store.getState().runs).toHaveLength(1);
  });
});

describe("bounded session memory", () => {
  it("keeps the latest 50 reports while retaining bounded conversation context", async () => {
    const repos = repositories();
    let count = 0;
    repos.agent.run = async () => ({ ...run, id: `run-${++count}` });
    const store = createShowroomStore(repos.vehicles, repos.agent);
    for (let index = 0; index < 75; index++) await store.getState().ask(`Request ${index}`);
    expect(store.getState().runs).toHaveLength(50);
    expect(store.getState().runs[0]?.id).toBe("run-26");
    expect(store.getState().runs.at(-1)?.id).toBe("run-75");
    expect(store.getState().history).toHaveLength(8);
  });
});
