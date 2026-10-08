/* question-bank.js — banco de preguntas de inglés compartido por los juegos de la arena.
 * Extraído de English Bomb Race 3D (mismo contenido, misma lógica) para no duplicarlo.
 * API: ArenaQuestions.TOPICS · .LEVELS · .bank() · .pick(cfg, custom, usedSet)
 *   cfg    = { mode:'auto'|'manual', topics:[...], level:'e'|'m'|'h' }  (localStorage "ebr.c")
 *   custom = preguntas propias [{q,a,alts,topic,level,kw,exp}]            (localStorage "ebr.q")
 */
(function () {
  'use strict';
  const TOPICS = ["Present Simple","Present Continuous","Past Simple","Past Continuous","Present Perfect","Future (will / going to)","Modal verbs","Comparatives and superlatives","Conditionals","Prepositions","Vocabulary","Daily routines","Food and travel","Work and studies","Conversation questions","Sentence construction","Question formation"];
  const LEVELS = { e: 'Easy', m: 'Intermediate', h: 'Hard' };
  const RAW = ["0|e|What time do you usually wake up?|I usually wake up at seven.","0|m|What does your best friend do on weekends?|My best friend plays soccer on weekends.","1|e|What are you doing right now?|I am answering a question.","1|m|Who is sitting next to you at the moment?|(Name) is sitting next to me.","2|m|What did you do last weekend?|I visited my grandparents.","2|e|Where did you go on your last holiday?|I went to the beach.","3|m|What were you doing at 8 pm last night?|I was watching TV.","3|h|What were you doing when the class started today?|I was talking to my friend.","4|m|Have you ever traveled to another country?|Yes, I have been to Spain.","4|h|How long have you studied English?|I have studied English for three years.","5|e|What will the weather be like tomorrow?|It will be sunny.","5|m|What are you going to do this weekend?|I am going to visit my family.","6|e|Can you swim?|Yes, I can swim.","6|m|What should you do to stay healthy?|I should eat well and exercise.","7|m|Which is bigger, a cat or a dog?|A dog is bigger than a cat.","7|h|Who is the tallest person in your family?|My father is the tallest in my family.","8|m|What will you do if it rains tomorrow?|If it rains, I will stay at home.","8|h|What would you do if you won the lottery?|If I won the lottery, I would travel the world.","9|e|Where is your phone? Use a preposition.|It is in my bag.","9|m|Complete: I was born ___ May.|in","10|e|Name three fruits in English.|Apple, banana, orange.","10|m|What is the opposite of 'expensive'?|Cheap.","11|e|What do you do after school?|I do my homework.","11|m|Describe your morning routine.|I get up, take a shower and have breakfast.","12|e|What is your favorite food?|My favorite food is pizza.","12|m|How do you usually travel to a new city?|I usually travel by bus.","13|e|What is your favorite subject?|My favorite subject is English.","13|m|What job would you like to have? Why?|I would like to be a doctor because I want to help people.","14|e|How are you today?|I'm fine, thank you.","14|m|Tell me about your family.|I have a small family with four people.","15|m|Make a sentence with the word 'because'.|I stay home because I am sick.","15|h|Make a sentence using 'although'.|Although it was cold, we went out.","16|e|Ask me a question about my age.|How old are you?","16|m|Ask a question using 'Where'.|Where do you live?"];
  let cache = null;
  function bank() {
    if (!cache) cache = RAW.map((s) => { const [t, l, q, a] = s.split('|'); return { q, a, alts: [], topic: TOPICS[+t], level: l, kw: [], exp: '' }; });
    return cache;
  }
  /* Elige una pregunta que no esté en `used` (la añade). Misma lógica que Bomb Race. */
  function pick(cfg, custom, used) {
    const BANK = bank();
    const man = cfg.mode === 'manual' && custom.length;
    const A = man ? custom : BANK.filter((q) => cfg.topics.includes(q.topic) && q.level === cfg.level);
    const B = man ? custom : BANK.filter((q) => cfg.topics.includes(q.topic));
    for (const L of [A, B, BANK]) {
      const f = L.filter((q) => !used.has(q.q));
      if (f.length) { const q = f[Math.random() * f.length | 0]; used.add(q.q); return q; }
    }
    used.clear();
    const L = A.length ? A : BANK, q = L[Math.random() * L.length | 0];
    used.add(q.q);
    return q;
  }
  window.ArenaQuestions = { TOPICS, LEVELS, bank, pick };
})();
