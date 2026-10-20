import { Windlass } from './windlass.js';
import { Spit } from './spit.js';
import { Oven } from './oven.js';
import { Hoist } from './hoist.js';
import { Tap } from './tap.js';

// Short "how it worked" notes shown with each mechanism's controls.
const NOTES = {
  windlass:
    'The rope winds onto a horizontal timber drum turned by iron cranks. The bucket\'s own weight takes it down; winding it up full means many turns of the crank. A crank is used here, but a spoked wheel or handspikes are just as likely for 1290.',
  spit:
    'The spit rests on cob-irons in front of the fire, with a dripping pan beneath. Turned steadily, the meat browns evenly and bastes in its own fat. Left still, it burns on the side facing the fire. Turning was boys\' work: dog-wheels and clockwork jacks belong to later centuries.',
  oven:
    'A domed oven bakes with stored heat. Brushwood is burnt inside it, the embers raked out and the floor swabbed. The loaves go in on a peel, and the mouth is stopped and sealed while the hot masonry bakes them.',
  hoist:
    'A hatch in the hall floor gives onto the undercroft. A hand windlass above it raises casks slung by chime hooks (hooks that grip the projecting ends of the staves). Casks were also rolled down ramps on skids.',
  tap:
    'Ale was drawn through a wooden spigot and faucet low in the cask head. A vent peg in the top had to be loosened to let air in, or the flow glugged and stopped. Driving it home again kept the ale from going flat.',
};

export function createMechanisms(app) {
  const list = [new Windlass(app), new Spit(app), new Oven(app), new Hoist(app), new Tap(app)];
  const mechs = {};
  for (const m of list) {
    m.note = NOTES[m.id];
    mechs[m.id] = m;
  }
  // the spit boy follows the spit: he turns it unless someone else is
  const boy = app.world.cast.actors.spitBoy;
  const spit = mechs.spit;
  boy.crankAngle = () => spit.angle;
  boy.override = (e, t) => {
    if (spit.boyTurning && !spit.userActive && !spit.drive) return false;
    boy.turnTo(-Math.PI / 2, 1 / 30);
    e.pose('sit', t, { seat: 0.54 });
    return true;
  };
  return mechs;
}
