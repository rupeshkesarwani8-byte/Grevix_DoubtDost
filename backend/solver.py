import os
import re
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

SEGMENT_PROMPT = """
Tum ek exam-paper reader ho. Image me jitne bhi questions hain, unhe ALAG-ALAG nikalo.
Solve mat karo, sirf padho. Header, instructions, marks table, CO/K-level jaisi cheezein question nahi hain.

Image tirchi, ulti ya side me ghumi hui ho sakti hai. Use mentally seedha karke padho.

Pehle 'transcript' me image ka SAARA likha hua text line-by-line likho (jaisa dikhe). Phir har question-jaisi line ko 'questions' me daalo.
Har line jo Solve, Find, Convert, Simplify, Prove, Explain, Calculate, Write, What, How, Define, Derive jaise shabd se shuru ho, ya jisme '=' ya '?' ho, ek question hai, chahe wo adhoori, kati hui ya kharab likhi ho.

Sirf JSON do, is format me:
{
  "transcript": ["line 1", "line 2"],
  "expected_count": <transcript me question-jaisi lines ki ginti>,
  "questions": [
    {
      "number": "question number jaise 1, 2, 3 (na likha ho to order se do)",
      "text": "question ka poora text",
      "confidence": 0.0 se 1.0 ke beech,
      "issues": ["koi dikkat ho to chhota vakya, warna khali list"],
      "has_diagram": true ya false
    }
  ]
}

Niyam:
- text me question waisa hi likho jaisa image me hai. Translate mat karo. Formula aur symbols jaise dikhte hain waise.
- Jo shabd ya number saaf padha nahi ja raha, use guess mat karo. Text me [?] likho, issues me batao, aur confidence 0.6 se kam rakho.
- Adhoora ya kata hua question bhi list me rakho. Use kabhi skip mat karo.
- confidence: 0.9 ya upar jab har akshar saaf ho. 0.6 se 0.85 jab thoda dhundhla ho. 0.6 se kam jab kaafi andaza lagana pad raha ho.
- has_diagram true karo jab question kisi figure, graph, circuit ya table par depend kare. Agar ek hi diagram kai questions share karte hain, to un sab me has_diagram true karo aur issues me 'shared diagram' likho.
- Sub-parts (a), (b) ko usi question ke text me rakho.
- Agar image me koi question nahi hai, to 'questions' khali list rakho.
"""

COUNT_PROMPT = """
Image me kitne alag-alag questions ya instructions hain (jaise Solve..., Find..., Convert...)? 
Adhoore, kate hue ya kharab likhe questions ko bhi ginein. Image tirchi ho sakti hai.
Sirf JSON do: {"count": <number>}
"""

SOLVE_PROMPT = """
Tum DoubtDost ho, ek dost jaisa tutor. Neeche student ka CONFIRMED question hai. Sirf isi question ko solve karo.

Question:
\"\"\"__QUESTION__\"\"\"

Agar image di gayi hai, to wo sirf diagram ya figure dekhne ke liye hai.

Sirf JSON do, is format me:
{
  "status": "ok" ya "needs_clarification",
  "missing": "needs_clarification ho to saaf likho ki kya jaankari chahiye, warna khali",
  "subject": "subject ka naam",
  "steps": ["step 1", "step 2"],
  "final_answer": "final answer",
  "verification": "apne answer ko wapas jaanchne ka ek vakya",
  "mistake_hint": "students yahan aksar galti karte hain, ek vakya",
  "practice_questions": ["milta-julta question 1", "question 2"]
}

Niyam (bahut zaroori):
- Saari explanation __LANG__ me ho.
- Koi value, diagram ki detail ya data apni taraf se MAT banao. Agar question me kuch kam hai, [?] hai, ya diagram ke bina solve nahi ho sakta, to status 'needs_clarification' do aur 'missing' me batao ki kya chahiye. Steps khali rakho.
- Har step chhota aur logical ho. Maximum 8 steps.
- Calculation dhyan se karo. 'verification' me answer ko value daalkar ya doosre tareeke se jaancho. Match na kare to dobara solve karo.
- Agar theory question hai, to verification me 'Theory question, calculation nahi' likho.
- practice_questions me 2 milte-julte questions do.
"""

