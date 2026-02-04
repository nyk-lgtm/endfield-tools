// Zone definitions with their available skills and secondaries
export const ZONES = {
  "the-hub": {
    name: "The Hub",
    skills: ["Assault", "Suppression", "Pursuit", "Crusher", "Combative", "Detonate", "Flow", "Efficacy"],
    secondaries: ["Attack", "Heat DMG", "Electric DMG", "Cryo DMG", "Nature DMG", "Arts Intensity", "Ultimate Gain", "Arts DMG"]
  },
  "originium-science-park": {
    name: "Originium Science Park",
    skills: ["Suppression", "Pursuit", "Inspiring", "Combative", "Infliction", "Medicant", "Fracture", "Efficacy"],
    secondaries: ["Attack", "Physical DMG", "Electric DMG", "Cryo DMG", "Nature DMG", "Critical Rate", "Ultimate Gain", "Arts DMG"]
  },
  "origin-lodespring": {
    name: "Origin Lodespring",
    skills: ["Assault", "Suppression", "Combative", "Brutality", "Infliction", "Detonate", "Twilight", "Efficacy"],
    secondaries: ["HP", "Physical DMG", "Heat DMG", "Cryo DMG", "Nature DMG", "Critical Rate", "Arts Intensity", "Treatment Efficiency"]
  },
  "power-plateau": {
    name: "Power Plateau",
    skills: ["Pursuit", "Crusher", "Inspiring", "Brutality", "Infliction", "Medicant", "Fracture", "Flow"],
    secondaries: ["Attack", "HP", "Physical DMG", "Heat DMG", "Nature DMG", "Critical Rate", "Arts Intensity", "Treatment Efficiency"]
  },
  "wuling-city": {
    name: "Wuling City",
    skills: ["Assault", "Crusher", "Brutality", "Medicant", "Fracture", "Detonate", "Twilight", "Flow"],
    secondaries: ["Attack", "HP", "Electric DMG", "Cryo DMG", "Critical Rate", "Ultimate Gain", "Arts DMG", "Treatment Efficiency"]
  }
};

export const ATTRIBUTES = ["Agility", "Strength", "Will", "Intellect", "Main Attribute"];

// Derived lists from zone data
export const ALL_SECONDARIES = [...new Set(Object.values(ZONES).flatMap(z => z.secondaries))].sort();
export const ALL_SKILLS = [...new Set(Object.values(ZONES).flatMap(z => z.skills))].sort();

// Game mechanics constants
export const ATTR_POOL = 5;           // Total attributes in the drop pool
export const ATTR_TICKET_POOL = 3;    // Attributes available when using a ticket
