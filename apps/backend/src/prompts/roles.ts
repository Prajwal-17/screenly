/** Agent-authored screenly-rubric-2.0, integrated from plan/implementation/prompts/role-rubrics.md.
 * Primary guidance: OpenAI prompt engineering and evaluation best practices; Screenly F01/F04/F07.
 * Content is drafted/integrated, not provider-calibrated. */
import {
  RUBRIC_VERSION,
  rolePreset,
  reviewDimensions,
  type InterviewRole,
  type ExperienceLevel,
} from "@repo/shared";

const roleExpectations: Record<
  InterviewRole,
  {
    context: string;
    examples: Record<
      (typeof reviewDimensions)[number],
      Record<ExperienceLevel, string>
    >;
    insufficient: string;
  }
> = {
  Frontend: {
    context:
      "`Frontend`. Objectives: state and asynchronous UI; accessibility and recovery; browser performance and verification. Use the candidate's stated stack where relevant; framework-neutral sound reasoning counts.",
    examples: {
      "technical-understanding": {
        Junior:
          "Explains which component owns a form value and what triggers a render, then names a simple loading state.",
        "Mid-level":
          "Explains request identity, stale-response prevention and error/retry states across component and data boundaries.",
        Senior:
          "Defines state ownership and rendering/network boundaries for concurrent views, with consistency and accessibility implications.",
      },
      "decision-reasoning": {
        Junior:
          "Gives a concrete reason to use local versus shared state in one bounded screen.",
        "Mid-level":
          "Compares data-fetch and mutation approaches against latency, stale data and user feedback.",
        Senior:
          "Weighs maintainability, accessibility, performance and change cost across teams or surfaces without needless architecture.",
      },
      "problem-solving": {
        Junior:
          "Reproduces a broken interaction and checks one likely cause with a browser or test.",
        "Mid-level":
          "Isolates a race or keyboard failure, describes a targeted fix and regression verification.",
        Senior:
          "Forms competing hypotheses from symptoms/measurements, traces through UI/network layers and plans safe rollout/observation.",
      },
      adaptability: {
        Junior:
          "Revises a form flow when the network becomes slow, including a visible waiting or error state.",
        "Mid-level":
          "Revises optimistic updates when two requests can finish out of order and explains recovery.",
        Senior:
          "Reassesses a design after a scale or accessibility constraint, including migration and measurement trade-offs.",
      },
      clarity: {
        Junior:
          "Explains what a user sees and the basic state change in an understandable sequence.",
        "Mid-level":
          "Connects mechanism, failure mode and verification so another engineer can follow it.",
        Senior:
          "States assumptions, trade-offs and decision boundaries plainly enough for implementation and review.",
      },
    },
    insufficient:
      "\u201cReact handles it\u201d without a state/data mechanism. A missing React-specific API name is not a gap if the explanation is otherwise sound. Good changed constraint: a slow response overtakes a newer search or a keyboard-only user must complete the flow.",
  },
  Backend: {
    context:
      "`Backend`. Objectives: API/ownership boundaries; data integrity and concurrency; reliability and recovery. State consistency and delivery assumptions in the scenario; do not treat a vendor feature as universal.",
    examples: {
      "technical-understanding": {
        Junior:
          "Describes request validation, ownership check and a useful error for one endpoint.",
        "Mid-level":
          "Explains transaction/idempotency boundaries for duplicate requests and concurrent writes.",
        Senior:
          "Defines consistency, failure and observability contracts across services and data stores.",
      },
      "decision-reasoning": {
        Junior:
          "Justifies one simple data shape and why validation belongs at the boundary.",
        "Mid-level":
          "Compares transactional and eventual approaches against actual correctness needs and retry behavior.",
        Senior:
          "Weighs availability, consistency, operational burden and migration cost under explicit constraints.",
      },
      "problem-solving": {
        Junior:
          "Reproduces a failed request, checks logs/input and verifies a targeted fix.",
        "Mid-level":
          "Distinguishes timeout from duplicate delivery, proposes safe retry/idempotency and tests race behavior.",
        Senior:
          "Investigates cascading failure with evidence, bounds blast radius and sets recovery/rollback checks.",
      },
      adaptability: {
        Junior: "Adjusts an endpoint when input can be missing or invalid.",
        "Mid-level":
          "Revises the write path when duplicate work or dependency outage is introduced.",
        Senior:
          "Revises consistency or capacity strategy after a changed reliability requirement, including transition risks.",
      },
      clarity: {
        Junior: "Explains request-to-data flow in order.",
        "Mid-level": "States invariants, errors and retry effects coherently.",
        Senior:
          "Makes assumptions, failure boundaries and operational consequences reviewable.",
      },
    },
    insufficient:
      "\u201cuse a database transaction\u201d without saying what must be atomic. Good changed constraint: duplicate events or a temporarily unavailable dependency.",
  },
  "Full-stack": {
    context:
      "`Full-stack`. Objectives: end-to-end contracts; state and auth boundaries; cross-stack diagnosis and recovery. Choose one connected feature slice, not a complete Frontend plus Backend exam.",
    examples: {
      "technical-understanding": {
        Junior:
          "Traces a user action through UI, API validation and a saved result.",
        "Mid-level":
          "Explains auth/session ownership, mutation response and stale client state across layers.",
        Senior:
          "Defines end-to-end invariants and compatibility boundaries for a feature spanning client, service and data.",
      },
      "decision-reasoning": {
        Junior: "Justifies one validation or UI feedback placement.",
        "Mid-level":
          "Compares optimistic and confirmed updates with failure and recovery behavior.",
        Senior:
          "Weighs consistency, rollout compatibility, security and user experience across teams and versions.",
      },
      "problem-solving": {
        Junior:
          "Checks the request and server response when the UI looks wrong.",
        "Mid-level":
          "Correlates client/network/server evidence to isolate a stale or duplicate mutation and verifies a fix.",
        Senior:
          "Uses cross-layer signals to narrow competing causes, reduce impact and stage a safe repair.",
      },
      adaptability: {
        Junior: "Adds an error path when a save fails.",
        "Mid-level":
          "Revises the flow when a session expires or concurrent edits occur.",
        Senior:
          "Revises contract/rollout strategy for old clients or partial migration while preserving user data.",
      },
      clarity: {
        Junior: "Describes the feature path in sequence.",
        "Mid-level":
          "Distinguishes responsibilities and failure points so the approach can be implemented.",
        Senior:
          "Communicates invariants and trade-offs to client and backend owners without obscuring uncertainty.",
      },
    },
    insufficient:
      "listing UI and API technologies without explaining their contract. Good changed constraint: expired authentication during an optimistic save or an old client using the prior response shape.",
  },
  "Mobile Engineering": {
    context:
      "`Mobile Engineering`. Objectives: lifecycle/application state; offline synchronization; device constraints and recovery. Use stated iOS, Android or cross-platform knowledge. If platform details matter and are missing, establish them naturally; do not infer a platform from the role.",
    examples: {
      "technical-understanding": {
        Junior:
          "Explains what state survives a screen recreation/backgrounding and what needs local persistence.",
        "Mid-level":
          "Explains offline queue/sync behavior, duplicate requests and conflict handling.",
        Senior:
          "Defines state, sync and release-compatibility boundaries across devices/app versions.",
      },
      "decision-reasoning": {
        Junior:
          "Gives a reason to store a small value locally rather than only in view state.",
        "Mid-level":
          "Compares immediate server writes with offline-first behavior for the stated product need.",
        Senior:
          "Weighs consistency, battery/storage, privacy and compatibility under actual device/network constraints.",
      },
      "problem-solving": {
        Junior:
          "Reproduces a failure after backgrounding and checks lifecycle/state restoration.",
        "Mid-level":
          "Isolates a network/lifecycle race and verifies it on meaningful device conditions.",
        Senior:
          "Uses device telemetry and staged release evidence to diagnose and recover without broad regressions.",
      },
      adaptability: {
        Junior: "Adjusts UI when a permission is denied.",
        "Mid-level":
          "Revises sync when connectivity drops or changes are made on two devices.",
        Senior:
          "Revises rollout/sync design when older clients coexist with a changed server contract.",
      },
      clarity: {
        Junior:
          "Explains visible behavior across foreground/background states.",
        "Mid-level":
          "Connects device event, persisted state, sync and recovery in order.",
        Senior:
          "States platform assumptions and user-facing consequences for product and service collaborators.",
      },
    },
    insufficient:
      "\u201ccache it\u201d without saying what is cached, when it is valid or how conflicts resolve. Good changed constraint: offline edit followed by a conflicting edit on another device.",
  },
  "DevOps / Platform Engineering": {
    context:
      "`DevOps / Platform Engineering`. Objectives: safe delivery and rollback; operational diagnosis; failure isolation and recovery. Judge hypotheses and justified actions, not vendor-command recall.",
    examples: {
      "technical-understanding": {
        Junior:
          "Describes a basic deploy path, health signal and rollback trigger.",
        "Mid-level":
          "Explains pipeline/environment parity, service dependencies and useful metrics/logs/traces.",
        Senior:
          "Defines reliability objectives, release controls, capacity and failure-domain boundaries.",
      },
      "decision-reasoning": {
        Junior:
          "Justifies checking a health indicator before expanding a rollout.",
        "Mid-level":
          "Compares canary/rollback options against traffic, data compatibility and recovery time.",
        Senior:
          "Weighs delivery speed, failure isolation, operational cost and change coordination under explicit risk.",
      },
      "problem-solving": {
        Junior:
          "Checks recent change and one service signal before proposing rollback.",
        "Mid-level":
          "Correlates timing and signals, tests a dependency hypothesis and chooses a reversible action.",
        Senior:
          "Separates correlated from causal signals, contains impact, verifies recovery and plans prevention without premature certainty.",
      },
      adaptability: {
        Junior: "Stops rollout when a health check fails.",
        "Mid-level":
          "Revises response when a dependency fails despite healthy app nodes.",
        Senior:
          "Revises mitigation when signals conflict or rollback risks incompatible data, explaining the safer path.",
      },
      clarity: {
        Junior: "Gives an ordered incident/deploy explanation.",
        "Mid-level":
          "States hypothesis, evidence, action and verification distinctly.",
        Senior:
          "Communicates uncertainty, risk and decision ownership clearly during recovery.",
      },
    },
    insufficient:
      "\u201crestart the pods\u201d without a hypothesis or recovery check. Good changed constraint: an unsuccessful rollout with conflicting application and dependency signals.",
  },
  "Data Engineering": {
    context:
      "`Data Engineering`. Objectives: pipeline contracts and quality; schema evolution and repeated input; backfills and recovery verification. State source timing/delivery assumptions; avoid unrelated ML/statistics trivia.",
    examples: {
      "technical-understanding": {
        Junior:
          "Describes source, transformation, destination and a basic quality check.",
        "Mid-level":
          "Explains deduplication, late input, schema changes and rerun behavior for a pipeline.",
        Senior:
          "Defines data contracts, lineage and reproducible recovery across producers, storage and consumers.",
      },
      "decision-reasoning": {
        Junior:
          "Justifies one validation or partition choice from a stated query need.",
        "Mid-level":
          "Compares batch/streaming and storage layouts against freshness, cost and correctness.",
        Senior:
          "Weighs correctness, latency, backfill cost and consumer compatibility with explicit operational constraints.",
      },
      "problem-solving": {
        Junior: "Checks a missing row against input and transformation logs.",
        "Mid-level":
          "Isolates duplicate/late data, designs a safe backfill and verifies counts or invariants.",
        Senior:
          "Traces a quality incident across lineage, contains downstream impact and validates replay/recovery at scale.",
      },
      adaptability: {
        Junior: "Adjusts validation for a newly optional source field.",
        "Mid-level":
          "Revises ingestion when an upstream schema changes or a retry duplicates input.",
        Senior:
          "Revises contract/evolution strategy for multiple consumers and a long backfill, including rollback.",
      },
      clarity: {
        Junior: "Explains the data path and check in order.",
        "Mid-level":
          "Connects source assumptions, transform rules, failure and verification.",
        Senior:
          "Makes correctness guarantees and trade-offs understandable to producers and consumers.",
      },
    },
    insufficient:
      "\u201cexactly once\u201d without a delivery mechanism and failure assumptions. Good changed constraint: late arrivals during a partial backfill or an upstream field changing type.",
  },
};

export function roleRubric(
  role: InterviewRole,
  level: ExperienceLevel,
): string {
  const selected = roleExpectations[role];
  if (!selected || !["Junior", "Mid-level", "Senior"].includes(level))
    throw new Error("Unsupported frozen role or level.");
  const preset = rolePreset(role);
  const expectations = reviewDimensions.map(
    (dimension) =>
      `${role}:${dimension}: ${selected.examples[dimension][level]}`,
  );
  return [
    `Rubric ${RUBRIC_VERSION}. Selected role: ${role}. Explicit target: ${level}.`,
    `Objectives: ${preset.objectives.join("; ")}.`,
    selected.context,
    "Judge reasoning at the frozen target level. These examples illustrate sufficient evidence, not required wording or a checklist. Profile claims, terms alone, and interviewer-supplied answers do not establish competence. A harder optional probe does not raise the bar. Clarity is not accent or confidence. Adaptability requires a real changed constraint and fair response opportunity.",
    ...expectations,
    `Insufficient and useful constraint example: ${selected.insufficient}`,
  ].join("\n");
}
