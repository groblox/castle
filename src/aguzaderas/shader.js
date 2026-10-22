// Placeholder until the plan is in: nothing roofed, flat ground.
export const AGUZADERAS_GLSL = /* glsl */ `
float roofed(vec3 p) { return 0.0; }
float groundAt(vec3 p) { return 0.0; }
bool sectionSide(vec3 p, vec3 N) { return false; }
void topsoil(vec3 p, vec3 N, inout vec3 base, inout float ink) {}
void soot(int k, vec3 p, vec3 N, inout vec3 base) {}
`;
