:::::::::::::::::: site-header
::::::::::::::::: header-inner
::: header-eyebrow
CleanList · Algorithm Documentation
:::

# Scoring *Algorithm* Specification {#scoring-algorithm-specification .header-title}

The complete framework used by CleanList to evaluate food and consumer
product ingredients --- covering composite scoring, regulatory
weighting, personalization, and tier classification.

::::::::::::::: header-meta
<div>

::: meta-label
Version
:::

::: meta-value
1.0
:::

</div>

<div>

::: meta-label
Date
:::

::: meta-value
March 2026
:::

</div>

<div>

::: meta-label
Status
:::

::: meta-value
Confidential --- partner review
:::

</div>

<div>

::: meta-label
Sections
:::

::: meta-value
8 + Appendix
:::

</div>
:::::::::::::::
:::::::::::::::::
::::::::::::::::::

::: toc-inner
[1. Overview](#overview){.toc-link} [2. Formula](#formula){.toc-link}
[3. Regulatory](#regulatory){.toc-link} [4. Output
Tiers](#tiers){.toc-link} [5.
Personalization](#personalization){.toc-link} [6. Profile
Evolution](#evolution){.toc-link} [7.
Governance](#governance){.toc-link} [8. Worked
Example](#example){.toc-link} [Appendix](#appendix){.toc-link}
:::

:::::::: {#overview .section .section}
::::::: container
::: section-eyebrow
Section 01
:::

## Overview {#overview .section-title}

The CleanList score is a composite, evidence-weighted rating that tells
a user how much concern they should have about a given product --- and
how much of that concern is specific to their personal health profile.

Every product receives two numbers:

- **Base score** --- objective, universal. The same for all users.
  Reflects the ingredient\'s risk based on scientific evidence,
  regulatory consensus, and prevalence. Scale 1--10.
- **Personal score** --- the base score adjusted upward by the user\'s
  health profile where peer-reviewed evidence supports a specific link.
  Modifiers can only increase the score, never decrease it. No cap if
  evidence warrants it.

::::: {.callout .green}
::: callout-accent
:::

::: callout-body
**Design principle:** the base score is the scientific foundation. The
personal score is the user\'s lens on top of it. Showing both numbers
side by side builds trust --- users can see exactly what their profile
is doing and why.
:::
:::::
:::::::
::::::::

::::::::::: {#formula .section .section}
:::::::::: container
::: section-eyebrow
Section 02
:::

## Composite Score Formula {#composite-score-formula .section-title}

The base score is a weighted combination of three dimensions. Each
dimension is scored on a 1--10 scale before the weighted blend is
applied.

::: table-wrap
  Dimension                  Weight                    What it measures
  -------------------------- ------------------------- -------------------------------------------------------------------------------------------------
  **Harm evidence**          [40%]{.badge .b-purple}   Strength of scientific evidence that this ingredient causes harm, weighted by evidence quality.
  **Regulatory consensus**   [35%]{.badge .b-green}    Number and tier of jurisdictions that have restricted or banned the ingredient.
  **Avoidance priority**     [25%]{.badge .b-amber}    How prevalent the ingredient is in the food supply and how easy it is for the user to avoid.
:::

::: formula
Base Score = (Harm Evidence × 0.40) + (Regulatory Consensus × 0.35) +
(Avoidance Priority × 0.25)
:::

### 2.1 Evidence Hierarchy --- Harm Evidence Dimension

The harm evidence dimension is built from a ranked hierarchy of source
types. Higher-ranked sources carry more weight when scoring an
individual ingredient\'s harm level.

::: table-wrap
  Rank   Source type                       Notes
  ------ --------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  1      **Peer-reviewed human studies**   Strongest signal. Randomised controlled trials and prospective cohort studies carry most weight. Must demonstrate causal or strong associative link at typical dietary doses.
  2      **Regulatory bans**               Reflects collective expert judgment by major food safety bodies. Treated as independent evidence of harm where the banning jurisdiction conducted its own review.
  3      **Animal studies**                Indicative but not conclusive for humans. Weighted lower due to translational uncertainty. High-dose animal findings discounted further unless dose-relevant to human exposure.
  4      **IARC / WHO classifications**    Authoritative synthesis but can lag emerging evidence. IARC class 1 (carcinogenic) and 2A (probable) carry significant weight. Class 2B (possible) treated as supporting, not primary, signal.
  5      **Advocacy org ratings**          EWG, CSPI, and similar --- useful as discovery signal, not scoring anchor. Applied only where claims are traceable to peer-reviewed sources in the hierarchy above.
:::

::::: {.callout .amber}
::: callout-accent
:::

::: callout-body
**Scoring principle:** CleanList intentionally scores more
conservatively than EWG on ingredients with thin human evidence. This is
a trust and credibility feature, not a gap. When a user\'s score
diverges from EWG, the explanation (\'we weight peer-reviewed human
studies most\') is the product differentiator.
:::
:::::

### 2.2 Dose Context

The CleanList score reflects chronic exposure risk at typical dietary
doses --- not worst-case toxicology. For ingredients with meaningful
dose-dependency, a plain-language dose context note is displayed
alongside the score:

- \'Harmful at chronic high exposure; typical serving is well below
  threshold\'
- \'No safe threshold established --- any exposure relevant\'
- \'Risk is cumulative --- relevant if this ingredient appears across
  multiple products in your list\'

Dose context is shown in the ingredient detail view and is drawn from
the same evidence sources as the score. It does not change the score
itself.
::::::::::
:::::::::::

::::::::::: {#regulatory .section .section}
:::::::::: container
::: section-eyebrow
Section 03
:::

## Regulatory Consensus Dimension {#regulatory-consensus-dimension .section-title}

The regulatory consensus score is calculated from a tiered point system
that reflects both the rigor of each jurisdiction\'s review process and
the type of restriction applied.

### 3.1 Jurisdiction Tiers

::: table-wrap
  Tier   Label                              Jurisdictions                                                                        Points / ban
  ------ ---------------------------------- ------------------------------------------------------------------------------------ ---------------------------
  1      Independent rigorous review        EU (EFSA), USA (FDA), Canada (Health Canada), Japan (MHLW)                           [3 pts]{.badge .b-purple}
  2      Derivative but meaningful          UK (FSA, post-Brexit), Australia / NZ (FSANZ), Brazil (ANVISA), South Korea (MFDS)   [2 pts]{.badge .b-green}
  3      Precautionary / political signal   Individual EU states (pre-EFSA rulings), India, China, and other national agencies   [1 pt]{.badge .b-amber}
:::

Tier 1 jurisdictions conduct systematic, pre-market safety review
independent of political pressure. Tier 2 frequently follow EU/Codex
lead but retain some independent review capacity. Tier 3 bans often
reflect precautionary culture or political considerations --- still
relevant as cumulative signal.

### 3.2 Action Multipliers

The type of restriction applied by each jurisdiction is multiplied
against the tier points:

::: table-wrap
  Action type                        Multiplier                Definition
  ---------------------------------- ------------------------- -------------------------------------------------------------------------------------------
  **Outright ban**                   [1.0×]{.badge .b-red}     Ingredient prohibited entirely from food products.
  **Mandatory warning label**        [0.6×]{.badge .b-amber}   Permitted but must carry a health warning (e.g. EU artificial dye labelling requirement).
  **Restricted use / lower limit**   [0.4×]{.badge .b-amber}   Permitted at stricter concentration thresholds than the US allows.
  **Under formal review**            [0.2×]{.badge .b-gray}    Formal safety reassessment currently underway.
  **No restriction**                 [0×]{.badge .b-gray}      No regulatory action. Contributes zero points.
:::

### 3.3 Regulatory Score Calculation

Raw points are summed across all jurisdictions, then scaled to a 0--10
dimension score. Maximum possible raw score is 24 (all Tier 1
jurisdictions issue an outright ban).

::: formula
Regulatory Score = (Sum of raw points across all jurisdictions) ÷ 24 ×
10
:::

Raw points for a single jurisdiction = Tier points × Action multiplier.
For example: an EU outright ban = 3 pts × 1.0 = **3.0 raw points**. A UK
warning label requirement = 2 pts × 0.6 = **1.2 raw points**.

### 3.4 Special Rules

#### Rule 1 --- FDA status is additive only

The FDA\'s own ban or restriction on an ingredient adds points to the
regulatory score --- it never subtracts. FDA approval of a substance has
zero effect on its regulatory score. This means a US-banned ingredient
(e.g. BVO, banned 2024) gets +3 Tier 1 points regardless of what other
regulators have done.

#### Rule 2 --- Ten-country floor

If an ingredient has been outright banned in ten or more countries, the
regulatory dimension score is automatically floored at 9.0, regardless
of what the weighted point calculation produces. This captures broad
global consensus that the tiered system may undercount when bans are
concentrated in Tier 3 countries.

::::: {.callout .red}
::: callout-accent
:::

::: callout-body
**Example:** Ractopamine is banned in 160+ countries. Many are Tier 3.
Without the floor, the tiered system would undercount the significance
of that consensus. The ten-country rule corrects for this.
:::
:::::

#### Rule 3 --- Regulatory reversal triggers re-evaluation

If a jurisdiction lifts or softens a restriction, the ingredient enters
a flagged \'under review\' state in the database. The score is not
automatically reduced. A human review step must confirm whether the
reversal reflects new science or a regulatory/political change before
the score is updated. All reversals are logged with a date and source
citation.
::::::::::
:::::::::::

:::::::::::::::::::::: {#tiers .section .section}
::::::::::::::::::::: container
::: section-eyebrow
Section 04
:::

## Output Tiers {#output-tiers .section-title}

The composite score maps to one of four named tiers displayed to the
user. Scores of 3.1--3.9 and 5.1--5.9 are transitional bands --- they
display with the lower tier label but a fractional score that signals
proximity to the next tier.

::::::::::::::::::: tier-grid
:::::: {.tier-card .tc-clean}
::: tier-name
Clean
:::

::: tier-range
1.0 -- 3.0
:::

::: tier-desc
No significant concern across evidence sources. Safe to include without
flags.
:::
::::::

:::::: {.tier-card .tc-watch}
::: tier-name
Watch
:::

::: tier-range
4.0 -- 5.0
:::

::: tier-desc
Some evidence of concern. Worth being aware of, especially for sensitive
populations. Dose context shown.
:::
::::::

:::::: {.tier-card .tc-caution}
::: tier-name
Caution
:::

::: tier-range
6.0 -- 7.0
:::

::: tier-desc
Meaningful concern across multiple evidence sources. Restricted in some
major countries. Consider swapping.
:::
::::::

:::::: {.tier-card .tc-avoid}
::: tier-name
Avoid
:::

::: tier-range
8.0 -- 10.0
:::

::: tier-desc
Strong evidence of harm and/or banned by major regulators. CleanList
recommends avoiding where alternatives exist.
:::
::::::
:::::::::::::::::::
:::::::::::::::::::::
::::::::::::::::::::::

::::::::::: {#personalization .section .section}
:::::::::: container
::: section-eyebrow
Section 05
:::

## Profile Personalization {#profile-personalization .section-title}

The personal score is the base score adjusted upward by the user\'s
health profile. The personalization system is the primary product
differentiator --- it turns a static ingredient database into a
genuinely individual health tool.

### 5.1 Hybrid Score Model

- The base score is universal and consistent --- the same for all users
  for any given product.
- The personal score is the base score plus any applicable profile
  modifiers.
- Modifiers may only increase the score, never decrease it. There is no
  maximum cap --- if the evidence warrants it, a modifier can push a
  score from any tier into Avoid.
- Both scores are shown to the user in the product detail view, along
  with the specific modifiers that caused the difference. This
  transparency is essential to building trust with Persona B.

::: formula
Personal Score = Base Score + Σ(applicable profile modifiers) · Capped
at 10.0
:::

### 5.2 Profile Attribute Types

Four categories of profile attribute can generate modifiers:

::: table-wrap
  Attribute type                    Examples                                                                       Notes
  --------------------------------- ------------------------------------------------------------------------------ -----------------------------------------------------------------------------------------------------------------------------------------------
  **Life stage**                    Pregnant, infant / toddler, elderly                                            Biologically distinct vulnerability windows --- e.g. fetal exposure, immature renal clearance, developmental neurotoxicity.
  **Diagnosed conditions**          ADHD, thyroid condition, eczema, hormone-sensitive condition, cancer history   Only applied where peer-reviewed evidence directly links the ingredient to the condition. Requires a citable study or regulatory finding.
  **Dietary restrictions**          Gluten-free, vegan                                                             Flags presence of excluded ingredients regardless of harm score. Treated as a binary presence/absence flag rather than a continuous modifier.
  **Self-reported sensitivities**   IBS / gut sensitivity, migraines, food allergies                               Treated with appropriate weight --- self-reported. Applied where associative evidence exists even if causal link is not established.
:::

### 5.3 Modifier Rules

- **Each modifier must cite a real study or regulatory finding** ---
  e.g. \'McCann et al. 2007 Lancet RCT\' or \'EFSA 2021 genotoxicity
  opinion\'. No modifier is applied without a traceable source.
- **Modifiers are ingredient-specific, not product-level** --- a
  modifier fires because a specific ingredient in a product links to the
  user\'s condition, not because the product category does.
- **Multiple modifiers stack additively** --- a user with ADHD and
  eczema may receive two separate modifiers for Red No. 40 (one for each
  condition), each citing independent evidence.
- **The modifier amount is evidence-calibrated** --- a strong RCT with a
  clear mechanistic link supports a larger modifier than an associative
  observational study.

::::: {.callout .amber}
::: callout-accent
:::

::: callout-body
**Scientific review requirement:** every ingredient-condition modifier
pair in the database must be reviewed and approved by a credentialed
scientific advisor before deployment. The scoring engine should never
invent or assume modifiers --- they are a curated, finite set.
:::
:::::

### 5.4 Illustrative Modifier Examples

::: table-wrap
  Ingredient         Condition                     Modifier                  Evidence source
  ------------------ ----------------------------- ------------------------- --------------------------------------------------------------------------------------------------------------------
  Red No. 40         ADHD                          [+2.8]{.badge .b-red}     McCann et al. 2007 Lancet RCT --- significant hyperactivity increase in children; confirmed by EFSA 2008 opinion.
  Red No. 40         Eczema / skin                 [+1.2]{.badge .b-amber}   Azo dye sensitivity associated with contact dermatitis and urticaria in atopic individuals.
  BHA                Thyroid condition             [+2.8]{.badge .b-red}     BHA disrupts thyroid hormone signaling via TH receptor interference; Darbre 2006 and multiple replications.
  Carrageenan        IBS / gut                     [+3.5]{.badge .b-red}     Bhattacharyya et al. --- carrageenan activates Bcl10 inflammatory pathway; ulcerations in animal GI studies.
  Sodium nitrite     Pregnant                      [+2.2]{.badge .b-amber}   Nitrosamine formation linked to childhood leukemia risk when consumed during pregnancy --- Preston-Martin studies.
  Titanium dioxide   Cancer history                [+2.0]{.badge .b-amber}   EFSA 2021: genotoxicity concern --- cannot rule out DNA/chromosomal damage; primary basis for EU ban.
  Propylparaben      Hormone-sensitive condition   [+3.2]{.badge .b-red}     Estrogenic activity --- binds ERα receptor; Darbre 2004 found parabens in breast tumor tissue.
:::

This table is illustrative. The complete modifier database must be
reviewed and approved by a credentialed scientific advisor before
deployment.
::::::::::
:::::::::::

:::::::: {#evolution .section .section}
::::::: container
::: section-eyebrow
Section 06
:::

## Profile Evolution {#profile-evolution .section-title}

The health profile is not static. Three mechanisms keep it accurate and
increase the switching cost over time.

### 6.1 Feedback Nudges

After flagging an ingredient, the app asks the user whether they or
their household noticed a reaction after consuming products containing
it. Confirmed reactions reinforce that modifier\'s relevance for the
user --- increasing confidence in that signal and potentially surfacing
it more prominently in future results.

### 6.2 Life Stage Triggers

Certain in-app events prompt a profile update offer. Examples include a
user logging a pregnancy, adding an infant to their household profile,
or age-based prompts. These triggers are contextual --- they appear when
the system detects a relevant life change, not on a fixed schedule.

### 6.3 Explicit Settings

Users can view, edit, and annotate every profile attribute at any time
via the profile settings panel. Each attribute shows which products in
the current shopping list it is actively affecting, and by how much.
This transparency gives control to power users and builds understanding
of how the scoring system works.

::::: {.callout .green}
::: callout-accent
:::

::: callout-body
**Retention logic:** every feedback nudge answered, every life stage
logged, and every explicit edit makes the profile more accurate and more
personal. After twelve months of use, a user has a profile that took
twelve months to calibrate. That is the switching cost the brief
identifies. Competitors can replicate the scoring framework; they cannot
replicate a user\'s history.
:::
:::::
:::::::
::::::::

:::::::: {#governance .section .section}
::::::: container
::: section-eyebrow
Section 07
:::

## Algorithm Governance {#algorithm-governance .section-title}

### 7.1 Scientific Review Requirement

No ingredient score and no profile modifier may be deployed without
review by a credentialed scientific advisor --- ideally a toxicologist
or pediatric nutrition specialist. The advisor is responsible for:

- Reviewing and approving the evidence cited for each ingredient\'s harm
  evidence score
- Reviewing and approving every ingredient-condition modifier pair
  before it enters the database
- Flagging scores where the evidence quality is disputed, mixed, or
  rapidly evolving
- Issuing an annual review of the full scoring database

### 7.2 Data Sources

The following sources are used to populate ingredient scores at launch,
pending development of proprietary scoring:

- Open Food Facts --- product ingredient data
- FDA Food Additive Status List and Substances Added to Food (EAFUS)
  database
- EFSA opinion database
- IARC Monographs on the Identification of Carcinogenic Hazards to
  Humans
- EWG Food Scores --- as a discovery and cross-reference signal only,
  not a scoring anchor

::::: {.callout .amber}
::: callout-accent
:::

::: callout-body
**Launch note:** proprietary scoring should be treated as a 6--12 month
build. At launch, ingredient scores are populated from the above sources
and reviewed by the scientific advisor. Scores derived from
non-proprietary sources are labelled as such in the database and
prioritised for replacement.
:::
:::::

### 7.3 Score Versioning

Every change to an ingredient\'s score --- whether from new evidence, a
regulatory change, or a scientific advisor review --- is logged with a
version number, date, author, and reason. Users are notified when a
product in their saved list receives a score update that changes its
tier.

### 7.4 Transparency Commitment

CleanList commits to publishing the methodology underlying its base
scores in a public-facing \'how we score\' document. Profile modifiers
are described at the condition level (e.g. \'we flag Red No. 40 higher
for ADHD based on the McCann 2007 Lancet RCT\') without exposing the
full numeric model. This maintains scientific credibility while
protecting the scoring methodology as a competitive asset.
:::::::
::::::::

::::::::::::::::::::::::::: {#example .section .section}
:::::::::::::::::::::::::: container
::: section-eyebrow
Section 08
:::

## Worked Example {#worked-example .section-title}

A complete score calculation for Froot Loops Original (Kellogg\'s),
scored for a user with ADHD and IBS flags.

:::::::::::::::::::::::: step-list
:::::: step
::: step-num
1
:::

:::: step-body
#### Harm evidence dimension (40%)

::: {.table-wrap style="margin-top:.75rem"}
  Key ingredient        Score                    Primary evidence
  --------------------- ------------------------ ----------------------------------------------------------------
  Red No. 40            [7.6]{.badge .b-amber}   McCann 2007 Lancet RCT (hyperactivity); EFSA 2008 confirmation
  BHT (preservative)    [5.8]{.badge .b-amber}   IARC 2B; endocrine disruption in animal studies
  Sugar (refined)       [3.2]{.badge .b-green}   High dose metabolic concerns; clean at typical serving
  Artificial flavours   [2.8]{.badge .b-green}   Limited direct harm evidence; GRAS
:::

**Harm evidence dimension score: 5.2 / 10**
::::
::::::

:::::: step
::: step-num
2
:::

:::: step-body
#### Regulatory consensus dimension (35%)

::: {.table-wrap style="margin-top:.75rem"}
  Jurisdiction           Action           Points                       Notes
  ---------------------- ---------------- ---------------------------- -------------------------------------------
  EU (EFSA) --- Tier 1   Warning label    [1.8 pts]{.badge .b-amber}   3 pts × 0.6 multiplier
  UK (FSA) --- Tier 2    Warning label    [1.2 pts]{.badge .b-amber}   2 pts × 0.6 multiplier
  Canada --- Tier 1      No restriction   [0 pts]{.badge .b-gray}      Artificial dyes permitted without warning
:::

Raw points: 3.0. Regulatory score = 3.0 ÷ 24 × 10 = 1.25 (Low --- Red
No. 40 is not outright banned in major jurisdictions, only
warning-labelled.)

**Regulatory consensus dimension score: 1.3 / 10**
::::
::::::

::::: step
::: step-num
3
:::

::: step-body
#### Avoidance priority dimension (25%)

Red No. 40 is present in hundreds of mainstream products. Avoidance
requires active label reading and limits to a narrower product set.

**Avoidance priority score: 7.8 / 10**
:::
:::::

:::::: step
::: step-num
4
:::

:::: step-body
#### Base score

::: formula
Base Score = (5.2 × 0.40) + (1.3 × 0.35) + (7.8 × 0.25) = 2.08 + 0.455 +
1.95 = 4.49 → 4.5 (Watch)
:::
::::
::::::

:::::::: step
::: step-num
5
:::

:::::: step-body
#### Profile modifiers (ADHD + IBS)

::: {.table-wrap style="margin-top:.75rem"}
  Ingredient   Condition   Modifier                  Evidence
  ------------ ----------- ------------------------- ---------------------------------------------------------
  Red No. 40   ADHD        [+2.8]{.badge .b-red}     McCann et al. 2007 Lancet RCT
  Red No. 40   IBS         [+0.4]{.badge .b-amber}   Azo dye sensitivity; emerging GI association literature
:::

::: {.formula style="margin-top:.75rem"}
Personal Score = 4.5 + 2.8 + 0.4 = 7.7 (Caution)
:::

::: final-score
[4.5]{.base} [7.7]{.personal} [Caution]{.tier}
:::

Displayed to user: base score 4.5 crossed out → personal score 7.7,
Caution. Modifiers shown: \'+2.8 ADHD --- Red No. 40\' and \'+0.4 IBS
--- Red No. 40\'. Evidence citation available on tap.
::::::
::::::::
::::::::::::::::::::::::
::::::::::::::::::::::::::
:::::::::::::::::::::::::::

::::::::::::::::::::: {#appendix .section .section}
:::::::::::::::::::: container
::: section-eyebrow
Appendix
:::

## Open Decisions {#open-decisions .section-title}

The following items require resolution before the scoring engine is
deployed in production.

:::::::::::::::::: open-items
::::: open-item
::: open-item-num
1
:::

::: open-item-text
**Scientific advisor appointment.** A credentialed toxicologist or
pediatric nutrition specialist must be identified, briefed on this
document, and engaged to review the initial ingredient database before
any public-facing scoring is published.
:::
:::::

::::: open-item
::: open-item-num
2
:::

::: open-item-text
**Initial ingredient database scope.** The set of ingredients to be
scored at launch needs to be defined. Recommendation: begin with the 50
most commonly found additives in US packaged food and expand from there.
:::
:::::

::::: open-item
::: open-item-num
3
:::

::: open-item-text
**Target API / product catalog.** Integration with a retail product
catalog (Target API, Datasembly, or 1WorldSync) is required to link
ingredient scores to specific products available at the user\'s store.
This integration defines the \'available at your store\' feature.
:::
:::::

::::: open-item
::: open-item-num
4
:::

::: open-item-text
**Score versioning infrastructure.** The database schema and change-log
mechanism for score versioning (Section 7.3) must be designed before the
first ingredient scores are published.
:::
:::::

::::: open-item
::: open-item-num
5
:::

::: open-item-text
**User notification logic.** The trigger conditions for notifying users
of a tier change on a saved product need to be defined (e.g. only notify
on tier change, not fractional score changes).
:::
:::::
::::::::::::::::::
::::::::::::::::::::
:::::::::::::::::::::

Prepared March 2026 · CleanList · Confidential --- for partner review
only
