# Skyrim Aetherius – Feature & Bugfix Specification

## Scope
This document defines required **bug fixes**, **new features**, and **behavioral corrections** for the application.  
All changes must be implemented at the **codebase level**.  
Each item must be marked as DONE / PARTIAL / BLOCKED once implemented.

---

## 1. Adventure → Combat → Adventure Continuity

### Problem
When an adventure story triggers combat, the combat modal opens, but the story does not continue based on combat outcome.

### Required Behavior
- If an adventure result triggers combat:
  - Open combat modal
  - Pause adventure flow
- On combat end:
  - Automatically resume the adventure
  - Branch story logic based on:
    - **Victory**
    - **Defeat**
- No manual refresh or re-entry required.

### Acceptance Criteria
- Win → story continues with victory branch
- Defeat → story continues with defeat branch
- State is preserved across modal transitions

---

## 2. Item Usage in Combat (Potions)

### Problem
Using items (potions) is not allowed during combat.

### Required Behavior
- Potions **must be usable during combat**
- Respect cooldowns or limits if they exist
- Correct stat must be affected (see potion fix spec)

### Acceptance Criteria
- Player can use health, stamina, magicka potions in combat
- Correct stat changes occur
- Combat flow is not broken

---

## 3. Enemy Loot System (BROKEN)

### Problems
- Enemies drop no loot
- Loot phase shows empty results
- Gained experience is not shown in loot phase

### Required Behavior
- Every enemy type must have:
  - Gold amount (range-based)
  - Item loot table
- Loot phase must show:
  - Items
  - Gold
  - Experience gained
- Loot must be optional and selectable

### Acceptance Criteria
- Loot phase is never empty for valid enemies
- EXP is visible in loot UI
- Looted items go to inventory

---

## 4. Equipment Bug – Shields

### Problem
Shields cannot be equipped in off-hand.

### Required Behavior
- Shields must be equippable in **off-hand**
- Block equipping shields in main-hand if that is intended

### Acceptance Criteria
- Shield equips correctly
- Stats apply correctly
- UI reflects equipped state

---

## 5. Jewelry Equipment & Shop Support

### Problems
- Rings, necklaces, crowns (jewelry) do not exist in shop
- No inventory or equipment support
- Cannot equip them

### Required Behavior
- Add equipment categories:
  - Rings
  - Necklaces
  - Crowns (jewelry, not royal)
- Update:
  - Shop sections
  - Inventory filters
  - Equipment slots
- Allow equipping and stat bonuses

### Acceptance Criteria
- Jewelry appears in shop
- Jewelry can be bought, stored, equipped
- Equipment bonuses apply

---

## 6. Magic Spells System

### Required Feature
Introduce a **Magic Spells** system.

### Requirements
- Spells are:
  - Learnable via NPCs
  - Learnable via books
- Player has a **Spells Modal**
- Learned spells persist
- Spells are usable where applicable

### Acceptance Criteria
- Spell list UI exists
- Learning spells updates player state
- Spells are selectable and usable

---

## 7. Sleeping & Resting

### Required Behavior
Sleeping/resting must:
- Recover **health**
- Recover **stamina**
- Recover **magicka**

### Acceptance Criteria
- All three stats recover
- Values are clamped correctly
- Time passes accordingly

---

## 8. Level-Up System (NEW)

### Required Behavior
When player levels up:
- Show **Level-Up Modal**
- Player must:
  - Choose ONE stat:
    - Health
    - Stamina
    - Magicka
  - Selected stat increases by **+10**
- Grant:
  - **1 perk point**
- Changes apply only after player confirmation

### UI Requirements
- Modal on Hero tab
- Clear stat selection
- Confirm / Cancel buttons

### Acceptance Criteria
- No auto-leveling
- Stats update only after confirmation
- Perk point added correctly

---

## 9. Food Consumption

### Required Behavior
- Eating food restores **health**
- Works in and out of combat (if allowed by design)

### Acceptance Criteria
- Food increases health
- Correct UI/log feedback

---

## 10. Combat Time → Game Time Sync

### Problem
Combat time passes but does not affect global game time.

### Required Behavior
- Time spent in combat must:
  - Advance global game time
  - Match adventure time logic

### Acceptance Criteria
- Combat duration affects game clock
- No desync between systems

---

## Completion Tracking
Each item above must be marked as:
- ✅ DONE
- ⚠️ PARTIAL
- ❌ BLOCKED

Do not remove sections.  
Update status inline.