HINT_RULE = """
Mode: HINT ONLY. Pura answer mat batao. 'final_answer' me sirf "Pehle khud try karo" likho,
aur 'steps' me sirf 2-3 hints do, poora solution nahi. 'verification' khali rakho.
"""


def _loads(text):
    text = (text or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
    raise ValueError("AI ka jawab samajh nahi aaya, dobara try karein")


def _generate(contents, budget, max_tokens):
    cfg = dict(response_mime_type="application/json", max_output_tokens=max_tokens)
    try:
        return client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=budget), **cfg
            ),
        )
    except Exception:
        return client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(**cfg),
        )


def _num(n):
    m = re.search(r"\d+", str(n or ""))
    return int(m.group()) if m else None


def _count_questions(image_bytes, mime_type):
    """Doosri, alag ginti. Fail ho to None, taaki main flow na ruke."""
    try:
        contents = [types.Part.from_bytes(data=image_bytes, mime_type=mime_type), COUNT_PROMPT]
        data = _loads(_generate(contents, 0, 256).text)
        return int(data.get("count"))
    except Exception:
        return None


def segment_questions(image_bytes: bytes, mime_type: str) -> dict:
    contents = [types.Part.from_bytes(data=image_bytes, mime_type=mime_type), SEGMENT_PROMPT]
    data = _loads(_generate(contents, 0, 12288).text)

    raw = data.get("questions", []) if isinstance(data, dict) else []
    first_count = data.get("expected_count") if isinstance(data, dict) else None

    questions, seen = [], set()
    for i, q in enumerate(raw):
        if not isinstance(q, dict):
            continue
        text = str(q.get("text", "")).strip()
        if not text:
            continue
        number = str(q.get("number") or i + 1)
        key = (number, text.lower())
        if key in seen:
            continue
        seen.add(key)

        try:
            conf = float(q.get("confidence", 0.5))
        except (TypeError, ValueError):
            conf = 0.5
        conf = max(0.0, min(1.0, conf))

        issues = [str(x) for x in (q.get("issues") or []) if str(x).strip()]
        has_diagram = bool(q.get("has_diagram"))
        if "[?]" in text and not issues:
            issues.append("Kuch shabd saaf nahi padhe gaye")

        questions.append({
            "id": f"q{i + 1}",
            "number": number,
            "text": text,
            "confidence": round(conf, 2),
            "issues": issues,
            "has_diagram": has_diagram,
            "needs_confirmation": conf < 0.85 or bool(issues) or has_diagram,
        })

    warnings = []

    nums = sorted({n for n in (_num(q["number"]) for q in questions) if n is not None})
    if nums:
        missing = [str(n) for n in range(nums[0], nums[-1] + 1) if n not in nums]
        if missing:
            warnings.append(
                f"Question {', '.join(missing)} nahi mile. Shayad chhoot gaye hain, 'Question jodein' se khud add karein."
            )

    try:
        first_count = int(first_count)
    except (TypeError, ValueError):
        first_count = None
    second_count = _count_questions(image_bytes, mime_type)
    counts = [c for c in (first_count, second_count) if c]
    expected = max(counts) if counts else None

    if expected and expected > len(questions):
        warnings.append(
            f"Image me lagbhag {expected} questions dikhe, par sirf {len(questions)} mile. Koi question chhoot sakta hai, 'Question jodein' se add karein."
        )

    return {"questions": questions, "warnings": warnings, "expected_count": expected}


def solve_question(question_text, mode="full", lang="hinglish", image_bytes=None, mime_type=None) -> dict:
    prompt = SOLVE_PROMPT.replace("__LANG__", LANGS.get(lang, LANGS["hinglish"]))
    prompt = prompt.replace("__QUESTION__", question_text)
    if mode == "hint":
        prompt += HINT_RULE

    contents = []
    if image_bytes and mime_type:
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
    contents.append(prompt)

    data = _loads(_generate(contents, 2048, 8192).text)
    if not isinstance(data, dict):
        raise ValueError("AI ka jawab samajh nahi aaya, dobara try karein")
    data.setdefault("status", "ok")
    data.setdefault("missing", "")
    data.setdefault("steps", [])
    data.setdefault("practice_questions", [])
    return data