import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

LANGS = {
    "hinglish": "simple Hinglish (Hindi + English mix, Roman script me)",
    "english": "simple English",
    "hindi": "saral Hindi (Devanagari script me)",
}

BASE_PROMPT = """
Tum DoubtDost ho, ek dost jaisa tutor jo students ke doubts samjhata hai.
Image me ek ya zyada questions ho sakte hain (jaise exam paper). Image ke SAARE questions alag-alag dhoondho
aur har question ko solve karo. Header, instructions, marks, CO/K-level jaisi cheezein question nahi hain, unhe ignore karo.
Sirf JSON me jawab do, is format me:

{
  "questions": [
    {
      "number": "question number jaise 1, 2, 3 (na dikhe to 1)",
      "subject": "subject ka naam",
      "question_text": "image se padha hua question",
      "steps": ["step 1", "step 2"],
      "final_answer": "final answer",
      "mistake_hint": "ek chhota hint ki students kahan galti karte hain",
      "practice_questions": ["milta-julta question"]
    }
  ]
}

Niyam:
- Saari explanation __LANG__ me ho.
- Image me jitne questions hain, sabke liye ek alag item banao, number ke order me.
- Jawab CHHOTA rakho: har question me maximum 5 steps, har step 1-2 chhote vakya ka.
- 'mistake_hint' sirf ek vakya ka ho.
- Agar sirf ek question hai to 'practice_questions' me 3 questions do. Agar zyada questions hain to har ek ke liye sirf 1.
- Agar image me koi question nahi dikhta, to 'questions' me ek item rakho jisme question_text "Question nahi mila" ho aur baaki fields khali ho.
"""

HINT_RULE = """
Mode: HINT ONLY. Kisi bhi question ka pura answer mat batao. Har question ke 'final_answer' me sirf
"Pehle khud try karo" likho, aur 'steps' me sirf 2-3 hints do, poora solution nahi.
"""


def _salvage(text: str) -> dict:
    """Kata hua JSON ho to jitne poore questions mile, utne bacha lo."""
    key = text.find('"questions"')
    start = text.find("[", key) if key != -1 else -1
    if start == -1:
        raise ValueError("AI ka jawab samajh nahi aaya, dobara try karein")
    decoder = json.JSONDecoder()
    i = start + 1
    items = []
    while True:
        while i < len(text) and text[i] in " \n\r\t,":
            i += 1
        if i >= len(text) or text[i] != "{":
            break
        try:
            obj, end = decoder.raw_decode(text, i)
        except json.JSONDecodeError:
            break
        items.append(obj)
        i = end
    if not items:
        raise ValueError("AI ka jawab adhoora aaya, dobara try karein")
    return {"questions": items}


def _normalize(data):
    if isinstance(data, list):
        return {"questions": data}
    if isinstance(data, dict) and "questions" in data:
        return data
    if isinstance(data, dict):
        return {"questions": [data]}
    return {"questions": []}


def _call(contents, use_thinking_off: bool):
    cfg = dict(response_mime_type="application/json", max_output_tokens=16384)
    if use_thinking_off:
        cfg["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    return client.models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(**cfg),
    )


def solve_doubt(image_bytes: bytes, mime_type: str, mode: str = "full", lang: str = "hinglish") -> dict:
    lang_text = LANGS.get(lang, LANGS["hinglish"])
    prompt = BASE_PROMPT.replace("__LANG__", lang_text)
    if mode == "hint":
        prompt += HINT_RULE

    contents = [types.Part.from_bytes(data=image_bytes, mime_type=mime_type), prompt]

    try:
        response = _call(contents, True)
    except Exception:
        response = _call(contents, False)

    text = response.text or ""
    try:
        return _normalize(json.loads(text))
    except json.JSONDecodeError:
        return _normalize(_salvage(text))