/* GAME CONFIG — to add a game: copy one entry, set path and art ('bomb' | 'wheel' | 'icon' | 'mystery' | 'dart'). */
window.GAMES = [
  { id:"bomb-race", title:"ENGLISH BOMB RACE 3D", description:"Three players. Three tracks. Three bombs. Can you survive?",
    path:"games/bomb-race/index.html", icon:"💣", color:"#ff4d4d", art:"bomb",
    how:"A draw picks 3 players. Each walks their track; a bomb explodes and a 30 s English question appears. The teacher judges the answer: a wrong one costs a limb. Most limbs wins!" },
  { id:"name-roulette", title:"RULETA INTELIGENTE", description:"Spin the wheel to pick students fairly: rounds, history and fair mode.",
    path:"games/name-roulette/index.html", icon:"🎡", color:"#2d7bff", art:"wheel",
    how:"Add your students, press GIRAR and the wheel picks 1–5 names. Fair mode lowers the odds of those already picked. Nobody repeats within a round." },
  { id:"mystery-boxes", title:"MYSTERY BOXES", description:"Pick students at random from mystery boxes and test their English.",
    path:"games/mystery-boxes/index.html", icon:"🎁", color:"#b26bff", art:"mystery",
    how:"Add your students and press START ROUND: the 3D boxes shuffle and one opens to reveal a student, who answers an English question out loud. The teacher marks CORRECT or INCORRECT. A student who has been picked is out for the rest of the round; PLAY AGAIN starts a fresh round with everybody." },
  { id:"student-dart", title:"STUDENT DART", description:"Aim the bow with your mouse and shoot: the arrow picks the student.",
    path:"games/student-dart/index.html", icon:"🎯", color:"#2ee6a6", art:"dart",
    how:"Add your students, then move the mouse to aim the bow at a sector of the board and fire with SPACE or SHOOT ARROW. The sector the arrow hits decides the student; a miss picks nobody. The teacher marks the English answer CORRECT or INCORRECT. A picked student leaves the board until the round ends; PLAY AGAIN brings everybody back." }
];
