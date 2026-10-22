// The parts of the surface shader that know Aberwen's plan (see material.js).
// Each site supplies the same five functions:
//   roofed(p)       how much a point is indoors (less daylight): 0 outdoors
//   groundAt(p)     rough ground level under a point (damp at wall feet)
//   sectionSide(p, N)  faces of the terrain block that are really section faces
//   topsoil(p, N, base, ink)  soil band where the cut crosses open ground
//   soot(k, p, N, base)       smoke-blackening in rooms with open fires
// Box coordinates come from layout.js and must follow it if the plan changes.

export const ABERWEN_GLSL = /* glsl */ `
// Roofed rooms get little daylight: 1 outdoors, smaller inside.
float roofed(vec3 p) {
  float m = 0.0;
  // north range of service rooms
  if (p.x > -11.85 && p.x < 25.05 && p.z > -21.05 && p.z < -12.45 && p.y < 7.5) m = 1.0;
  // services, chamber, hall and undercroft
  if (p.x > -25.05 && p.x < -12.95 && p.z > -21.05 && p.y < 8.6 && p.y > -4.1) m = 1.0;
  // gatehouse chambers and gate passage
  if (p.x > 20.15 && p.x < 29.85 && p.z > -7.85 && p.y > 5.5 && p.y < 16.6) m = 1.0;
  if (p.x > 19.5 && p.x < 35.0 && p.z > -1.65 && p.y < 4.3) m = 0.8;
  // the rooms in the two cut corner towers
  if (p.z < -20.95 && p.y > -1.6 && p.y < 18.05 && (length(p.xz - vec2(-27.6, -23.6)) < 4.25 || length(p.xz - vec2(27.6, -23.6)) < 4.25)) m = 1.0;
  if (p.z < -20.95 && p.y < 4.0 && p.y > -1.6 && length(p.xz - vec2(-27.6, -23.6)) < 4.25) m = 1.3; // the prison
  // the stable in the north outer ward
  if (p.x > -18.6 && p.x < -5.4 && p.z < -29.9 && p.z > -33.6 && p.y < 2.6) m = 0.8;
  // the undercroft is darker still
  if (p.x > -25.05 && p.x < -12.95 && p.z > -9.1 && p.y < 0.55 && p.y > -4.1) m = 1.4;
  return m;
}

// Rough ground level under a point: the inner ward is at 0, the outer ward
// and the field round about at -1.5. Used to put damp and grime at wall feet.
float groundAt(vec3 p) {
  return (abs(p.x) < 25.2 && p.z > -21.2) ? 0.0 : -1.5;
}

// the terrain block's outer sides are cut faces too
bool sectionSide(vec3 p, vec3 N) {
  return abs(N.y) < 0.3 && (p.x > 71.9 || p.x < -61.9 || p.z < -61.9);
}

// a ragged band of stony topsoil under the turf, where the cut crosses open ground
void topsoil(vec3 p, vec3 N, inout vec3 base, inout float ink) {
  if (abs(N.z) > 0.9 && abs(p.x) > 28.6) {
    float x = p.x;
    float top = x < -40.0 ? -14.0 + (x + 62.0) / 22.0 * 12.5 : (x > 44.0 && x < 52.0) ? -7.0 : x > 52.0 ? -2.2 - (x - 52.0) / 20.0 * 1.8 : -1.5;
    float depth = top - p.y + (fbm(p * 1.5) - 0.5) * 0.35;
    float soil = 1.0 - smoothstep(0.45, 0.6, depth);
    vec2 sc = floor(p.xy * 7.0);
    float stone = step(0.88, hash12(sc)) * (1.0 - smoothstep(0.2, 0.4, length(fract(p.xy * 7.0) - 0.5)));
    base = mix(base, mix(vec3(0.55, 0.45, 0.34), vec3(0.72, 0.68, 0.6), stone), soil * step(-0.05, depth));
    ink = mix(ink, max(stone * 0.3, gridLine(depth * 2.0 - 1.0, 0.4) * 0.15), soil);
  }
}

// smoke-blackened walls and timbers in the rooms with open fires
// (kitchen, bakehouse, brewhouse): darker towards the roof
void soot(int k, vec3 p, vec3 N, inout vec3 base) {
  if ((k == 1 || k == 3 || k == 4 || k == 10) && N.y < 0.3 && p.x > -6.65 && p.x < 18.65 && p.z < -12.45 && p.z > -21.05 && p.y < 11.9) {
    // plumes of soot rising from each hearth mouth
    float px = min(min(abs(p.x + 3.4), abs(p.x - 2.2)), min(abs(p.x - 9.2), abs(p.x - 13.4)));
    float plume = exp(-px * px / (0.8 + 0.25 * max(p.y - 2.5, 0.0))) * smoothstep(2.0, 3.6, p.y) * step(p.z, -20.0);
    float sm = smoothstep(0.8, 6.5, p.y) * (0.75 + 0.5 * fbm(p * 0.5 + 2.0)) + plume * 0.8;
    base = mix(base, base * vec3(0.4, 0.36, 0.33), clamp(sm, 0.0, 1.0) * 0.75);
  }
}
`;
