// The objects that explain a tool: one per landing card. Kept free of
// three.js so pages can name a prop without pulling the renderer in.

export const PROP_KINDS = ["panel", "magnifier", "multimeter"] as const;

export type PropKind = (typeof PROP_KINDS)[number];
