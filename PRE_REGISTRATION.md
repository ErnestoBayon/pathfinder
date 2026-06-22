# Pre-Registration: AI Priority Ordering A/B Experiment
**Date:** 2026-06-22  
**Author:** Ernesto Bayon  
**Project:** Pathfinder — AI-powered task manager for Data Scientists  
**Repo:** github.com/juanbayonugarte-source/pathfinder  
**Status:** Pre-registered (see commit hash on this file)

---

## 1. Background

Pathfinder is a single-user AI task manager where an LLM (claude-sonnet-4-6)
acts as a PM agent. The agent can create, update, and suggest tasks via tool
use. When creating a task, the agent assigns a priority level (high / medium /
low) based on conversational context. This experiment tests whether AI-assigned
priority ordering causally improves task completion rates compared to a
deterministic due-date baseline.

---

## 2. Research Question

Does displaying tasks ordered by AI-assigned priority (high → medium → low)
increase the 7-day task completion rate, compared to ordering by due date alone?

---

## 3. Hypothesis

**H₀:** AI priority ordering has no effect on 7-day task completion rate.  
**H₁:** AI priority ordering increases 7-day task completion rate.

Direction: one-sided (we expect a positive effect).  
Test: two-sample t-test, α = 0.05, power = 0.80.

---

## 4. Variants

| Variant | Description |
|---|---|
| **Control** | Tasks ordered by `fecha_limite ASC` (nulls last), AI priority ignored in display |
| **Treatment** | Tasks ordered by AI priority (`high → medium → low`), then `fecha_limite` within group |

---

## 5. Primary Metric

**7-day task completion rate**
