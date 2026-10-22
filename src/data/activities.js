// What someone is doing, in words, from the pose of their current step.
// Used for the live line in the notes panel when you follow a person.

const STILL = {
  idle: 'standing about', look: 'looking about', walk: 'walking', run: 'running',
  carry: 'carrying something', pails: 'carrying pails', shoulder: 'carrying a sack',
  stir: 'stirring the pot', knead: 'kneading dough', chop: 'at work with a blade', scrub: 'scouring pots',
  crank: 'turning a crank', sit: 'sitting', sitCrank: 'turning the spit', sitWork: 'busy with handwork',
  dice: 'playing at dice', stoop: 'bending to pick something up', kneel: 'on one knee', reach: 'setting something down',
  pour: 'pouring', taste: 'tasting', tap: 'drawing ale', write: 'writing', tally: 'notching a tally stick',
  sentry: 'keeping watch', guard: 'standing guard', wipe: 'mopping a brow', rake: 'raking', fork: 'forking straw',
  saw: 'sawing timber', scatter: 'scattering grain', lean: 'leaning on a staff', wave: 'waving to you',
  bow: 'bowing to you', salute: 'greeting you', curtsey: 'curtseying to you', sleep: 'asleep',
  drill: 'at spear drill', shoot: 'shooting at the butts', play: 'playing the fiddle', sweep: 'sweeping',
  polish: 'scouring armour', milk: 'milking', read: 'reading', warm: 'warming his hands',
  graze: 'grazing', lie: 'lying down', root: 'rooting in the mud', eat: 'eating', peck: 'pecking',
  scratch: 'scratching the ground', swim: 'swimming', sniff: 'sniffing about', hiss: 'hissing',
  suckle: 'suckling', stand: 'standing', groom: 'washing', crouch: 'crouching, watching', rear: 'sniffing the air',
};
const MOVING = {
  walk: 'walking', run: 'running', carry: 'carrying something across', pails: 'carrying pails',
  shoulder: 'carrying a sack', sentry: 'walking the watch', scatter: 'scattering grain as she goes',
  swim: 'swimming', trot: 'trotting',
};

export function activityOf(a) {
  if (a.interrupt) return STILL[a.interrupt.pose] ?? 'stopping to look at you';
  if (a.override) return 'busy at the mechanism';
  const st = a.steps[a.i];
  if (st.go) return a.walking ? MOVING[st.pose ?? 'walk'] ?? 'walking' : 'waiting for someone to pass';
  return STILL[st.pose ?? 'idle'] ?? 'busy';
}
