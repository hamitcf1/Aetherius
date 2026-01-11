/**
 * Skyrim Aetherius Console Demo Commands
 *
 * This file contains demo/test functions that can be used in the browser console
 * for testing various features of the Skyrim Aetherius application.
 *
 * To use these commands:
 * 1. Open the browser console (F12)
 * 2. The functions will be available globally as `demo.*`
 * 3. Example: demo.createTestCharacter()
 *
 * Note: These functions are for development/testing purposes only.
 */

// Demo namespace
window.demo = window.demo || {};

// Utility function for unique IDs
const uniqueId = () => Math.random().toString(36).substr(2, 9);

// ============================================================================
// CHARACTER MANAGEMENT
// ============================================================================

/**
 * Create a test character with random stats
 */
window.demo.createTestCharacter = function() {
  const races = ['Nord', 'Imperial', 'Breton', 'Redguard', 'High Elf', 'Dark Elf', 'Wood Elf', 'Orc', 'Khajiit', 'Argonian'];
  const classes = ['Warrior', 'Mage', 'Thief', 'Archer', 'Paladin', 'Necromancer', 'Barbarian', 'Assassin'];

  const character = {
    id: uniqueId(),
    name: `Test${Math.floor(Math.random() * 1000)}`,
    race: races[Math.floor(Math.random() * races.length)],
    class: classes[Math.floor(Math.random() * classes.length)],
    level: Math.floor(Math.random() * 20) + 1,
    experience: Math.floor(Math.random() * 10000),
    stats: {
      health: 80 + Math.floor(Math.random() * 40),
      magicka: 60 + Math.floor(Math.random() * 40),
      stamina: 70 + Math.floor(Math.random() * 40),
      strength: 10 + Math.floor(Math.random() * 20),
      intelligence: 10 + Math.floor(Math.random() * 20),
      willpower: 10 + Math.floor(Math.random() * 20),
      agility: 10 + Math.floor(Math.random() * 20),
      speed: 10 + Math.floor(Math.random() * 20),
      luck: 10 + Math.floor(Math.random() * 20),
      personality: 10 + Math.floor(Math.random() * 20)
    },
    skills: [
      { name: 'One-handed', level: Math.floor(Math.random() * 50) + 10 },
      { name: 'Destruction', level: Math.floor(Math.random() * 50) + 10 },
      { name: 'Sneak', level: Math.floor(Math.random() * 50) + 10 }
    ],
    gold: Math.floor(Math.random() * 1000),
    createdAt: Date.now()
  };

  console.log('Created test character:', character);
  console.log('To add to game: Copy the character object and use app.setCharacters([...app.characters, character])');
  return character;
};

/**
 * Add random experience to current character
 */
window.demo.addExperience = function(amount = 100) {
  if (window.app && window.app.handleGameUpdate) {
    window.app.handleGameUpdate({ xpChange: amount });
    console.log(`Added ${amount} XP to character`);
  } else {
    console.error('App context not available');
  }
};

/**
 * Level up current character
 */
window.demo.levelUp = function() {
  if (window.app && window.app.handleGameUpdate) {
    window.app.handleGameUpdate({ xpChange: 1000 });
    console.log('Leveled up character');
  } else {
    console.error('App context not available');
  }
};

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

/**
 * Create a random test item
 */
window.demo.createTestItem = function(type = null) {
  const types = ['weapon', 'apparel', 'potion', 'food', 'misc'];
  const itemType = type || types[Math.floor(Math.random() * types.length)];

  const names = {
    weapon: ['Iron Sword', 'Steel Dagger', 'Wooden Bow', 'Iron Mace'],
    apparel: ['Leather Armor', 'Iron Helmet', 'Cloth Robes', 'Fur Boots'],
    potion: ['Health Potion', 'Magicka Potion', 'Stamina Potion', 'Poison'],
    food: ['Apple', 'Bread', 'Cheese', 'Salted Meat'],
    misc: ['Torch', 'Lockpick', 'Gem', 'Coin Purse']
  };

  const item = {
    id: uniqueId(),
    characterId: window.app?.currentCharacterId || 'test',
    name: names[itemType][Math.floor(Math.random() * names[itemType].length)],
    type: itemType,
    description: `A test ${itemType} item`,
    quantity: Math.floor(Math.random() * 5) + 1,
    equipped: false,
    value: Math.floor(Math.random() * 100) + 10,
    createdAt: Date.now()
  };

  // Add type-specific properties
  if (itemType === 'weapon') {
    item.damage = Math.floor(Math.random() * 20) + 5;
  } else if (itemType === 'apparel') {
    item.armor = Math.floor(Math.random() * 15) + 5;
  }

  console.log('Created test item:', item);
  return item;
};

/**
 * Add random items to inventory
 */
window.demo.addRandomItems = function(count = 5) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(window.demo.createTestItem());
  }
  console.log(`Created ${count} test items:`, items);
  console.log('To add to game: app.handleGameUpdate({ newItems: items })');
  return items;
};

/**
 * Add gold to character
 */
window.demo.addGold = function(amount = 100) {
  console.log(`To add ${amount} gold: app.handleGameUpdate({ goldChange: ${amount} })`);
};

// ============================================================================
// JOURNAL MANAGEMENT
// ============================================================================

/**
 * Create a test journal entry
 */
