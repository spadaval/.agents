# Diagnose

Use this subskill when something fails and the cause is not yet understood:
a bug, failing check, performance regression, integration failure, or
unexpected behavior. The goal is a verified root cause. A patch that makes the
symptom disappear is not a diagnosis.

## Method

1. **Pin down the symptom.** State the observed behavior, the expected
   behavior, and the impact. Read the complete error, trace, and logs, and
   check recent changes.
2. **Reproduce it.** Get a consistent failing reproduction, such as a test,
   script, or command. If you cannot, report what evidence is missing rather
   than guessing.
3. **Trace backward.** Follow the bad value or state back across component
   boundaries. Where a multi-component system hides where things go wrong,
   instrument the boundaries and record inputs and outputs instead of
   inferring from the final symptom.
4. **Test hypotheses.** Keep competing explanations in mind and test the
   cheapest one that tells them apart first. Change one variable at a time.
   If several hypotheses fail, step back and question the framing, the
   reproduction, or your model of the system before trying more.

## Fixing

If the cause is verified, the fix is local, and repair is within your scope,
you may fix it. Turn the reproduction into a regression test, watch it fail,
fix the bug, and watch it pass. The fix still needs independent review like
any other code.

If the cause points to a design flaw, needs a breaking change, or lies outside
your scope, stop before changing production code. Hand back the cause, a
recommended repair boundary, and the regression proof a fix should satisfy.

Remove temporary instrumentation before finishing.

## Handoff

Also report the reproduction, hypotheses tested and their results, the root
cause with your confidence, and what is established fact versus inference.
