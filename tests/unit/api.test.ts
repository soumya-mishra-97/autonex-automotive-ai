import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiVehicleRepository } from "../../frontend/src/infrastructure/api";
import { configuration, vehicles } from "../fixtures";

describe("HTTP repository boundary", () => {
  it("validates the backend catalog using the frontend contract", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(vehicles)));
    expect(await new ApiVehicleRepository(new ApiClient("/api/v1", fetcher)).list()).toEqual(
      vehicles,
    );
    expect(fetcher.mock.contexts[0]).toBeUndefined();
  });
  it("rejects malformed successful responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"total":"free"}'));
    await expect(
      new ApiVehicleRepository(new ApiClient("/api/v1", fetcher)).quote(configuration),
    ).rejects.toThrow("unexpected response");
  });
  it("preserves a useful API error without treating it as a quote", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"detail":"Unknown option"}', { status: 422 }));
    await expect(
      new ApiVehicleRepository(new ApiClient("/api/v1", fetcher)).quote(configuration),
    ).rejects.toThrow("Unknown option");
  });
  it("makes network failures actionable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      new ApiVehicleRepository(new ApiClient("/api/v1", fetcher)).list(),
    ).rejects.toThrow("Python backend");
  });
});
