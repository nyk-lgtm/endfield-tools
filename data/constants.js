// Essence attributes
export const ATTRIBUTES = ["Agility", "Strength", "Will", "Intellect", "Main Attribute"];

// Pool sizes for probability calculations
export const ATTR_POOL = ATTRIBUTES.length;  // Total attributes in the drop pool
export const ATTR_TICKET_POOL = 3;    // Attributes available when using a ticket

// Time constants
export const SECONDS_PER_SANITY = 432;
export const SECONDS_PER_DAY = 86400;

// Item EXP values
export const ITEM_VALUES = {
  // Operator EXP (levels 1-60)
  "Advanced Combat Record": 10000,
  "Intermediate Combat Record": 1000,
  "Elementary Combat Record": 200,
  // Operator EXP (levels 61-90)
  "Advanced Cognitive Carrier": 10000,
  "Elementary Cognitive Carrier": 1000,
  // Weapon EXP
  "Arms Insp Set": 10000,
  "Arms Insp Kit": 1000,
  "Arms Inspector": 200,
};
