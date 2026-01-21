import { loadPyodide, type PyodideInterface } from "pyodide";

let pyodide: PyodideInterface | null = null;

const pythonCode = `
import re
import math
from collections import Counter

ENTROPY_THRESHOLD = 3.6
MIN_LEN = 16
MAX_LEN = 120
MAX_MERGE_GAP = 2

STRING_REGEX = re.compile(r'(["\\'])(?P<value>[^"\\']{16,120})\\1')
WORD_REGEX = re.compile(r'\\b[A-Za-z0-9+/=_-]{20,}\\b')

HEX_REGEX = re.compile(r'^[a-fA-F0-9]{32,}$')
BASE64_REGEX = re.compile(r'^[A-Za-z0-9+/]+=*$')
JWT_REGEX = re.compile(r'^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$')

PATH_REGEX = re.compile(r'(/[^/\\s]+)+')
UUID_REGEX = re.compile(r'\\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\b', re.I)
NUMERIC_ID_REGEX = re.compile(r'\\b\\d{6,}\\b')

def shannon_entropy(s):
    if not s: return 0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    for count in freq.values():
        p = count / len(s)
        entropy -= p * math.log2(p)
    return entropy

class Detection:
    def __init__(self, type, start, end):
        self.type = type
        self.start = start
        self.end = end
    def to_dict(self):
        return {"type": self.type, "start": self.start, "end": self.end}

def detect_auto_secrets(text):
    detections = []
    def consider(value, start, end):
        entropy = shannon_entropy(value)
        if entropy < ENTROPY_THRESHOLD:
            return
        if HEX_REGEX.match(value):
            return
        if BASE64_REGEX.match(value) and len(value) < 40:
            return
        detections.append(Detection("AUTO_SECRET", start, end))

    for m in STRING_REGEX.finditer(text):
        consider(m.group("value"), m.start("value"), m.end("value"))

    for m in WORD_REGEX.finditer(text):
        v = m.group()
        if JWT_REGEX.match(v):
            detections.append(Detection("JWT", m.start(), m.end()))
        else:
            consider(v, m.start(), m.end())
    return detections

def detect_user_keys(text, keys):
    out = []
    if not keys: return out
    for key in keys:
        pattern = re.compile(
            rf'{re.escape(key)}\\s*[:=]\\s*["\\'](?P<v>[^"\\']+)["\\']',
            re.IGNORECASE
        )
        for m in pattern.finditer(text):
            out.append(Detection("USER_KEY", m.start("v"), m.end("v")))
    return out

def detect_literal_texts(text, literals):
    out = []
    if not literals: return out
    for literal in literals:
        for m in re.finditer(re.escape(literal), text, re.IGNORECASE):
            out.append(Detection("USER_LITERAL", m.start(), m.end()))
    return out

def detect_user_regex(text, patterns):
    out = []
    if not patterns: return out
    for r in patterns:
        try:
            for m in re.finditer(r, text):
                out.append(Detection("USER_REGEX", m.start(), m.end()))
        except:
            pass
    return out

def detect_log_artifacts(text, maskPaths, maskUUIDs, maskNumericIds):
    out = []
    if maskPaths:
        for m in PATH_REGEX.finditer(text):
            out.append(Detection("LOG_PATH", m.start(), m.end()))
    if maskUUIDs:
        for m in UUID_REGEX.finditer(text):
            out.append(Detection("LOG_UUID", m.start(), m.end()))
    if maskNumericIds:
        for m in NUMERIC_ID_REGEX.finditer(text):
            out.append(Detection("LOG_NUMERIC_ID", m.start(), m.end()))
    return out

def merge_overlaps(dets):
    if not dets:
        return []
    dets.sort(key=lambda d: d.start)
    merged = [dets[0]]
    for d in dets[1:]:
        last = merged[-1]
        if d.start <= last.end + MAX_MERGE_GAP:
            last.end = max(last.end, d.end)
        else:
            merged.append(d)
    return merged

def mask_value(v, style):
    if style == "full":
        return "[REDACTED]"
    if style == "hash":
        import hashlib
        return hashlib.md5(v.encode()).hexdigest()[:10]
    if len(v) <= 6:
        return "*" * len(v)
    return v[:2] + "*" * (len(v) - 4) + v[-2:]

def redact_content(content, contentType, masking_style, user_hints, log_options):
    detections = []
    detections.extend(detect_auto_secrets(content))
    
    # Ensure they are dicts if they were passed differently or are None
    if user_hints is None: user_hints = {}
    if log_options is None: log_options = {}

    detections.extend(detect_user_keys(content, user_hints.get("keys", [])))
    detections.extend(detect_literal_texts(content, user_hints.get("literalTexts", [])))
    detections.extend(detect_user_regex(content, user_hints.get("regexPatterns", [])))
    
    if contentType == "log" and log_options:
        detections.extend(detect_log_artifacts(
            content, 
            log_options.get("maskPaths", False),
            log_options.get("maskUUIDs", True),
            log_options.get("maskNumericIds", False)
        ))
    
    merged = merge_overlaps(detections)
    
    masked_content = content
    for d in sorted(merged, key=lambda x: x.start, reverse=True):
        val = content[d.start:d.end]
        replacement = mask_value(val, masking_style)
        masked_content = masked_content[:d.start] + replacement + masked_content[d.end:]
    
    by_type = {}
    for d in detections:
        by_type[d.type] = by_type.get(d.type, 0) + 1
        
    return {
        "maskedContent": masked_content,
        "summary": {
            "totalMasked": len(merged),
            "byType": by_type
        },
        "entities": [d.to_dict() for d in merged]
    }
`;

async function initPyodide() {
    if (!pyodide) {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.2/full/",
        });
        // @ts-ignore
        await pyodide.runPythonAsync(pythonCode);
        self.postMessage({ type: "READY" });
    }
    return pyodide;
}

self.onmessage = async (event: MessageEvent) => {
    const { type, data, id } = event.data;

    if (type === "REDACT") {
        try {
            const py = await initPyodide();
            const redactFn = py.globals.get("redact_content");
            const result = redactFn(
                data.content,
                data.contentType,
                data.masking.style,
                py.toPy(data.masking.userHints),
                py.toPy(data.masking.logOptions)
            ).toJs({ dict_converter: Object.fromEntries });

            self.postMessage({ type: "REDACT_RESULT", data: result, id });
        } catch (error: any) {
            self.postMessage({ type: "REDACT_ERROR", error: error.message, id });
        }
    }
};
