# DoubtDost

Question ya poore exam paper ki photo upload karo, AI har question ko step-by-step samjhata hai, galti ka hint deta hai aur practice questions banata hai.

## Live Demo
https://doubtdost.vercel.app

## Problem
Raat ya exam ke time par jab doubt aata hai, to samjhane wala koi nahi hota. DoubtDost ek dost ki tarah, aapki bhasha me, turant madad karta hai.

## Features
- Photo se questions padhna (drag-drop, click ya Ctrl+V)
- Poore paper ki photo se saare questions alag tabs me
- Step-by-step explanation: Hinglish, English ya Hindi me
- "Sirf hint" mode, taaki student khud try kare
- Galti ka hint aur practice questions
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
(Challenge 1 aur 2 ke baad project me kya badla, yahan likhenge)