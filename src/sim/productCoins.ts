// Product coins from the model (SIMULATION §8, audit batch D): one quality
// scale. A product's coins are its base coins (CONTENT §4, or the roll a
// developed product got) moved by how far the active model sits from the
// market's bar: MODEL_COINS.perPoint coins per radar point of
// quality − modelBase − (bar − qualityRef), clamped to 1–5. Training a better
// model raises every product's coins; falling behind the frontier lowers them.
import { MODEL_COINS, MODEL_EFFECTS, PRODUCTS_RATING } from '../config/balance';
import type { ProductSpec } from '../data/products';
import { clamp } from './math';
import { starsOf } from './products';
import type { GameState } from './state';
import { activeModel, modelQuality, qualityBar } from './underwriting';

/** Coins every product gains (or loses) from the active model this week. */
export function modelCoinLift(state: GameState): number {
  const gap =
    modelQuality(activeModel(state)) -
    PRODUCTS_RATING.modelBase -
    (qualityBar(state) - MODEL_EFFECTS.qualityRef);
  return MODEL_COINS.perPoint * gap;
}

/** A product's coins, 1–5: its base coins plus the model's lift. */
export function coinsOf(state: GameState, spec: ProductSpec, lift = modelCoinLift(state)): number {
  return clamp(starsOf(state, spec) + lift, 1, 5);
}
