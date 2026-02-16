# Terminal Manual Checklist

1. Start server with `npm run dev` and open `http://localhost:3000/login`.
2. Complete mock login, nickname creation, faction/sect selection until `/terminal`.
3. In terminal input, type `상태` and press Enter.
4. Verify header starts with `【상태】` and line body includes name/sex/faction/sect/time.
5. Type `/상태` and verify same result as step 4.
6. Type `문파` and verify header starts with `【문파】` and includes prestige/roster.
7. Type `도움` and verify supported command list is shown.
8. Type `도움 문파` and verify command-specific help response (`【안내】 명령 도움`).
9. Type unknown command (e.g. `foo`) and verify error header `【오류】`.
10. Open browser devtools Network tab and verify `POST /command` returns JSON with keys:
`ok`, `header`, `lines`, `actions`.
