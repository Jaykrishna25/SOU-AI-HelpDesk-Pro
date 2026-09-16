// three.js r128 predates reliable bundled types, and @types/three tracks a much
// newer API. ThreeBackground only uses a handful of primitives, so declare the
// module rather than pull in a types package that would disagree with r128.
declare module "three";
