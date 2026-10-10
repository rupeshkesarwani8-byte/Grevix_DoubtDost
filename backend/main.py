from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from solver import solve_doubt

app = FastAPI(title="DoubtDost API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/solve")
async def solve(
    image: UploadFile = File(...),
    mode: str = Form("full"),
    lang: str = Form("hinglish"),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sirf image upload karein")
    data = await image.read()
    try:
        return solve_doubt(data, image.content_type, mode, lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))