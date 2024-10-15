export function slug(str: string): string {
    return str.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");
}

export function isCompleteSentence(text?: string): boolean {
    if (!text) {
        return false;
    }
    if (text.trim() === "") {
        return false;
    }
    return text.trimEnd().endsWith(".") || text.trimEnd().endsWith("!") || text.trimEnd().endsWith("?") || text.endsWith("\n");
}