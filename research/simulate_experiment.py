"""
simulate_experiment.py
══════════════════════════════════════════════════════════════════════════════
DGP (Data Generating Process) for the Pathfinder AI A/B Test
Portfolio project: A/B Testing + Causal Inference on Pathfinder AI

GROUND TRUTH (document this in the paper):
  Base completion rate              : 0.50 (+activity confounder, max +0.15)
  Treatment lift by priority        : high=+0.07, medium=+0.03, low=+0.00
  Priority distribution (AI-assigned): high=55%, medium=35%, low=10%
  True ATE                          : 0.55×0.07 + 0.35×0.03 + 0.10×0.00 = 0.049

  This lets DoWhy/EconML "recover" a known effect — the core demo of the paper.

Schema matches Supabase production tables:
  tasks            → id, project_id, user_id, estado, prioridad,
                     created_at, completed_at, deadline, es_clave, suggested
  experiment_events→ user_id, task_id, event_type, variant,
                     previous_value, new_value, created_at

Author : Ernie [Apellido]
Seed   : 42 (fixed for reproducibility)
"""

import uuid
import numpy as np
import pandas as pd
from pathlib import Path

# ── Reproducibility ───────────────────────────────────────────────────────────
SEED = 42
rng  = np.random.default_rng(SEED)

# ── DGP Parameters ────────────────────────────────────────────────────────────
N_USERS           = 3_000
WEEKS             = 4
EXPERIMENT_START  = pd.Timestamp("2026-06-23", tz="UTC")

# Priority distribution — mirrors realistic AI-assigned distribution
PRIORITY_LABELS = ["high", "medium", "low"]
PRIORITY_PROBS  = [0.55,   0.35,     0.10]   # must sum to 1

# Completion probability — ground truth causal structure
BASE_P            = 0.50                                   # intercept
TREATMENT_LIFT    = {"high": 0.07, "medium": 0.03, "low": 0.00}

# Theoretical ATE: E[lift] = Σ P(priority_k) × lift_k
TRUE_ATE = sum(p * TREATMENT_LIFT[lbl]
               for p, lbl in zip(PRIORITY_PROBS, PRIORITY_LABELS))

# Confounder: activity_score ∈ [0, 1]
#   → drives tasks_per_week (3–15) AND adds up to +0.15 to base completion
#   → observable from the data (proxy: avg weekly tasks), key for CATE analysis
ACTIVITY_MAX_BOOST = 0.15    # max confounder effect on completion probability

# Task properties
DEADLINE_PROB        = 0.60   # P(fecha_limite is not null)
ES_CLAVE_PROB        = 0.20
SUGGESTED_PROB       = 0.30
PRIORITY_CHANGE_PROB = 0.15   # P(user overrides AI priority after creation)


# ── Helpers ───────────────────────────────────────────────────────────────────

def uid() -> str:
    return str(uuid.uuid4())


# ── Step 1: Simulate users ────────────────────────────────────────────────────

