# Glossary — Pathfinder A/B Test & Causal Inference

**Author:** Ernesto Bayon  
**Project:** Pathfinder AI Priority A/B Experiment  
**Purpose:** Reference document for statistical methods, acronyms, and resources used in analysis.ipynb

---

## Acronyms

| Acronym | Full Name | One-line definition |
|---|---|---|
| **ATE** | Average Treatment Effect | El efecto promedio del tratamiento sobre todos los usuarios |
| **ATT** | Average Treatment Effect on the Treated | El efecto promedio solo en los usuarios que recibieron el tratamiento |
| **CATE** | Conditional Average Treatment Effect | El efecto del tratamiento estimado individualmente para cada usuario |
| **DGP** | Data Generating Process | El mecanismo simulado que genera los datos con parámetros conocidos |
| **DiD** | Difference-in-Differences | Compara cambios entre períodos para treatment vs. control |
| **DML** | Double Machine Learning | Estimador causal de dos pasos que usa ML para remover confounders |
| **DAG** | Directed Acyclic Graph | Grafo causal que representa relaciones causa-efecto entre variables |
| **H₀** | Null Hypothesis | Hipótesis de que no hay efecto — la que intentamos rechazar |
| **H₁** | Alternative Hypothesis | Hipótesis de que sí hay efecto |
| **MDE** | Minimum Detectable Effect | El efecto mínimo que el experimento puede detectar con el poder estadístico dado |
| **PSM** | Propensity Score Matching | Empareja usuarios similares de treatment y control para comparar outcomes |
| **RLS** | Row Level Security | Seguridad a nivel de fila en Supabase — cada usuario solo ve sus datos |
| **SUTVA** | Stable Unit Treatment Value Assumption | Supuesto de que el tratamiento de un usuario no afecta el outcome de otro |

---

## Methods

### Two-Sample t-Test
**¿Qué hace?** Compara si el promedio de completion rate entre treatment y control es estadísticamente diferente.  
**¿Por qué lo usamos?** Es el estimador primario más simple. Si no pasa el t-test, los métodos causales más complejos no tienen base.  
**Supuesto clave:** Las observaciones son independientes. Por eso usamos user-level (no task-level) — las tareas del mismo usuario no son independientes entre sí.  
**Output clave:** p-value < 0.05 → rechazamos H₀.

---

### Backdoor Adjustment (DoWhy)
**¿Qué hace?** Controla por confounders "bloqueando la puerta trasera" en el DAG causal.  
**¿Por qué lo usamos?** Sin controlar por `activity_score`, el ATE naive mezcla el efecto real con el sesgo del confounder.  
**Supuesto clave:** Ignorability — no hay confounders no observados que afecten tanto treatment como outcome.  
**Output clave:** ATE ajustado por confounders — más cercano al true ATE que el estimador naive.

---

### Double ML (EconML — LinearDML)
**¿Qué hace?** Dos pasos: (1) predice outcome con confounders y obtiene residual; (2) predice tratamiento con confounders y obtiene residual; (3) regresa residual de outcome sobre residual de tratamiento.  
**¿Por qué lo usamos?** Captura relaciones no-lineales entre confounders y outcome que OLS simple no puede.  
**Supuesto clave:** Overlap — todos los usuarios tienen probabilidad no-cero de estar en cualquier variante.  
**Output clave:** ATE con intervalos de confianza robustos.

---

### Propensity Score Matching (PSM)
**¿Qué hace?** Estima la probabilidad de estar en treatment dado los confounders (propensity score), luego empareja cada usuario treated con el control más similar.  
**¿Por qué lo usamos?** Robustness check — si PSM y DoWhy convergen, el resultado es más creíble.  
**Supuesto clave:** Conditional independence — dado el propensity score, treatment y outcome son independientes.  
**Output clave:** ATT (efecto en quienes SÍ recibieron el tratamiento).

---

### Difference-in-Differences (DiD)
**¿Qué hace?** Compara el cambio en outcomes entre pre-período (semanas 1-2) y post-período (semanas 3-4) para treatment vs. control. Formula: DiD = (T_post - T_pre) - (C_post - C_pre).  
**¿Por qué lo usamos?** Añade dimensión temporal — mide si el efecto creció con el tiempo.  
**Supuesto clave:** Parallel trends — sin tratamiento, ambos grupos habrían tenido la misma tendencia.  
**Output clave:** ~+0.015 (incremental), no el ATE total. Esto es correcto y esperado.

---

### CausalForestDML (CATE)
**¿Qué hace?** Estima el efecto del tratamiento individualmente para cada usuario usando random forests causales.  
**¿Por qué lo usamos?** El ATE es un promedio — CATE revela si hay usuarios que se benefician más o menos del AI priority ordering.  
**Supuesto clave:** Unconfoundedness — mismos supuestos que DML.  
**Output clave:** Plot de CATE vs activity_score — ¿usuarios más activos responden más al tratamiento?

---

## Resources

| Resource | Why it's useful |
|---|---|
| [Python Causality Handbook — Facure](https://matheusfacure.github.io/python-causality-handbook/) | Mejor introducción práctica a causal inference con Python. Ejemplos aplicados, código real. |
| [Causal Inference — Swager (Stanford)](https://web.stanford.edu/~swager/causal_inf_book.pdf) | Referencia académica rigurosa. Bueno para entender los supuestos formales de cada estimador. |
| [DoWhy Documentation](https://py-why.github.io/dowhy/) | API oficial de DoWhy — importante para entender el DAG y el estimand |
| [EconML Documentation](https://econml.azurewebsites.net/) | API de Microsoft Research — DML, CausalForest, CATE |
| [Pearl, J. (2009). Causality](https://doi.org/10.1017/CBO9780511803161) | El libro fundamental de causal inference. Define DAGs, backdoor criterion, do-calculus |
