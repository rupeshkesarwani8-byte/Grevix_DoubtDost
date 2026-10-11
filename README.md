# DoubtDost

Question ya poore exam paper ki photo upload karo. DoubtDost har question ko alag nikalta hai, jahan shak ho wahan aapse confirm karwata hai, aur phir step-by-step samjhata hai. Dhundhli ya adhoori cheez par andaza nahi lagata.

## Live Demo
https://doubtdost.vercel.app

(Render ka free server kuch der baad so jata hai, to pehla request 30-60 second le sakta hai.)

## Problem
Raat ya exam ke time par jab doubt aata hai, to samjhane wala koi nahi hota. Aur AI tools aksar dhundhli handwriting ya adhoore question ko galat padhkar galat steps de dete hain, jisse student aur confuse ho jata hai.

## Features
- Photo se questions padhna (drag-drop, click ya Ctrl+V)
- Poore paper ki photo se har question alag card me, confidence aur issues ke saath
- Kam bharose, dhundhle ya diagram wale questions student se confirm karwaye jate hain
- Step-by-step explanation: Hinglish, English ya Hindi me
- "Sirf hint" mode, taaki student khud try kare
- Answer ki jaanch, galti ka hint aur practice questions
- Purane doubts ki history

## Tech Stack
React (Vite), FastAPI, Google Gemini API (vision)
Deploy: Vercel (frontend), Render (backend)

## AI Tools Used
Gemini API (app ke andar), Claude (coding aur planning me madad)

## Run Locally
Backend:
    cd backend
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    (backend/.env me GEMINI_API_KEY daalein)
    uvicorn main:app --reload

Frontend:
    cd frontend
    npm install
    npm run dev

## Challenge Cards

### Challenge 1: Multi-question segmentation aur validation
**Card:** poore exam paper ke har question ko alag nikalna, dhundhle ya diagram wale questions par andaza na lagana, aur language, hint mode aur history chalte rehna.

**Maine kya badla:**
- Pipeline do stage me tod di. `/segment` sirf questions padhta hai (confidence, issues aur diagram flag ke saath). `/solve-question` sirf student ke confirm kiye hue question ko solve karta hai.
- Question numbers me gap aur AI ki do alag ginti ka mismatch dikhne par chetavni.
- Chhoti ya kam-resolution photo par har question ko confirm karwana, kyunki testing me AI ne dhundhli photo me galat padhkar bhi 90% bharosa dikhaya.
- Agar jaankari kam ho, to AI "needs clarification" batata hai aur steps nahi banata.
- Gemini ki free quota khatam hone par model fallback.

**Jo nahi badla:** Hinglish/English/Hindi toggle, sirf-hint mode aur purane doubts ki history.

**Testing:** dense exam paper, haath se likha snippet (ek question jaanbujhkar kharab), 30% resize ki hui dhundhli photo, aur diagram wala question.

### Challenge 2
### Challenge 2: Real-World Feedback
**Card:** project ko asli logon ke saamne rakhna, honest feedback lena, aur ek feedback par badlav karna.

**Kahan share kiya:** [LinkedIn / Reddit / WhatsApp group]
**Log kya bole:** [ek-do line]
**Maine kya badla:** [ek-do line]

Poora proof `feedback/` folder me hai (post ke aur feedback ke screenshots, aur note).