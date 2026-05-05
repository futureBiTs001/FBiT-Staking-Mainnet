/**
 * Layer 7 — TF.js Binary Bot Classifier
 *
 * Architecture: Dense(7 → 4, ReLU) → Dense(4 → 1, Sigmoid)
 *
 * Pre-tuned weights encode domain knowledge about bot patterns:
 *   - Automation tool markers (webdriver, playwright…) → strong bot signal
 *   - Low behavioral human score                       → moderate bot signal
 *   - Very regular mouse velocity / click timing       → bot signal
 *   - Sparse interaction before first action            → suspicious
 *   - Action attempted < 3 s after page load            → suspicious
 *
 * Loaded lazily via dynamic import so it never blocks the initial bundle.
 * Online learning: one gradient step per confirmed outcome (challenge solved
 * → human label; definite-automation fingerprint → bot label).
 */

import type { BehaviorFeatures } from '@/lib/botManagement';
import type * as TF from '@tensorflow/tfjs';

// ─────────────────────────────────────────────────────────────────────────────
// Pre-tuned weights (manually calibrated, verified against test cases)
// ─────────────────────────────────────────────────────────────────────────────

// Layer 0 kernel [7 inputs × 4 neurons]
// Rows = input features: hasAuto | fpNorm | humanInv | moveReg | clkReg | sparse | fastAction
// Cols = hidden neurons: N0(fingerprint) | N1(behavior) | N2(speed) | N3(combined)
const W0 = [
  [3.0,  0.3,  0.2,  1.0],   // hasAutomation
  [2.5,  0.5,  0.3,  1.2],   // fpScoreNorm
  [0.3,  2.0,  0.8,  0.8],   // humanScoreInv
  [0.0,  1.5,  0.0,  0.5],   // moveRegularity
  [0.0,  1.5,  0.0,  0.5],   // clickRegularity
  [0.2,  1.0,  1.2,  0.7],   // moveSparse
  [0.1,  0.5,  2.5,  0.6],   // actionTooFast
];
const B0 = [-0.5, -1.5, -0.8, -1.5];

// Layer 1 kernel [4 neurons × 1 output]
const W1 = [[1.8], [1.5], [1.2], [1.5]];
const B1 = [-2.5];

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

let _tf:    typeof TF | null = null;
let _model: TF.Sequential  | null = null;

async function loadTf(): Promise<typeof TF> {
  if (!_tf) _tf = await import('@tensorflow/tfjs');
  return _tf;
}

async function getModel(): Promise<TF.Sequential> {
  if (_model) return _model;
  const tf = await loadTf();

  const model = tf.sequential({
    layers: [
      tf.layers.dense({ units: 4, activation: 'relu',    inputShape: [7] }),
      tf.layers.dense({ units: 1, activation: 'sigmoid'                  }),
    ],
  });

  model.layers[0].setWeights([
    tf.tensor2d(W0, [7, 4]),
    tf.tensor1d(B0),
  ]);
  model.layers[1].setWeights([
    tf.tensor2d(W1, [4, 1]),
    tf.tensor1d(B1),
  ]);

  // Compile for online fine-tuning
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss:      'binaryCrossentropy',
  });

  _model = model;
  return model;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Returns bot probability 0–1. Falls back to 0.5 on any error. */
export async function predictBotProbability(features: BehaviorFeatures): Promise<number> {
  try {
    const tf    = await loadTf();
    const model = await getModel();
    const xs    = tf.tensor2d([toArray(features)], [1, 7]);
    const pred  = model.predict(xs) as TF.Tensor;
    const [val] = await pred.data();
    xs.dispose();
    pred.dispose();
    return parseFloat(val.toFixed(4));
  } catch {
    return 0.5;
  }
}

/**
 * One gradient-descent step using a confirmed label.
 * Call with isBot=false after a user passes the challenge.
 * Call with isBot=true when a session is definitively flagged (score ≥ 80).
 */
export async function learnFromOutcome(
  features: BehaviorFeatures,
  isBot: boolean,
): Promise<void> {
  try {
    const tf    = await loadTf();
    const model = await getModel();
    const xs    = tf.tensor2d([toArray(features)], [1, 7]);
    const ys    = tf.tensor2d([[isBot ? 1 : 0]], [1, 1]);
    await model.fit(xs, ys, { epochs: 1, verbose: 0 as any });
    xs.dispose();
    ys.dispose();
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toArray(f: BehaviorFeatures): number[] {
  return [
    c(f.hasAutomation),
    c(f.fpScoreNorm),
    c(f.humanScoreInv),
    c(f.moveRegularity),
    c(f.clickRegularity),
    c(f.moveSparse),
    c(f.actionTooFast),
  ];
}

function c(v: number) { return Math.max(0, Math.min(1, v)); }
