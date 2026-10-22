// The parts of the surface shader that know the plan of Las Aguzaderas
// (see src/castle/shader.js for what each function is for). Boxes follow
// layout.js and must change with it.

export const AGUZADERAS_GLSL = /* glsl */ `
// indoors: the keep's two chambers and stairs, the tower chambers, the
// albarrana tower
float roofed(vec3 p) {
  float m = 0.0;
  if (p.x > -3.25 && p.x < 5.0 && p.z > -3.25 && p.z < 3.3 && p.y > 0.9 && p.y < 11.15) m = 1.0;
  if (p.x > -3.25 && p.x < 2.35 && p.z > -3.25 && p.y > 0.9 && p.y < 6.2) m = 1.05; // the ground floor is darker
  // corner-tower chambers (inner 3.2 m square above the wall-walk)
  vec2 sw = abs(p.xz - vec2(-17.8, 0.9));
  vec2 se = abs(p.xz - vec2(17.8, 0.9));
  vec2 nw = abs(p.xz - vec2(-17.8, -34.7));
  bool inT = max(sw.x, sw.y) < 1.65 || max(se.x, se.y) < 1.65 || max(nw.x, nw.y) < 1.65;
  if (inT && p.y > 6.45 && p.y < 10.5) m = 1.0;
  // the albarrana tower
  if (p.x > 12.45 && p.x < 15.85 && p.z > -41.55 && p.z < -38.25 && p.y > -0.1 && p.y < 11.5) m = 0.7;
  return m;
}

// the courtyard and the ground round about are much the same level
float groundAt(vec3 p) {
  return 0.0;
}

// the outer sides of the terrain block are cut faces too
bool sectionSide(vec3 p, vec3 N) {
  return abs(N.y) < 0.3 && (p.x > 95.9 || p.x < -95.9 || p.z < -117.9);
}

// soil over rock is drawn as separate solids here: nothing to add
void topsoil(vec3 p, vec3 N, inout vec3 base, inout float ink) {}

// no open hearths indoors
void soot(int k, vec3 p, vec3 N, inout vec3 base) {}
`;
