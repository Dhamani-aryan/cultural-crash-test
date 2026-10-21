/** The ways a name may legitimately appear: as listed, or without a leading "The". */
export function nameForms(e: { displayName: string; name: string; akas: string[] }): string[] {
  const names = [e.displayName, e.name, ...e.akas];
  return [...names, ...names.map((n) => n.replace(/^the\s+/i, ""))].filter((n) => n.length > 1);
}