def simulate_users() -> pd.DataFrame:
    """
    Generate N_USERS with:
      - variant: 50/50 random assignment (user-level randomization)
      - activity_score: Beta(2, 3), mean ≈ 0.40
          → right-skewed: most users moderately active, few power users
      - tasks_per_week: 3–15, monotone in activity_score
    """
    user_ids = [uid() for _ in range(N_USERS)]

    # 50/50 split, shuffled
    variants = (["control"] * (N_USERS // 2)
                + ["treatment_ai"] * (N_USERS - N_USERS // 2))
    rng.shuffle(variants)

    # Confounder: Beta(2,3) gives realistic right-skew
    activity_scores = rng.beta(2, 3, size=N_USERS)  # mean ≈ 0.40

    # Tasks per week: maps [0,1] activity → [3,15] tasks
    tasks_per_week = np.clip(
        np.round(3 + 12 * activity_scores).astype(int), 3, 15
    )

    return pd.DataFrame({
        "user_id":        user_ids,
        "variant":        variants,
        "activity_score": activity_scores,   # confounder (keep for CATE)
        "tasks_per_week": tasks_per_week,    # observable proxy for activity
    })


# ── Step 2: Simulate tasks & events ──────────────────────────────────────────

def simulate_tasks_and_events(
    df_users: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    For each user, simulate WEEKS weeks of tasks.

    Causal mechanism (the heart of the DGP):
      p_complete = BASE_P + ACTIVITY_MAX_BOOST × activity_score   [always]
                 + TREATMENT_LIFT[priority]                        [treatment arm only]

    This means:
      - Activity is a confounder: affects both task volume and completion rate.
      - Randomization balances activity across arms → unbiased ATE in expectation.
      - Useful for CATE: activity_score moderates treatment effect (richer users
        may respond differently).
    """
    tasks_rows:  list[dict] = []
    events_rows: list[dict] = []

    for _, user in df_users.iterrows():
        user_id      = user["user_id"]
        variant      = user["variant"]
        activity     = float(user["activity_score"])
        weekly_tasks = int(user["tasks_per_week"])
        project_id   = uid()   # one project per user (typical Pathfinder usage)

        # ── Variant assignment event (one per user, at experiment start) ──────
        events_rows.append({
            "user_id":        user_id,
            "task_id":        None,
            "event_type":     "variant_assigned",
            "variant":        variant,
            "previous_value": None,
            "new_value":      variant,
            "created_at":     EXPERIMENT_START,
        })

        for week in range(WEEKS):
            week_start = EXPERIMENT_START + pd.Timedelta(weeks=week)

            # Slight Poisson-like jitter around weekly mean
            n_tasks = int(rng.integers(
                max(1, weekly_tasks - 2),
                min(15, weekly_tasks + 3) + 1   # +1 because integers is exclusive
            ))

            for _ in range(n_tasks):
                task_id    = uid()
                created_at = week_start + pd.Timedelta(
                    seconds=int(rng.integers(0, 7 * 24 * 3600))
                )

                # Priority — same distribution in both arms
                # (treatment effect is on outcomes, not on priority assignment)
                prioridad = str(rng.choice(PRIORITY_LABELS, p=PRIORITY_PROBS))

                # Optional deadline
                if rng.random() < DEADLINE_PROB:
                    days_ahead   = int(rng.integers(3, 22))  # 3–21 days
                    deadline_val = str(
                        (created_at + pd.Timedelta(days=days_ahead)).date()
                    )
                else:
                    deadline_val = None

                es_clave  = bool(rng.random() < ES_CLAVE_PROB)
                suggested = bool(rng.random() < SUGGESTED_PROB)

                # ── CAUSAL MECHANISM ─────────────────────────────────────────
                p_complete = BASE_P + ACTIVITY_MAX_BOOST * activity
                if variant == "treatment_ai":
                    p_complete += TREATMENT_LIFT[prioridad]
                p_complete = float(np.clip(p_complete, 0.0, 1.0))

                completed = bool(rng.random() < p_complete)

                if completed:
                    estado = "done"
                    # Time-to-completion: exponential with median ~33h, max 7 days
                    hours  = float(np.clip(rng.exponential(scale=48), 1, 7 * 24))
                    completed_at: pd.Timestamp | None = created_at + pd.Timedelta(hours=hours)
                else:
                    estado       = str(rng.choice(["todo", "doing"], p=[0.65, 0.35]))
                    completed_at = None

                tasks_rows.append({
                    # ── matches production schema ────────────────────────────
                    "id":           task_id,
                    "project_id":   project_id,
                    "user_id":      user_id,
                    "estado":       estado,
                    "prioridad":   prioridad,
                    "created_at":   created_at,
                    "completed_at": completed_at,
                    "deadline":     deadline_val,
                    "es_clave":     es_clave,
                    "suggested":    suggested,
                    # ── analysis columns (not in prod schema) ────────────────
                    "variant":      variant,       # denormalized for easy joins
                    "p_complete":   round(p_complete, 4),  # ground truth label
                    "activity_score": round(activity, 4),  # confounder for CATE
                })

                # ── Events ───────────────────────────────────────────────────

                # task_created
                events_rows.append({
                    "user_id":        user_id,
                    "task_id":        task_id,
                    "event_type":     "task_created",
                    "variant":        variant,
                    "previous_value": None,
                    "new_value":      prioridad,
                    "created_at":     created_at,
                })

                # task_completed
                if completed and completed_at is not None:
                    events_rows.append({
                        "user_id":        user_id,
                        "task_id":        task_id,
                        "event_type":     "task_completed",
                        "variant":        variant,
                        "previous_value": "doing",
                        "new_value":      "done",
                        "created_at":     completed_at,
                    })

                # priority_changed — user overrides AI (15% of tasks)
                if rng.random() < PRIORITY_CHANGE_PROB:
                    other_priorities = [p for p in PRIORITY_LABELS if p != prioridad]
                    new_priority     = str(rng.choice(other_priorities))
                    change_at        = created_at + pd.Timedelta(
                        hours=float(rng.integers(1, 49))
                    )
                    events_rows.append({
                        "user_id":        user_id,
                        "task_id":        task_id,
                        "event_type":     "priority_changed",
                        "variant":        variant,
                        "previous_value": prioridad,
                        "new_value":      new_priority,
                        "created_at":     change_at,
                    })

    return pd.DataFrame(tasks_rows), pd.DataFrame(events_rows)


# ── Step 3: Summary ───────────────────────────────────────────────────────────

def print_summary(df_tasks: pd.DataFrame, df_users: pd.DataFrame) -> None:
    """Sanity-check output. Observed ATE should be close to TRUE_ATE."""
    sep = "═" * 62

    df_tasks = df_tasks.copy()
    df_tasks["completed"] = (df_tasks["estado"] == "done").astype(int)

    # ── Completion rate per variant ───────────────────────────────────────────
    cr = df_tasks.groupby("variant")["completed"].mean()
    obs_ate = cr["treatment_ai"] - cr["control"]

    # ── Priority breakdown in treatment ──────────────────────────────────────
    tx = df_tasks[df_tasks["variant"] == "treatment_ai"]
    cr_by_priority = tx.groupby("prioridad")["completed"].mean().reindex(PRIORITY_LABELS)

    # ── Activity quartile analysis (confounder check) ─────────────────────────
    df_tasks["activity_q"] = pd.qcut(
        df_tasks["activity_score"], q=4, labels=["Q1","Q2","Q3","Q4"]
    )
    cr_by_activity = df_tasks.groupby(["activity_q","variant"])["completed"].mean().unstack()

    print(f"\n{sep}")
    print("  PATHFINDER A/B TEST — SIMULATION SUMMARY")
    print(sep)

    print(f"\n{'─'*30} DGP PARAMETERS {'─'*15}")
    print(f"  Seed           : {SEED}")
    print(f"  N users        : {N_USERS:,}  ({N_USERS//2:,} per arm)")
    print(f"  Weeks          : {WEEKS}")
    print(f"  Base P(complete): {BASE_P:.2f}")
    print(f"  True ATE       : {TRUE_ATE:+.4f}  "
          f"(= 0.55×0.07 + 0.35×0.03 + 0.10×0.00)")

    print(f"\n{'─'*30} DATASET SIZE {'─'*18}")
    n_tasks  = len(df_tasks)
    n_events = None   # printed separately
    print(f"  Tasks          : {n_tasks:,}")
    tasks_per_arm = df_tasks.groupby("variant")["id"].count()
    for v, n in tasks_per_arm.items():
        print(f"    {v:<15}: {n:,}")

    print(f"\n{'─'*30} COMPLETION RATES {'─'*14}")
    for v, rate in cr.items():
        print(f"  {v:<18}: {rate:.4f}  ({rate*100:.2f}%)")

    print(f"\n{'─'*30} ATE ESTIMATE {'─'*18}")
    print(f"  Observed ATE   : {obs_ate:+.4f}")
    print(f"  True ATE (DGP) : {TRUE_ATE:+.4f}")
    print(f"  Δ (bias)       : {abs(obs_ate - TRUE_ATE):.4f}")

    print(f"\n{'─'*30} TREATMENT ARM — BY PRIORITY {'─'*3}")
    for p in PRIORITY_LABELS:
        rate = cr_by_priority.get(p, float("nan"))
        lift = TREATMENT_LIFT[p]
        expected = BASE_P + ACTIVITY_MAX_BOOST * 0.40 + lift   # approx
        print(f"  {p:<8}: completion={rate:.4f}  "
              f"(true lift={lift:+.2f})")

    print(f"\n{'─'*30} CONFOUNDER CHECK {'─'*14}")
    print("  Completion rate by activity quartile × variant:")
    print(cr_by_activity.round(4).to_string(index=True))

    print(f"\n{sep}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\nPathfinder A/B Test — DGP Simulator")
    print(f"Seed: {SEED} | True ATE: {TRUE_ATE:.4f} | N: {N_USERS:,} users\n")

    print("Step 1/3  Simulating users...")
    df_users = simulate_users()

    print("Step 2/3  Simulating tasks and events (this takes ~10s)...")
    df_tasks, df_events = simulate_tasks_and_events(df_users)

    print("Step 3/3  Saving outputs...")
    out = Path("data")
    out.mkdir(exist_ok=True)

    df_tasks.to_csv(out / "tasks_simulated.csv",   index=False)
    df_events.to_csv(out / "events_simulated.csv", index=False)
    df_users.to_csv(out / "users_simulated.csv",   index=False)

    print_summary(df_tasks, df_users)

    print(f"  tasks_simulated.csv   → {len(df_tasks):>8,} rows")
    print(f"  events_simulated.csv  → {len(df_events):>8,} rows")
    print(f"  users_simulated.csv   → {len(df_users):>8,} rows")
    print("\n✓ Done. Files saved to data/\n")


if __name__ == "__main__":
    main()
