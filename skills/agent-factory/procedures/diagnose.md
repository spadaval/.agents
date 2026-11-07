# Diagnose

Use this subskill when something fails and the cause is not yet understood: a
bug, failing check, performance regression, integration failure or unexpected
behavior. The goal is a verified root cause; a patch that makes the symptom
disappear is not a diagnosis.

## Method

1. **Pin down the symptom:** the observed and expected behavior and the impact.
   Read the complete error, trace and logs, and recent changes.
2. **Reproduce it** consistently, with a test, script or command. If you cannot,
   report what evidence is missing rather than guessing.
3. **Trace backward.** Follow the bad value or state back across component
   boundaries. Where a multi-component system hides where things go wrong,
   instrument the boundaries and record inputs and outputs instead of inferring
   from the final symptom.
4. **Test hypotheses.** Keep competing explanations in mind and test first the
   cheapest one that tells them apart, changing one variable at a time. If
   several fail, question the framing, the reproduction or your model of the
   system before trying more.

## Fixing

If the cause is verified, the fix is local and repair is within your scope, turn
the reproduction into a regression test, watch it fail, fix the bug and watch it
pass. If the cause points to a design flaw, needs a breaking change or lies
outside your scope, stop before changing production code and hand back the
cause, a recommended repair boundary and the regression proof a fix should
satisfy.

## Handoff

Also report the reproduction, the hypotheses tested and their results, the root
cause with your confidence, and what is fact versus inference.
