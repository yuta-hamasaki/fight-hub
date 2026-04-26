export function decodeDescription(value: string | null) {
  const input = value ?? "";
  const match = input.match(/^\[\[format:(online|in_person|hybrid)\]\]\n?/i);

  if (!match) {
    return { format: "online", description: input };
  }

  return {
    format: match[1].toLowerCase(),
    description: input.replace(
      /^\[\[format:(online|in_person|hybrid)\]\]\n?/i,
      "",
    ),
  };
}