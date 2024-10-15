export function snakeify(str: string): string {
    const capsReplacement = str.replace(/([A-Z])/g, (letter) => `_${letter.toLowerCase()}`);
    const spaceReplacement = capsReplacement.replace(/ /g, "_");
    const dashReplacement = spaceReplacement.replace(/-/g, "_");
    const cleanse = dashReplacement.replace(/[^a-zA-Z0-9_]/g, "");
    const dedupe = cleanse.replace(/_+/g, "_");
    const trim = dedupe.replace(/^_/, "");
    const result = trim.replace(/_$/, "");
    return result;
}