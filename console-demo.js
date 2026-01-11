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
    const message = `Added ${amount} XP to character`;
    console.log(message);
    return message;
  } else {
    const error = 'App context not available';
    console.error(error);
    return error;
  }
};

/**
 * Level up current character
 */
window.demo.levelUp = function() {
  if (window.app && window.app.handleGameUpdate) {
    window.app.handleGameUpdate({ xpChange: 1000 });
    const message = 'Leveled up character';
    console.log(message);
    return message;
  } else {
    const error = 'App context not available';
    console.error(error);
    return error;
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
  const app = window.app;
  const safeCount = Math.max(1, Number(count) || 1);

  const items = [];
  for (let i = 0; i < safeCount; i++) {
    items.push(window.demo.createTestItem());
  }

  console.log(`Created ${safeCount} test items:`, items);

  if (app && app.handleGameUpdate) {
    app.handleGameUpdate({ newItems: items });
    const message = `Added ${safeCount} item(s) to the active character via handleGameUpdate.`;
    console.log(message);
    return items;
  }

  const note = 'App context not available; run app.handleGameUpdate({ newItems: items }) manually to apply.';
  console.warn(note);
  return items;
};

/**
 * Add gold to character
 */
window.demo.addGold = function(amount = 100) {
  const message = `To add ${amount} gold: app.handleGameUpdate({ goldChange: ${amount} })`;
  console.log(message);
  return message;
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
window.demo.simulateCombat = function(options = {}) {
  const app = window.app;
  if (!app || !app.handleGameUpdate) {
    const error = 'App context not available. Open the game first.';
    console.error(error);
    return error;
  }

  const character = (app.characters || []).find(c => c.id === app.currentCharacterId);
  if (!character) {
    const error = 'No active character selected. Create/select a character first.';
    console.error(error);
    return error;
  }

  const level = Math.max(1, Math.floor(character.level || 1));
  const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const buildEnemy = (seed) => {
    const health = seed.baseHealth + Math.floor(level * seed.healthScale);
    const stamina = 60 + Math.floor(level * 2);
    const magicka = 40 + Math.floor(level * 1.5);
    const damage = seed.baseDamage + Math.floor(level * seed.damageScale);

    return {
      id: uniqueId(),
      name: seed.name,
      type: seed.type,
      level,
      maxHealth: health,
      currentHealth: health,
      maxMagicka: magicka,
      currentMagicka: magicka,
      maxStamina: stamina,
      currentStamina: stamina,
      armor: seed.armor,
      damage,
      abilities: [
        {
          id: 'basic_strike',
          name: 'Wild Strike',
          type: 'melee',
          damage: Math.floor(damage * 0.9),
          cost: 0,
          description: 'A quick melee strike.'
        },
        {
          id: 'heavy_swing',
          name: 'Heavy Swing',
          type: 'melee',
          damage: Math.floor(damage * 1.2),
          cost: 10,
          cooldown: 1,
          description: 'A slower, harder-hitting attack.'
        }
      ],
      weaknesses: seed.weaknesses,
      resistances: seed.resistances,
      loot: seed.loot,
      xpReward: 50 + level * 8,
      goldReward: 20 + level * 3,
      isBoss: seed.isBoss || false,
      description: seed.description,
      behavior: seed.behavior
    };
  };

  const defaultSeeds = [
    {
      name: 'Bandit Cutthroat',
      type: 'humanoid',
      baseHealth: 90,
      baseDamage: 15,
      healthScale: 6,
      damageScale: 1.1,
      armor: 25,
      weaknesses: ['fire'],
      resistances: ['poison'],
      behavior: 'aggressive',
      description: 'A ruthless highwayman looking for easy prey.',
      loot: [{ name: 'Steel Sword', type: 'weapon', description: 'Worn but sharp.', quantity: 1, dropChance: 55 }]
    },
    {
      name: 'Restless Draugr',
      type: 'undead',
      baseHealth: 110,
      baseDamage: 13,
      healthScale: 7,
      damageScale: 1.05,
      armor: 30,
      weaknesses: ['fire'],
      resistances: ['frost'],
      behavior: 'defensive',
      description: 'An ancient warrior awakened from its tomb.',
      loot: [{ name: 'Ancient Nord Sword', type: 'weapon', description: 'Cold to the touch.', quantity: 1, dropChance: 40 }]
    },
    {
      name: 'Frost Wolf',
      type: 'beast',
      baseHealth: 70,
      baseDamage: 12,
      healthScale: 5,
      damageScale: 1.2,
      armor: 15,
      weaknesses: ['fire'],
      resistances: ['frost'],
      behavior: 'berserker',
      description: 'A hungry wolf hardened by the cold.',
      loot: [{ name: 'Wolf Pelt', type: 'misc', description: 'Can be sold or crafted.', quantity: 1, dropChance: 75 }]
    }
  ];

  const enemySeeds = Array.isArray(options.enemies) && options.enemies.length
    ? options.enemies
    : [choose(defaultSeeds), choose(defaultSeeds)];

  const enemies = enemySeeds.map(seed => buildEnemy(seed));
  const ambush = typeof options.ambush === 'boolean' ? options.ambush : Math.random() < 0.2;
  const location = options.location || 'Demo: Abandoned Watchtower';

  app.handleGameUpdate({
    combatStart: {
      enemies,
      location,
      ambush,
      fleeAllowed: options.fleeAllowed !== false,
      surrenderAllowed: Boolean(options.surrenderAllowed)
    },
    ambientContext: { localeType: 'wilderness', inCombat: true, mood: 'tense' },
    narrative: {
      title: 'Combat Simulation',
      content: `A staged encounter begins near ${location}.`
    }
  });

  app.setActiveTab?.('adventure');

  const summary = `Started combat sim with ${enemies.length} enemy(ies) at ${location}.`;
  console.log(summary);
  return summary;
};

/**
 * Test item consumption in combat
 */
window.demo.testCombatItems = function() {
  const message = 'Testing combat item usage...\n1. Add health potions: demo.addRandomItems(1) with potion type\n2. Enter combat through adventure\n3. Use items during combat';
  console.log(message);
  return message;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current app state
 */
window.demo.getAppState = function() {
  if (window.app) {
    const state = {
      currentCharacterId: window.app.currentCharacterId,
      currentProfileId: window.app.currentProfileId,
      activeTab: window.app.activeTab,
      characters: window.app.characters?.length || 0,
      items: window.app.items?.length || 0,
      quests: window.app.quests?.length || 0,
      journalEntries: window.app.journalEntries?.length || 0
    };
    console.log('Current app state:', state);
    return state;
  } else {
    const error = 'App context not available';
    console.error(error);
    return error;
  }
};

/**
 * Clear all demo data
 */
window.demo.clearDemoData = function(options = {}) {
  const app = window.app;
  if (!app) {
    const error = 'App context not available. Open the game first.';
    console.error(error);
    return error;
  }

  const characterId = app.currentCharacterId;
  if (!characterId) {
    const error = 'No active character selected. Create/select a character first.';
    console.error(error);
    return error;
  }

  const opts = {
    items: options.items !== false,
    quests: options.quests !== false,
    journal: options.journal !== false,
    story: options.story !== false
  };

  let clearedItems = 0;
  let clearedQuests = 0;
  let clearedJournal = 0;
  let clearedStory = 0;

  if (opts.items && Array.isArray(app.items) && app.handleGameUpdate) {
    const removedItems = app.items
      .filter(item => item.characterId === characterId)
      .map(item => ({ name: item.name, quantity: item.quantity || 1 }));

    clearedItems = removedItems.length;
    if (removedItems.length) {
      app.handleGameUpdate({ removedItems });
    }
  }

  if (opts.quests && Array.isArray(app.quests) && app.setQuests) {
    clearedQuests = app.quests.filter(q => q.characterId === characterId).length;
    app.setQuests(app.quests.filter(q => q.characterId !== characterId));
  }

  if (opts.journal && Array.isArray(app.journalEntries) && app.setJournalEntries) {
    clearedJournal = app.journalEntries.filter(e => e.characterId === characterId).length;
    app.setJournalEntries(app.journalEntries.filter(e => e.characterId !== characterId));
  }

  if (opts.story && Array.isArray(app.storyChapters) && app.setStoryChapters) {
    clearedStory = app.storyChapters.filter(s => s.characterId === characterId).length;
    app.setStoryChapters(app.storyChapters.filter(s => s.characterId !== characterId));
  }

  const summary = {
    clearedItems,
    clearedQuests,
    clearedJournal,
    clearedStory,
    characterId
  };

  console.log('Cleared demo data:', summary);
  console.log('Note: Items are removed with persistence; quests/journal/story are cleared for this session.');
  return summary;
};

/**
 * Show help
 */
window.demo.help = function() {
  const helpText = [
    'Skyrim Aetherius Console Demo Commands',
    '=====================================',
    '',
    'Character Management:',
    '  - demo.createTestCharacter()  Create a random test character',
    '  - demo.addExperience(100)     Add XP to current character',
    '  - demo.levelUp()              Level up current character',
    '',
    'Inventory Management:',
    "  - demo.createTestItem('weapon')  Create a test item of a type",
    '  - demo.addRandomItems(5)     Add random items to inventory',
    '  - demo.addGold(100)          Add gold to character',
    '',
    'Journal Management:',
    '  - demo.createTestJournalEntry()   Create a test journal entry',
    '  - demo.addRandomJournalEntries(3) Create multiple journal entries',
    '',
    'Quest Management:',
    '  - demo.createTestQuest()     Create a test quest',
    '  - demo.addRandomQuests(2)    Create multiple quests',
    '',
    'Combat Testing:',
    '  - demo.simulateCombat()      Start a combat simulation with demo enemies',
    '  - demo.testCombatItems()     Test combat item usage',
    '',
    'Utilities:',
    '  - demo.getAppState()         Show current app state',
    '  - demo.clearDemoData()       Clear items/quests/journal/story for the active character',
    '  - demo.help()                Show this help',
    '',
    'Examples:',
    '  - demo.addGold(500)',
    '  - demo.addRandomItems(10)',
    '  - demo.createTestCharacter()',
    '  - demo.getAppState()',
    '',
    'Note: Most functions show suggested commands instead of directly modifying app state.'
  ].join('\n');
  console.log(helpText);
  return helpText;
};

// Initialize help on load
console.log('Skyrim Aetherius Demo Commands loaded! Type demo.help() for usage instructions.');