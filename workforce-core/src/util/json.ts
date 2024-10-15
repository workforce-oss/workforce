export function replacer(key: string, value: unknown) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

export function reviver(key: string, value: { dataType: string; value: Iterable<readonly [unknown, unknown]> }) {
  if (typeof value === "object" && value !== null) {
    if (value?.dataType === "Map") {
      return new Map(value.value);
    }
  }

  return value;
}

export function jsonStringify(obj: unknown) {
  return JSON.stringify(obj, replacer);
}

export function jsonParse<T>(str?: string | null): T | undefined {
  if (str === undefined || str === null || str === "") {
    return undefined;
  }
  try {
    const result = JSON.parse(str, reviver) as T;
    return result;
  } catch (error) {
    console.error(`jsonParse(): Error parsing JSON: ${str}`, error);
    return undefined;
  }
}

export function parseUncleanArray(jsonString: string): unknown[] {
  let currentSequence = "";
  let insideKey = false;
  let wasInsideKey = false;
  let insideValue = false;

  let newString = ""

  for (const char of jsonString) {
    currentSequence += char;

    if (insideKey) {
      if (currentSequence.endsWith(`\\":`)) {
        wasInsideKey = true;
        insideKey = false;
        newString += currentSequence.slice(0, -3);
        newString += '": ';
        currentSequence = "";
        continue;
      }
    }

    if (insideValue) {
      if (currentSequence.endsWith(`\\",`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '", ';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"]`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '"]';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"}`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '"}';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\" `)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '"';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"\\n`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -4);
        newString += '"';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"\\t`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -4);
        newString += '"';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"\\r`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -4);
        newString += '"';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"\n`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '"';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"\t`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '"';
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith(`\\"\r`)) {
        insideValue = false;
        newString += currentSequence.slice(0, -3);
        newString += '"';
        currentSequence = "";
        continue;
      }


    }

    if (!insideKey && !insideValue) {
      if (currentSequence.startsWith(`"[`)) {
        currentSequence = "";
        newString += "[";
        continue;
      }
      if (currentSequence.endsWith(`[`)) {
        currentSequence = "";
        newString += '[';
        continue;
      }
      if (currentSequence.endsWith(`]`)) {
        currentSequence = "";
        newString += "]";
        continue;
      }
      if (currentSequence.startsWith(`"{`)) {
        currentSequence = "";
        newString += "{";
        continue;
      }
      if (currentSequence.endsWith(`{`)) {
        currentSequence = "";
        newString += "{";
        continue;
      }
      if (currentSequence.endsWith(`}`)) {
        currentSequence = "";
        newString += "}";
        continue;
      }
      if (currentSequence === ' ') {
        currentSequence = "";
        continue;
      }
      if (currentSequence === '\n') {
        currentSequence = "";
        continue;
      }
      if (currentSequence === '\t') {
        currentSequence = "";
        continue;
      }
      if (currentSequence === '\r') {
        currentSequence = "";
        continue;
      }
      if (currentSequence === '\\n') {
        currentSequence = "";
        continue;
      }
      if (currentSequence === '\\t') {
        currentSequence = "";
        continue;
      }
      if (currentSequence.endsWith('\\"')) {
        currentSequence = "";
        if (!wasInsideKey) {
          newString += '"';
          insideKey = true;
          continue;
        }
        if (wasInsideKey) {
          newString += '"';
          wasInsideKey = false;
          insideValue = true;
          continue;
        }

      }
    }
  }
  //now just replace all newlines
  newString = newString.replace(/\n/g, '\\n');

  return JSON.parse(newString) as unknown[];
}
