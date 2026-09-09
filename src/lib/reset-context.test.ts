import { describe, expect, it, vi } from "vitest";
import { createResetCoordinator } from "./reset-context";

describe("createResetCoordinator", () => {
  it("cancels every registered pending save", () => {
    const firstCancel = vi.fn();
    const secondCancel = vi.fn();
    const coordinator = createResetCoordinator();

    coordinator.registerCancel(firstCancel);
    coordinator.registerCancel(secondCancel);
    coordinator.cancelPendingSaves();

    expect(firstCancel).toHaveBeenCalledTimes(1);
    expect(secondCancel).toHaveBeenCalledTimes(1);
  });

  it("stops calling a registration after it is unregistered", () => {
    const cancel = vi.fn();
    const coordinator = createResetCoordinator();
    const unregister = coordinator.registerCancel(cancel);

    unregister();
    coordinator.cancelPendingSaves();

    expect(cancel).not.toHaveBeenCalled();
  });
});
