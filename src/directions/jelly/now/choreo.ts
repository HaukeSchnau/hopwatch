// The switch choreography: when the running context changes, the old blob hops off
// the stage back into its slot and the new one hops from where it was tapped onto the
// stage. Tiles, beans and the stage register measurable anchors here; the stage plans
// flights and the flyer layer animates them. Purely visual: data changes are instant.

import { type RefObject, useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { create } from 'zustand';

import type { ContextId } from '@/core';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Flight {
  key: number;
  contextId: ContextId;
  /** 'in' lands on the stage, 'out' goes back to a slot (or vanishes). */
  kind: 'in' | 'out';
  from: Rect;
  to: Rect;
  /** The flyer's canvas has drawn; the hop starts once every flight is warm. */
  warm?: boolean;
  /** Arrived; the flyer lingers a few frames on top while the blob below draws. */
  landed?: boolean;
}

interface ChoreoState {
  flights: Flight[];
  /** The context whose blob sits on the stage right now; null while empty or in flight. */
  shownId: ContextId | null;
}

export const useChoreo = create<ChoreoState>(() => ({ flights: [], shownId: null }));

export const FLIGHT_MS = 540;

const anchors = new Map<string, RefObject<View | null>>();

/** Registers a view under `key` so flights can start or end at it. */
export function useAnchor(key: string) {
  const ref = useRef<View>(null);
  useEffect(() => {
    anchors.set(key, ref);
    return () => {
      if (anchors.get(key) === ref) anchors.delete(key);
    };
  }, [key]);
  return ref;
}

export const tileKey = (id: ContextId) => `tile:${id}`;
export const beanKey = (id: ContextId) => `bean:${id}`;

let lastSource: { contextId: ContextId; rect: Promise<Rect | null>; at: number } | null = null;

/**
 * Remembers which element started a context, so its blob can hop out of it. Measures
 * right away: a recents bean disappears as soon as its context runs.
 */
export function noteSource(contextId: ContextId, key: string) {
  lastSource = { contextId, rect: measureAnchor(key), at: Date.now() };
}

export function measureAnchor(key: string): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = anchors.get(key)?.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

let nextKey = 1;
let generation = 0;

/**
 * Plans the hop between `prev` and `next` relative to the flyer layer. Falls back to
 * an instant swap when the stage can't be measured, e.g. while another tab is showing.
 * A newer switch supersedes flights still being planned.
 */
export async function choreograph(prev: ContextId | null, next: ContextId | null, focused: boolean) {
  const mine = ++generation;
  const swap = () => useChoreo.setState({ flights: [], shownId: next });
  if (!focused) return swap();
  const [stage, layer] = await Promise.all([measureAnchor('stage'), measureAnchor('layer')]);
  if (mine !== generation) return;
  if (!stage || !layer) return swap();
  const local = (r: Rect): Rect => ({ ...r, x: r.x - layer.x, y: r.y - layer.y });
  const stageRect = local(stage);

  const flights: Flight[] = [];
  if (prev) {
    const slot = await measureAnchor(tileKey(prev));
    const vanish: Rect = { x: stageRect.x + stageRect.width / 2, y: stageRect.y + stageRect.height * 0.8, width: 0, height: 0 };
    flights.push({ key: nextKey++, contextId: prev, kind: 'out', from: stageRect, to: slot ? local(slot) : vanish });
  }
  if (next) {
    const recent = lastSource && lastSource.contextId === next && Date.now() - lastSource.at < 2000 ? lastSource.rect : null;
    const source = (recent && (await recent)) || (await measureAnchor(tileKey(next)));
    const drop: Rect = { x: stageRect.x + stageRect.width * 0.3, y: stageRect.y - stageRect.height * 0.9, width: stageRect.width * 0.4, height: stageRect.height * 0.4 };
    flights.push({ key: nextKey++, contextId: next, kind: 'in', from: source ? local(source) : drop, to: stageRect });
  }
  if (mine !== generation) return;
  lastSource = null;
  // The stage and tiles keep their blobs until every flyer has drawn (see `warmed`).
  useChoreo.setState({ flights });
  // A flyer that never draws (the app went to the background mid-switch, a hot reload)
  // must not leave the stage empty: finish the switch without the hop.
  setTimeout(() => {
    const s = useChoreo.getState();
    if (mine === generation && (s.shownId !== next || s.flights.length > 0)) swap();
  }, FLIGHT_MS + 900);
}

/** All flyers have drawn their first frame, so the hop can start. */
export const isFlying = (s: ChoreoState) => s.flights.length > 0 && s.flights.every((f) => f.warm);

/**
 * Called by a flyer once its canvas has drawn. When the last one is ready, the blobs
 * leave the stage and the slot in the same frame the flyers appear over them.
 */
export function warmed(flight: Flight) {
  useChoreo.setState((s) => {
    const flights = s.flights.map((f) => (f.key === flight.key ? { ...f, warm: true } : f));
    const go = flights.length > 0 && flights.every((f) => f.warm);
    return { flights, shownId: go ? null : s.shownId };
  });
}

/**
 * Called by a flyer when it arrives. A tile's blob is always mounted, so an outgoing
 * flyer can go at once; the stage mounts a new canvas, so an incoming flyer lingers a
 * few frames on top while it draws.
 */
export function land(flight: Flight) {
  if (flight.kind === 'out') {
    useChoreo.setState((s) => ({ flights: s.flights.filter((f) => f.key !== flight.key) }));
    return;
  }
  useChoreo.setState((s) => ({
    flights: s.flights.map((f) => (f.key === flight.key ? { ...f, landed: true } : f)),
    shownId: flight.contextId,
  }));
  setTimeout(() => useChoreo.setState((s) => ({ flights: s.flights.filter((f) => f.key !== flight.key) })), 70);
}

/** True while `id`'s blob is on the stage or travelling. */
export const isAway = (s: ChoreoState, id: ContextId) =>
  s.shownId === id || (isFlying(s) && s.flights.some((f) => f.contextId === id && !f.landed));
