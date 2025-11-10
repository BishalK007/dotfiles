import { execAsync, Binding, bind } from "astal";
import { createLogger } from "./logger";

const logger = createLogger("Utils");

// Reads the scale from environment variable WAYLAND_MONITOR_SCALE, defaults to 1.0
function getScale(): number {
  // Use GLib to get the environment variable WAYLAND_MONITOR_SCALE
  // @ts-ignore
  const GLib = imports.gi.GLib;
  const scaleStr = GLib.getenv("WAYLAND_MONITOR_SCALE");
  const scale = scaleStr ? parseFloat(scaleStr) : 1.0;
  return isNaN(scale) || scale <= 0 ? 1.0 : scale;
}

// Scales a single integer size by the scale factor from WAYLAND_MONITOR_SCALE
export function scaleSizeNumber(size: number): number {
  const scale = getScale();
  let adjustedValue = Math.floor(size / scale);
  if (adjustedValue === 0) {
    return 1;
  }
  return adjustedValue;
}
// Scales all "<number>px" values in the input CSS string by the scale factor
export function cssPreprocessor(
  css: string,
  vars: Record<string, string>,
): string {
  // Scale preprocessor
  const scale = getScale();
  const re = /(\d+\.?\d*)px/g;

  const scale_processed = css.replace(re, (match, pxValueStr) => {
    const pxValue = parseFloat(pxValueStr);
    if (isNaN(pxValue)) return match;
    let adjustedValue = Math.floor(pxValue / scale);
    if (adjustedValue === 0) adjustedValue = 1;
    return `${adjustedValue}px`;
  });

  // Placeholder preporcessor
  // in css preprocessors are defined as @VAR_NAME@
  // this will replace them with the value of the variable
  // print
  const var_processed = scale_processed.replace(
    /@([A-Z0-9_]+)@/g,
    (_, varName) => {
      return vars[varName] ?? "";
    },
  );

  const result = var_processed;
  // Optionally log the result for debugging
  // print("\n\n _________ Scaled CSS ________\n" + result + "\n _____________________________");
  return result;
}

export async function sh(cmd: string | string[]): Promise<string> {
  return execAsync(cmd).catch((err) => {
    logger.error(
      `Command failed: ${typeof cmd === "string" ? cmd : cmd.join(" ")}`,
      err,
    );
    return "";
  });
}

/**
 * Merges two bindings or subscribables/connectables into a new Binding.
 * The merged binding emits a tuple [a, b] or you can provide a custom merge function.
 */

export interface Subscribable<T = unknown> {
  subscribe(callback: (value: T) => void): () => void;
  get(): T;
  [key: string]: any;
}

export interface Connectable {
  connect(signal: string, callback: (...args: any[]) => unknown): number;
  disconnect(id: number): void;
  [key: string]: any;
}

export function mergeBindings<T extends any[], R = T>(
  bindings: {
    [K in keyof T]: Binding<T[K]> | Subscribable<T[K]> | Connectable;
  },
  mergeFn?: (...values: T) => R,
): Binding<R> {
  const bindingList = bindings.map((b) =>
    b instanceof Binding ? b : Binding.bind(b as any),
  );

  const getMerged = () => {
    const values = bindingList.map((b) => b.get()) as T;
    return mergeFn ? mergeFn(...values) : (values as unknown as R);
  };

  let callback: ((v: R) => void) | null = null;
  const subscribable: Subscribable<R> = {
    get: getMerged,
    subscribe(cb: (v: R) => void) {
      callback = cb;
      const unsubs = bindingList.map((b) =>
        b.subscribe(() => callback && callback(getMerged())),
      );
      return () => {
        unsubs.forEach((unsub) => unsub());
        callback = null;
      };
    },
  };

  return Binding.bind(subscribable);
}

/**
 * Creates a chained binding that follows a path of properties with full reactivity.
 * Each level in the chain creates a new binding that updates when that property changes.
 * When an intermediate object changes, the entire chain from that point is re-established.
 *
 * @param source - The initial bindable object
 * @param chain - Array of property names to follow in sequence
 * @returns A binding that follows the property chain and updates on any change
 *
 * @example
 * // chainedBinding(bt, ["adapter", "discovering"])
 * // Creates: bind(bt, "adapter") -> when adapter changes -> bind(newAdapter, "discovering")
 * // Both adapter changes and discovering changes will trigger updates
 */
export function chainedBinding<T = any>(
  source: any,
  chain: string[],
): Binding<T> {
  if (chain.length === 0) {
    throw new Error(
      "chainedBinding requires at least one property in the chain",
    );
  }

  if (chain.length === 1) {
    // Simple case: just bind to the single property
    return bind(source, chain[0]);
  }

  // For multiple properties, we need to create a dynamic binding
  const subscribable: Subscribable<T> = {
    get(): T {
      let current = source;
      for (const prop of chain) {
        if (current == null) {
          return undefined as T;
        }
        current = current[prop];
      }
      return current as T;
    },

    subscribe(callback: (value: T) => void): () => void {
      let currentSubs: Array<() => void> = [];

      const rebuildChain = () => {
        // Clean up existing subscriptions
        currentSubs.forEach((unsub) => unsub());
        currentSubs = [];

        let current = source;
        let chainIndex = 0;

        const subscribeToLevel = (obj: any, propIndex: number) => {
          if (propIndex >= chain.length || obj == null) {
            // End of chain or null object, call callback with final value
            callback(subscribable.get());
            return;
          }

          const prop = chain[propIndex];

          try {
            // Create binding for this level
            const levelBinding = bind(obj, prop);

            // Subscribe to changes at this level
            const unsub = levelBinding.subscribe((newValue: any) => {
              // When this level changes, rebuild the rest of the chain
              rebuildChain();
            });

            currentSubs.push(unsub);

            // Continue to next level with current value
            const currentValue = levelBinding.get();
            subscribeToLevel(currentValue, propIndex + 1);
          } catch (e) {
            // If we can't bind to this object, just call callback with current value
            callback(subscribable.get());
          }
        };

        // Start the chain
        subscribeToLevel(source, 0);
      };

      rebuildChain();

      // Return cleanup function
      return () => {
        currentSubs.forEach((unsub) => unsub());
        currentSubs = [];
      };
    },
  };

  return Binding.bind(subscribable);
}

/**
 * Alternative simpler version for when you know the chain depth at compile time.
 * Provides better type safety for common use cases.
 */
export function chainedBinding2<S, P1 extends keyof S>(
  source: Binding<S> | S,
  prop1: P1,
): Binding<S[P1]>;

export function chainedBinding2<S, P1 extends keyof S, P2 extends keyof S[P1]>(
  source: Binding<S> | S,
  prop1: P1,
  prop2: P2,
): Binding<S[P1][P2]>;

export function chainedBinding2<
  S,
  P1 extends keyof S,
  P2 extends keyof S[P1],
  P3 extends keyof S[P1][P2],
>(
  source: Binding<S> | S,
  prop1: P1,
  prop2: P2,
  prop3: P3,
): Binding<S[P1][P2][P3]>;

export function chainedBinding2(source: any, ...props: string[]): Binding<any> {
  return chainedBinding(source, props) as Binding<any>;
}
