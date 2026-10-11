# Build Log

## 12:20 AM - Idea chuna
- AI ne kya kiya: hackathon ideas ki list banayi
- Maine kya decide kiya: Photo-to-Hinglish Doubt Solver (DoubtDost) chuna kyunki main khud student hu aur demo saaf dikhta hai
- Maine kya reject kiya: pehle ke apne projects (NyayaGig, DriftAI), kyunki unka code hackathon se pehle ka tha aur rules ke hisaab se project 24 ghante me banna chahiye

## 12:50 AM - Core flow ban gaya
- AI ne kya kiya: FastAPI backend aur React frontend ka starter code likha
- Maine kya decide kiya: Gemini vision API use karna, JSON me jawab maangna, aur "sirf hint" mode alag rakhna
- Maine kya reject kiya: alag OCR library, kyunki Gemini seedha image padh leta hai

## 1:00 AM - Dark theme aur extra features
- AI ne kya kiya: dark glass UI, drag-drop upload aur CSS likha
- Maine kya decide kiya: bhasha selector (Hinglish/English/Hindi), purane doubts ki history, aur Ctrl+V se photo paste
- Maine kya reject kiya: login system, kyunki 24 ghante me core flow zyada zaroori tha

## 1:15 AM - Multi-question support aur ek bug
- AI ne kya kiya: single-question flow ko list-of-questions me badalne ka code likha
- Dikkat aayi: 6 questions ka jawab beech me kat jaata tha ("Unterminated string" error), kyunki Gemini ka thinking token budget kha raha tha
- Maine kya decide kiya: thinking band ki, output limit badhayi, aur kata hua JSON bachane ka fallback rakha
- Maine kya reject kiya: har question ko alag crop karwana, kyunki wo user par bojh hai

## 2:10 AM - Deploy
- Maine kya decide kiya: backend Render par, frontend Vercel par, taaki live demo link ready rahe
- Maine kya reject kiya: ek hi server par dono, kyunki alag deploy se frontend jaldi update hota hai

## 9:15 AM - Challenge Card 1: card mere project se match nahi kiya
- Card ka sawal: Eligibility Tracker ke liye offline mode (network toote to data na khoye)
- Dikkat: registration me maine NyayaGig ka idea bataya tha, aur card usi par bana tha. Par maine hackathon me naya project DoubtDost banaya, jisme koi tracker nahi hai
- Maine kya decide kiya: organizers ko seedha sach bataya ki NyayaGig pehle se bana hua tha, isliye use nahi kiya, aur DoubtDost ka link bheja. Unhone mere naye project ke hisaab se naya card jari kiya
- Maine kya reject kiya: NyayaGig par wapas jaana ya uska code reuse karna, kyunki wo hackathon se pehle ka project hai

## 9:25 AM - Naya Challenge Card: multi-question segmentation aur validation
- Card ka sawal: poore paper ke questions bina chhoote alag karna, dhundhle ya diagram wale questions par andaza na lagana, aur language, hint mode aur history chalte rehna
- Maine kya decide kiya: pipeline do stage me tod di. Pehle /segment sirf questions padhta hai (confidence, issues, diagram flag ke saath), phir student ke confirm karne par hi /solve-question chalta hai
- AI ne kya kiya: dono prompts, backend endpoints aur frontend ke question cards likhe
- Maine kya reject kiya: ek hi call me padhna aur solve karna, kyunki galat padha question galat steps deta tha
- Validation: question numbers me gap aur count mismatch par chetavni dikhti hai, aur kam bharose wale question ko student se confirm karwata hu

## 12:00 PM - Test 2: handwritten snippet me ek question gir gaya
- Test: kaagaz par 4 questions haath se likhe (ek jaanbujhkar kharab), phir photo upload ki
- Problem: app ne sirf 3 questions dikhaye aur Q4 chupchap gir gaya. Haath se likhe questions me number nahi hote, aur AI ki apni ginti bhi 3 hi thi
- Maine kya decide kiya: prompt me "Solve/Find/Convert" se shuru hone wali har line ko question maanna, ghumi hui image bhi padhna, aur ek doosri alag ginti (COUNT_PROMPT) jodi. Dono me jo badi ho wo count maani jaati hai, aur mismatch par chetavni dikhti hai
- Result: ab 4 cards aate hain, aur dhundhla Q2 "Check karein" flag ke saath aata hai

## 12:30 PM - Test 3: blur photo me silent misread mila
- Test: handwritten photo ko 30% resize karke upload kiya
- Problem: AI ne dy/dx ko "dy" aur "= 2" ko "= 2x" padha, par phir bhi 90% "Pakka padha" bola. AI apni galti khud nahi pakadta
- Maine kya decide kiya: AI ke confidence par bharosa kam kiya, aur ek seedha rule lagaya: chhoti ya kam-resolution photo me har question ko student se confirm karwana
- Maine kya reject kiya: sirf prompt kasna, kyunki model ki confidence unreliable thi

## 12:30 PM - Gemini free quota khatam
- Problem: testing me gemini-2.5-flash ki roz ki 20 requests khatam ho gayi (429 error)
- Maine kya decide kiya: model fallback list lagayi (flash se flash-lite), taaki ek model band ho to app chalta rahe


## 1:00 PM - Test 4: diagram wala question
- Test: logic circuit ke figure wala question upload kiya
- Result: "Diagram wala" tag aaya aur app ne bina diagram ki jaankari ke steps nahi banaye