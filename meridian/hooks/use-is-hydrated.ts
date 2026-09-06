"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server render and the first client render, true afterwards.
 *
 * Lets a component render markup that matches the server on the first pass and
 * only then show client-only state — without the setState-in-an-effect dance
 * that causes a second render of the whole subtree.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
