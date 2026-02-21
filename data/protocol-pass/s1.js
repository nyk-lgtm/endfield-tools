// Season 1 — Awaken Protocol Pass (V1.0)
// Reward totals per tier, cumulative from Level 1 to 60.

export const PROTOCOL_PASS_S1 = {
  id: 's1',
  name: 'Awaken',
  max_level: 60,

  tiers: {
    basic:      { name: 'Basic Supply',        cost: 'Free' },
    originium:  { name: 'Originium Supply',    cost: '29 Origeometry' },
    customized: { name: 'Protocol Customized', cost: '$10 USD' }
  },

  currencies: {
    origeometry:    { basic: 0,   originium: 32,  customized: 16 },
    oroberyl:       { basic: 600, originium: 0,   customized: 0 },
    arsenal_ticket: { basic: 0,   originium: 0,   customized: 2400 }
  },

  cosmetics: {
    weapon_supply_awakening:     { basic: 0, originium: 1, customized: 1 },
    protocolized_weapon_pattern: { basic: 0, originium: 0, customized: 2 },
    portrait:                    { basic: 0, originium: 0, customized: 1 },
    portrait_frame:              { basic: 0, originium: 0, customized: 1 },
    profile_theme:               { basic: 0, originium: 1, customized: 1 },
    sticker:                     { basic: 0, originium: 1, customized: 0 },
    filter_black_and_gold:       { basic: 0, originium: 1, customized: 0 }
  },

  consumables: {
    emergency_sanity_booster: { basic: 3, originium: 8,  customized: 8 },
    sanity_usage_permit:      { basic: 0, originium: 90, customized: 135 },
    sanity_extractor:         { basic: 0, originium: 0,  customized: 10 },
    food_crepes:              { basic: 0, originium: 0,  customized: 1 },
    food_ice_cream:           { basic: 0, originium: 0,  customized: 1 },
    food_honey:               { basic: 0, originium: 0,  customized: 1 }
  },

  progression: {
    t_creds:                           { basic: 255000, originium: 505000, customized: 850000 },
    intermediate_combat_record:        { basic: 25,     originium: 60,     customized: 50 },
    advanced_combat_record:            { basic: 5,      originium: 10,     customized: 10 },
    arms_insp_kit:                     { basic: 20,     originium: 90,     customized: 150 },
    arms_insp_set:                     { basic: 25,     originium: 85,     customized: 120 },
    protodisk:                         { basic: 3,      originium: 15,     customized: 25 },
    cast_die:                          { basic: 3,      originium: 15,     customized: 25 },
    heavy_cast_die:                    { basic: 13,     originium: 40,     customized: 80 },
    protoprism:                        { basic: 30,     originium: 100,    customized: 150 },
    protohedron:                       { basic: 36,     originium: 100,    customized: 150 },
    protoset:                          { basic: 9,      originium: 30,     customized: 40 },
    adv_cognitive_carrier:             { basic: 12,     originium: 30,     customized: 46 },
    adv_progression_selection_crate_i: { basic: 0,      originium: 0,      customized: 36 },
    mark_of_perseverance:              { basic: 0,      originium: 6,      customized: 10 },
    exchange_crate_o_surprise_m:       { basic: 24,     originium: 0,      customized: 0 }
  }
};
