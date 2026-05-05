'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getBotGuard,
  setChallengeRequiredCallback,
  type BotAssessment,
  type RiskLevel,
} from '@/lib/botManagement';

export interface BotGuardHook {
  assessment: BotAssessment;
  /** true when the challenge modal should be shown */
  challengeNeeded: boolean;
  /** risk level at the moment the challenge was triggered */
  challengeRiskLevel: 'medium' | 'high' | null;
  /** Call when the user successfully completes the challenge */
  onChallengeSolved(): void;
  /** Call when the user dismisses the challenge modal */
  onChallengeDismissed(): void;
}

export function useBotGuard(): BotGuardHook {
  const guard = getBotGuard();
  const [assessment, setAssessment] = useState<BotAssessment>(() => guard.assess());
  const [challengeNeeded, setChallengeNeeded] = useState(false);
  const [triggerRisk, setTriggerRisk] = useState<RiskLevel | null>(null);

  // Wire the singleton callback so BotGuard can open the modal from anywhere
  // (e.g. from inside a useContract callback).
  useEffect(() => {
    setChallengeRequiredCallback(() => {
      const a = guard.assess();
      setTriggerRisk(a.riskLevel as RiskLevel);
      setChallengeNeeded(true);
    });
    return () => setChallengeRequiredCallback(null);
  }, [guard]);

  // Refresh the assessment every 5 s so the UI stays current as the
  // behavioral score accumulates.
  useEffect(() => {
    const id = setInterval(() => setAssessment(guard.assess()), 5_000);
    return () => clearInterval(id);
  }, [guard]);

  const onChallengeSolved = useCallback(() => {
    guard.markSolved();
    setChallengeNeeded(false);
    setTriggerRisk(null);
    setAssessment(guard.assess());
  }, [guard]);

  const onChallengeDismissed = useCallback(() => {
    setChallengeNeeded(false);
    setTriggerRisk(null);
  }, []);

  const challengeRiskLevel: 'medium' | 'high' | null =
    triggerRisk === 'high' ? 'high' :
    triggerRisk === 'medium' ? 'medium' :
    null;

  return {
    assessment,
    challengeNeeded,
    challengeRiskLevel,
    onChallengeSolved,
    onChallengeDismissed,
  };
}
