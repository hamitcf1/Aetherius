Implement a post-combat reward and progression system with looting, enemy-based experience, and skill/perk progression.

**Scope & behavior**

* Remove immediate automatic rewards after defeating an enemy.
* After combat ends, trigger a **Loot Phase** instead of granting rewards directly.

**Looting**

* Present an optional looting interface for the defeated enemy.
* Enemy must have a loot table (items, quantities, rarity, gold if applicable).
* User can:

  * Loot all
  * Select specific items
  * Skip looting entirely
* Only selected items are transferred.
* Looted items are added to the player’s inventory.
* Skipped items are discarded with no penalty.

**Experience (EXP)**

* EXP gain must be based on the defeated enemy’s attributes (e.g., level, difficulty tier, type).
* EXP should be intentionally low to avoid fast leveling.
* No flat or global EXP reward.
* Ensure EXP calculation is centralized and reusable.

**Skill & Perk Progression**

* Skill progression must depend on **actions taken**, not just combat completion.
* During combat:

  * Track actions (e.g., weapon type used, spells, stealth, blocking, dodging).
  * Increment related skill trees accordingly.
* During adventures (non-combat actions):

  * Track actions (e.g., dialogue choices, exploration, crafting, problem-solving).
  * Progress relevant skills and perk trees.
* Perk progression should be tied to skill usage thresholds, not raw EXP.

**Data & State**

* Ensure defeated enemy state is persisted until looting is resolved.
* Inventory updates must be atomic (no partial transfers).
* Prevent duplicate looting or reward exploits.

**UX**

* Clear transition: Combat End → Loot Screen → Progress Summary.
* Show:

  * Looted items
  * EXP gained (per enemy)
  * Skill/perk progress changes
* Allow skipping loot and proceeding immediately.

**Constraints**

* Do not break existing inventory, combat, or progression systems.
* Keep logic modular (loot system, EXP system, skill tracking separated).
* No hardcoded enemy rewards; use data-driven configuration.

**Acceptance criteria**

* No rewards are granted without passing through the loot phase.
* Looting is optional and selective.
* EXP varies by enemy and remains low.
* Skills and perks progress based on player actions.
* Looted items reliably appear in inventory.
* No duplicate rewards or exploits occur.
//////


pressing the classic console button which is under esc button on keyboard should open dev console as  well, but it should be outside of text input areas.

///

Add a global keyboard shortcut to open the developer console using the classic console key (the key under Esc, typically \`` / ~`), with safeguards for text input fields.

Scope & behavior

Pressing the ` key / ~ key toggles the developer console open/closed.

This behavior should work globally across the app.

Input safety

The shortcut must not trigger when the user is focused on:

<input>

<textarea>

Any element with contenteditable="true"

Normal typing inside text fields must remain unaffected.

Implementation details

Listen for keydown events at the document or window level.

Detect the key via:

event.key === ''orevent.code === 'Backquote'(prefercode` for layout safety).

Before toggling:

Check document.activeElement

Abort if focus is within a text input or editable element.

UX

Console opens instantly with no page reload.

Re-pressing the key closes the console.

No visual or functional side effects when the key is pressed in excluded contexts.

Constraints

Do not override browser-native shortcuts beyond this key.

Do not interfere with existing ESC or other keybindings.

Logic must be centralized and reusable.

Acceptance criteria

Pressing ~ / ` opens the dev console anywhere in the app.

Pressing it again closes the console.

Pressing the key while typing in inputs does nothing.

Works consistently across major desktop browsers.

///////
Fix the combat roll-to-damage calculation so that damage output is correctly derived from roll results and is consistent across turns.

Problem description

Current behavior shows higher damage on lower rolls, which is incorrect.

Example:

Roll 12 → 9 damage

Roll 5 → 15 damage

This indicates a broken or inverted roll-to-damage mapping.

Expected behavior

Damage must scale monotonically with the roll:

Higher roll ⇒ equal or higher damage

Lower roll ⇒ equal or lower damage

No situation where a lower roll produces more damage than a higher roll, unless explicitly modified by buffs, crits, or special effects (which must be shown separately).

Scope & implementation

Audit all combat-related components involved in:

Dice roll generation

Damage calculation

Damage modifiers (enemy tier, weapon, skill, perks)

Identify and fix:

Inverted formulas

Incorrect min/max clamping

Post-roll multipliers applied incorrectly

UI showing values different from backend logic

Roll-to-damage model

Establish a clear formula, for example:

BaseDamage × RollModifier × Enemy/Player modifiers

RollModifier must increase with higher rolls.

Centralize this logic in a single damage calculation function.

Logging & Debugging

Add temporary debug logs showing:

Roll value

Base damage

Modifiers applied

Final damage

Ensure displayed roll tiers (low / mid / high) match numeric ranges.

Constraints

Do not rebalance combat beyond fixing correctness.

Preserve existing weapons, enemies, and skills unless they are directly causing the bug.

No hardcoded per-enemy exceptions.

Acceptance criteria

Higher rolls never result in lower damage than lower rolls.

Damage numbers match the roll tiers shown in the UI.

Same roll + same modifiers = same damage outcome.

Combat logs reflect accurate calculations.