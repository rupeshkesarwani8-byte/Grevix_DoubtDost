from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from solver import segment_questions, solve_question

app = FastAPI(title="DoubtDost API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _fail(e):
    msg = str(e)
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
        return HTTPException(
            status_code=429,
            detail="Aaj ki free AI limit khatam ho gayi hai. Kuch der baad ya kal dobara try karein.",
        )
    return HTTPException(status_code=500, detail=msg)


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/segment")
async def segment(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sirf image upload karein")
    data = await image.read()
    try:
        return segment_questions(data, image.content_type)
    except Exception as e:
        raise _fail(e)


@app.post("/solve-question")
async def solve(
    question_text: str = Form(...),
    number: str = Form(""),
    mode: str = Form("full"),
    lang: str = Form("hinglish"),
    image: Optional[UploadFile] = File(None),
):
    question_text = question_text.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="Question khali hai")
    if len(question_text) > 4000:
        raise HTTPException(status_code=400, detail="Question bahut lamba hai")

    image_bytes, mime = None, None
    if image is not None and image.content_type and image.content_type.startswith("image/"):
        image_bytes = await image.read()
        mime = image.content_type

    try:
        return solve_question(question_text, mode, lang, image_bytes, mime)
    except Exception as e:
        raise _fail(e)