window.demo.createTestJournalEntry = function() {
  const titles = [
    'A Strange Occurrence',
    'Meeting with the Jarl',
    'Ancient Ruins Discovered',
    'Bandit Encounter',
    'Magical Mystery',
    'Dragon Sighting'
  ];

  const contents = [
    'Today I encountered something unusual in the woods. A glowing rune on an ancient stone. I should investigate further.',
    'The Jarl has given me a quest to clear out the bandit camp. The reward sounds substantial.',
    'I found some old ruins today. They appear to be from the time of the Dragon Cult. There might be treasure inside.',
    'I was attacked by bandits on the road. Fortunately, I was able to defend myself. Their leader mentioned something about a larger organization.',
    'I found a strange magical artifact today. It seems to have some kind of enchantment. I should be careful with it.',
    'I saw a dragon flying overhead today. It was heading north towards the mountains. This could be a sign of things to come.'
  ];

  const entry = {
    id: uniqueId(),
    characterId: window.app?.currentCharacterId || 'test',
    date: new Date().toLocaleDateString(),
    title: titles[Math.floor(Math.random() * titles.length)],
    content: contents[Math.floor(Math.random() * contents.length)],
    createdAt: Date.now()
  };

  console.log('Created test journal entry:', entry);
  return entry;
};

/**
 * Add random journal entries
 */
window.demo.addRandomJournalEntries = function(count = 3) {
  const entries = [];
  for (let i = 0; i < count; i++) {
    entries.push(window.demo.createTestJournalEntry());
  }
  console.log(`Created ${count} test journal entries:`, entries);
  console.log('To add to game: app.setJournalEntries([...app.journalEntries, ...entries])');
  return entries;
};

// ============================================================================
// QUEST MANAGEMENT
// ============================================================================

/**
 * Create a test quest
 */
window.demo.createTestQuest = function() {
  const titles = [
    'Clear the Bandit Camp',
    'Retrieve the Ancient Artifact',
    'Investigate the Strange Lights',
    'Escort the Merchant',
    'Hunt the Wild Beast'
  ];

  const descriptions = [
    'The local villagers are being harassed by bandits. Clear them out and bring back proof.',
    'An ancient artifact has been stolen from the museum. Find it and return it.',
    'Strange lights have been seen in the forest at night. Investigate and report back.',
    'A merchant needs protection on his journey to the next town. Ensure his safe arrival.',
    'A dangerous beast is terrorizing the countryside. Hunt it down and eliminate the threat.'
  ];

  const quest = {
    id: uniqueId(),
    characterId: window.app?.currentCharacterId || 'test',
    title: titles[Math.floor(Math.random() * titles.length)],
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    location: 'Test Location',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    objectives: [
      { id: uniqueId(), description: 'Complete the main objective', completed: false },
      { id: uniqueId(), description: 'Gather information', completed: false }
    ],
    status: 'active',
    createdAt: Date.now()
  };

  console.log('Created test quest:', quest);
  return quest;
};

/**
 * Add random quests
 */
window.demo.addRandomQuests = function(count = 2) {
  const quests = [];
  for (let i = 0; i < count; i++) {
    quests.push(window.demo.createTestQuest());
  }
  console.log(`Created ${count} test quests:`, quests);
  console.log('To add to game: app.setQuests([...app.quests, ...quests])');
  return quests;
};

// ============================================================================
// COMBAT TESTING
// ============================================================================

/**
 * Simulate a combat encounter
 */
window.demo.simulateCombat = function() {
  console.log('Combat simulation not implemented yet');
  console.log('Use the adventure system to trigger combat encounters');
};

/**
 * Test item consumption in combat
 */
window.demo.testCombatItems = function() {
  console.log('Testing combat item usage...');
  console.log('1. Add health potions: demo.addRandomItems(1) with potion type');
  console.log('2. Enter combat through adventure');
  console.log('3. Use items during combat');
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current app state
 */
window.demo.getAppState = function() {
  if (window.app) {
    console.log('Current app state:', {
      currentCharacterId: window.app.currentCharacterId,
      currentProfileId: window.app.currentProfileId,
      activeTab: window.app.activeTab,
      characters: window.app.characters?.length || 0,
      items: window.app.items?.length || 0,
      quests: window.app.quests?.length || 0,
      journalEntries: window.app.journalEntries?.length || 0
    });
  } else {
    console.error('App context not available');
  }
};

/**
 * Clear all demo data
 */
window.demo.clearDemoData = function() {
  console.log('Demo data clearing not implemented');
  console.log('Use the app UI to manage data');
};

/**
 * Show help
 */
window.demo.help = function() {
  console.log(`
Skyrim Aetherius Console Demo Commands
=====================================

Character Management:
  demo.createTestCharacter()     - Create a random test character
  demo.addExperience(100)        - Add XP to current character
  demo.levelUp()                 - Level up current character

Inventory Management:
  demo.createTestItem('weapon')  - Create a test item of specific type
  demo.addRandomItems(5)         - Add random items to inventory
  demo.addGold(100)              - Add gold to character

Journal Management:
  demo.createTestJournalEntry()  - Create a test journal entry
  demo.addRandomJournalEntries(3) - Create multiple journal entries

Quest Management:
  demo.createTestQuest()         - Create a test quest
  demo.addRandomQuests(2)        - Create multiple quests

Combat Testing:
  demo.simulateCombat()          - Simulate combat (not implemented)
  demo.testCombatItems()         - Test combat item usage

Utilities:
  demo.getAppState()             - Show current app state
  demo.clearDemoData()           - Clear demo data (not implemented)
  demo.help()                    - Show this help

Examples:
  demo.addGold(500)
  demo.addRandomItems(10)
  demo.createTestCharacter()
  demo.getAppState()

Note: Most functions now provide instructions for manual execution
instead of directly modifying app state. Copy the suggested commands
to apply changes to the game.
  `);
};

// Initialize help on load
console.log('Skyrim Aetherius Demo Commands loaded! Type demo.help() for usage instructions.');