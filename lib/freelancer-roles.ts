export const FREELANCER_ROLES = [
  "ACTOR",
  "VIDEOGRAPHER",
  "VIDEO_EDITOR",
  "PHOTOGRAPHER",
  "SOUND_ENGINEER",
  "GRAPHIC_DESIGNER",
  "OTHER",
] as const;

// Singular — for the one-freelancer dropdown/badge.
export const FREELANCER_ROLE_LABELS: Record<string, string> = {
  ACTOR: "Actor",
  VIDEOGRAPHER: "Videographer",
  VIDEO_EDITOR: "Video Editor",
  PHOTOGRAPHER: "Photographer",
  SOUND_ENGINEER: "Sound Engineer",
  GRAPHIC_DESIGNER: "Graphic Designer",
  OTHER: "Other",
};

// Plural — for grouped section headers.
export const FREELANCER_ROLE_GROUP_LABELS: Record<string, string> = {
  ACTOR: "Actors",
  VIDEOGRAPHER: "Videographers",
  VIDEO_EDITOR: "Video Editors",
  PHOTOGRAPHER: "Photographers",
  SOUND_ENGINEER: "Sound Engineers",
  GRAPHIC_DESIGNER: "Graphic Designers",
  OTHER: "Other",
};

export function freelancerRoleLabel(role: string): string {
  return FREELANCER_ROLE_LABELS[role] ?? role;
}

export function freelancerRoleGroupLabel(role: string): string {
  return FREELANCER_ROLE_GROUP_LABELS[role] ?? role;
}
