/* Dialogue pools — per-person topics, ambient, props */

const LINES = {
  ambient: [
    "Is this embargoed or just… vibes?",
    "v7_final_FINAL — we mean it this time.",
    "Quick sync? Five minutes. Okay twenty.",
    "Journalist just replied. With one word: 'Noted.'",
    "Coffee first. Strategy second. Coffee again.",
    "Can someone sanity-check this headline?",
    "Client call in ten — smiling already.",
    "The media list has duplicates. Of course it does.",
    "Typhoon signal gossip vs actual work… multitasking.",
    "Who moved my sticky notes lah?",
    "Deck fonts must match. Must. Match.",
    "Anyone free to brainstorm a Q&A?",
    "Press release draft landing in Slack… now.",
    "IFC lunch run? Asking for a friend.",
    "This quote needs one more polish pass.",
    "Embargo lifts at 6am. Set three alarms.",
    "Legal said yes — miracle achieved.",
    "Can we make the chart less… charty?",
    "Stand-up in the aisle. Instant meeting room.",
    "Wi-Fi hiccup. Classic dramatic timing.",
    "Someone brought snacks. Morale +10.",
    "Tracking link vs vanity URL debate continues.",
    "The PDF won't attach. It never attaches.",
    "Subject line options: A, B, or chaos.",
    "We need a better photo. And better light.",
    "Translator pinged back. Good news!",
    "Calendar is a suggestion, right?",
    "On mute. Definitely on mute. …Not on mute.",
    "Boilerplate paragraph doing heavy lifting.",
    "Who's on point for the evening drop?",
    "Bloomberg's blinking. Markets are dramatic today.",
    "Phone booth free? Taking this call off-floor.",
    "Printer jammed mid-hero-moment.",
    "Huddle room for four — claim it before Corp does.",
    "MD walking by. Sit up. Smile. Ship.",
    "Director review at 3. Draft better be awake.",
    "Coverage hit! Soft cheer only — open office.",
    "Can we kill 'synergy' in this paragraph?",
    "Stakeholder map grew again overnight.",
    "I'm power-posing at the water cooler.",
  ],

  generic: [
    "Busy season energy over here.",
    "Just chasing a reply… forever.",
    "The open office hears everything, wor.",
    "Another green light. Let's go.",
    "Heads down, headphones on, ship mode.",
  ],

  deskWork: [
    "Inbox: 47. Courage: 3. Let's go.",
    "Polishing the lede one more time…",
    "Calendar says focus block. Calendar is optimistic.",
    "Typing noises = productivity (citation needed).",
    "Director brain: on. Slack: muted-ish.",
  ],

  coffeeLines: [
    "Ah. Liquid focus. Don't tell my sleep schedule.",
    "Coffee acquired. Personality restored.",
    "This cup is doing PR for my brain.",
    "Strategy tastes better caffeinated.",
  ],

  waterLines: [
    "Hydration: the unsexy productivity hack.",
    "Water cooler: free gossip optional.",
    "Refill complete. Back to the narrative.",
  ],

  printerLines: [
    "Printer: jam cleared with pure spite.",
    "Warm pages. Cold coffee. Balance.",
    "Printed the deck. It looks… printable.",
    "Toner low. Morale also low. We persist.",
    "Who printed 40 pages of 'test'? Legendary.",
  ],

  bloombergLines: [
    "Orange terminal energy. Very finance chic.",
    "Markets moving. Our embargo still holds. Good.",
    "Bloomberg: expensive wallpaper with feelings.",
    "Headline scroll is a whole soap opera.",
    "Checking peers… for research. Mostly.",
  ],

  booth1Lines: [
    "Solo booth: privacy unlocked.",
    "Door closed. Voice soft. Client hears confidence.",
    "Best meeting room under two square meters.",
    "Left the booth calmer. Or at least quieter.",
  ],

  booth4Lines: [
    "Huddle of four: instant war room.",
    "Whiteboard energy without the whiteboard.",
    "Four brains, one deadline. Classic.",
    "Exited the booth with a plan. Sort of.",
  ],
};

/** Per-person multi-topic dialogue (warm comedy, fictional) */
const PERSON_DIALOGUE = {
  angela: {
    greetings: [
      "Hey — walk with me, metaphorically. I'm at my desk.",
      "Good timing. I was about to prioritize the prioritization.",
      "Hi. If this is a fire, let's make it a controlled burn.",
    ],
    ambient: [
      "Keep the narrative tight and kind.",
      "If the story is clear, the deck almost writes itself.",
      "Great turnaround energy from the team today.",
      "MD calendar: meetings about meetings. Still love this job.",
    ],
    topics: [
      {
        ask: "What's the MD priority today?",
        answers: [
          "Protect the big stories, unblock the team, and say no to false urgency.",
          "One client needs counsel, two need calm, everyone needs clarity.",
          "Make sure directors have air cover so associates can ship.",
        ],
      },
      {
        ask: "How do you want the floor to feel?",
        answers: [
          "Busy but kind. Loud ideas, quiet ego.",
          "Like a newsroom with better snacks and better manners.",
          "High standards, low drama. That's the brand.",
        ],
      },
      {
        ask: "Any counsel for the team?",
        answers: [
          "Lead with the audience. Then the client. Then the adjectives.",
          "If you're stuck, escalate early — not after the embargo.",
          "Ship something true. Polish is free; panic is expensive.",
        ],
      },
      {
        ask: "How's the director bench?",
        answers: [
          "Strong. Row 1 is carrying a lot — and doing it with humor.",
          "They make me look organized. Don't tell them.",
          "Directors own the craft. I own the weather system.",
        ],
      },
      {
        ask: "Client heat map?",
        answers: [
          "Two warm, one spicy, zero actual fires. Prefer it that way.",
          "I'll take a hard conversation over a silent surprise.",
          "We're trusted. That's the real KPI.",
        ],
      },
    ],
  },

  ricky: {
    greetings: [
      "Oh hey — mind the draft tabs. There are… many.",
      "Perfect. I needed a human who isn't a comment bubble.",
      "Hi. If you see v7_final_FINAL, look away for your own safety.",
    ],
    ambient: [
      "The paragraph is fighting me. I'm fighting back.",
      "Narrative arc first. Bullet points later.",
      "Director mode: protect the story, not the ego.",
    ],
    topics: [
      {
        ask: "What's on your plate as Director?",
        answers: [
          "Key drafts, story spine for a deck, and one 'can you just quickly…' that isn't quick.",
          "I'm architecting the narrative so juniors aren't rewriting the universe at 11pm.",
          "Content strategy review + a release that wants to be a novel.",
        ],
      },
      {
        ask: "How do you approach a tough draft?",
        answers: [
          "Ugly first page, honest second, client-ready third. Skip the pride draft.",
          "Find the one sentence the journalist would steal. Build around that.",
          "If it needs twelve adjectives, the news isn't ready.",
        ],
      },
      {
        ask: "Deadline philosophy?",
        answers: [
          "Deadlines are real. Panic is optional. Coffee is mandatory.",
          "I'd rather a sharp v1 than a poetic v0 that never lands.",
          "Timebox the polish. Perfectionism is just fear in a nice font.",
        ],
      },
      {
        ask: "Need a sanity check?",
        answers: [
          "Always. Read the lede out loud. If you cringe, we rewrite.",
          "Yes — tell me where you got bored. That's the edit.",
          "Please. Be the friendly villain of this paragraph.",
        ],
      },
      {
        ask: "Any floor gossip (safe)?",
        answers: [
          "Printer drama and snack politics. Peak open office.",
          "Someone's calendar is modern art. Not naming names.",
          "The huddle booth is the new power lunch.",
        ],
      },
    ],
  },

  ovina: {
    greetings: [
      "Hi — if this is about a journalist, I already have a tab open.",
      "Hey. On-record brain is on. Off-record jokes still allowed.",
      "Good to see you. Pitch quality control never sleeps.",
    ],
    ambient: [
      "Journalist angle looks solid — one more proof.",
      "On-record vs off-record: let's be precise.",
      "I'll protect the story and the relationship.",
    ],
    topics: [
      {
        ask: "Media desk status?",
        answers: [
          "Three warm leads, one 'noted', zero disasters. Healthy.",
          "List hygiene day. Duplicates fear me.",
          "We're pitching value, not volume. That's the Director bar.",
        ],
      },
      {
        ask: "What makes a pitch land?",
        answers: [
          "Timeliness, a clean hook, and respect for the reporter's inbox.",
          "One idea, one ask, one reason it matters today.",
          "If we wouldn't open it, they won't either.",
        ],
      },
      {
        ask: "Embargo anxiety level?",
        answers: [
          "Managed. Alarms set. Team briefed. Still watching the clock.",
          "Low if everyone remembers what 'embargo' means.",
          "I sleep better when legal and media agree out loud.",
        ],
      },
      {
        ask: "How can I help?",
        answers: [
          "Sharpen the news angle — not the adjectives.",
          "Flag any client quote that feels soft or fuzzy.",
          "If you hear a rumor on the floor, run it by me before Slack.",
        ],
      },
      {
        ask: "Favorite media win lately?",
        answers: [
          "When the headline matched our truth. Rare and beautiful.",
          "A reporter said 'this is actually useful.' Framed that in my heart.",
          "Coverage that didn't need a correction. Champagne energy.",
        ],
      },
    ],
  },

  ada: {
    greetings: [
      "Hi! I was just color-coding something that didn't ask for it.",
      "Hey — if there's a typo nearby, I'll find it. Occupational hazard.",
      "Good timing. Delivery excellence needs a human break.",
    ],
    ambient: [
      "Tiny typo, big save. Always check names.",
      "I color-coded the tracker. You're welcome.",
      "QA is love language.",
    ],
    topics: [
      {
        ask: "Director of detail — what's hot?",
        answers: [
          "Pack consistency, name spelling, and version control that isn't folklore.",
          "Making sure 'final' means final before it leaves the floor.",
          "Process hygiene so creative people can stay creative.",
        ],
      },
      {
        ask: "Common quality traps?",
        answers: [
          "Names, titles, dates, and the chart that lies with confidence.",
          "Bilingual mismatch. English says A, Chinese says A-adjacent.",
          "Deck fonts that 'almost' match. Almost is not a brand.",
        ],
      },
      {
        ask: "How do you keep kind under pressure?",
        answers: [
          "Correct the work, not the person. Then offer a snack metaphorically.",
          "Standards without shame. That's the culture I want.",
          "I channel Angela: high bar, warm tone.",
        ],
      },
      {
        ask: "Need a second pair of eyes?",
        answers: [
          "Always accepting eyeballs. Fresh ones preferred.",
          "Yes — especially on the page everyone skims.",
          "Send it. I'll be thorough and gentle.",
        ],
      },
      {
        ask: "Tracker philosophy?",
        answers: [
          "If it's not in the tracker, it exists only as anxiety.",
          "One source of truth. Multiple opinions. Fine. Multiple trackers. Not fine.",
          "Color is not decoration — it's triage.",
        ],
      },
    ],
  },

  agnes: {
    greetings: [
      "Hey! Timeline looks doable if nobody invents a new ask.",
      "Hi — coffee diplomacy is in session.",
      "Perfect. I put the notes where humans can find them.",
    ],
    ambient: [
      "Program management is 40% calendar, 60% psychology.",
      "Stakeholder map updated. Fewer surprises.",
      "Coffee run counts as alignment.",
    ],
    topics: [
      {
        ask: "What's the program pulse?",
        answers: [
          "Three workstreams green, one amber, zero red — for now.",
          "I'm herding deadlines so creative work has a runway.",
          "Director job: make the invisible work visible.",
        ],
      },
      {
        ask: "How do you handle scope creep?",
        answers: [
          "Smile, document, re-plan. Then smile again.",
          "I ask what we de-prioritize. Magic question.",
          "Everything is possible. Not everything is Tuesday.",
        ],
      },
      {
        ask: "Coffee conspiracy?",
        answers: [
          "It's not a conspiracy if it's operational excellence.",
          "I already had two. This is professional hydration adjacent.",
          "Only if we call it a walking stand-up.",
        ],
      },
      {
        ask: "Where do people get stuck?",
        answers: [
          "Waiting for decisions that need a 5-minute call, not a 5-day thread.",
          "Unclear owners. Joyce and I gang up on that.",
          "Meetings without outcomes. I bring outcomes like snacks.",
        ],
      },
      {
        ask: "Tips for surviving the day?",
        answers: [
          "Protect one focus block. Guard it like an embargo.",
          "Write decisions down. Future-you is a stakeholder.",
          "Water, stretch, then tackle the amber item first.",
        ],
      },
    ],
  },

  alanis: {
    greetings: [
      "Hey — that line is doing the most. In a good way… I hope.",
      "Hi. Punchier, shorter, still accurate — my religion.",
      "Oh good, a human comma. Welcome.",
    ],
    ambient: [
      "I'll take another pass after the stand-up.",
      "Wit is optional. Clarity is not.",
      "Killing 'synergy' one paragraph at a time.",
    ],
    topics: [
      {
        ask: "Writing Director — craft check?",
        answers: [
          "Message frameworks first, flourishes last.",
          "I'm hunting soft verbs and shy headlines.",
          "Bilingual polish is half the job some days — and I love it.",
        ],
      },
      {
        ask: "How do you make copy sing?",
        answers: [
          "Read it out loud. If you run out of breath, cut.",
          "One idea per sentence. One feeling per paragraph.",
          "Specific beats clever. Clever without specific is just noise.",
        ],
      },
      {
        ask: "Worst phrase of the week?",
        answers: [
          "'Please don't hesitate to…' I hesitated immediately.",
          "'Leverage' used as a verb for the 40th time.",
          "A sentence with three 'and's. It was a journey.",
        ],
      },
      {
        ask: "Need line edits?",
        answers: [
          "Yes. Be mean to the adverbs, kind to the writer.",
          "Send the lede. We'll arm-wrestle it into shape.",
          "Always. My red pen is metaphorical and enthusiastic.",
        ],
      },
      {
        ask: "Headphones on or off?",
        answers: [
          "On for draft, off for culture. Balance.",
          "On means 'in the zone.' Off means 'pitch me.'",
          "Depends if the open office is doing a musical.",
        ],
      },
    ],
  },

  rachel: {
    greetings: [
      "Hey! Media queue is ambitious today — in a fun way.",
      "Hi — I might cheer softly if a bite comes in.",
      "Good timing. Pitch energy is high.",
    ],
    ambient: [
      "Got a bite! Celebrating quietly at my desk.",
      "Follow-up #3 is where heroes are made.",
      "Manifesting open rates.",
    ],
    topics: [
      {
        ask: "Outreach status?",
        answers: [
          "Batch one out, batch two personalizing, batch three waiting on assets.",
          "I'm chasing two maybes into yeses.",
          "List is clean. Angles are sharper. Fingers crossed.",
        ],
      },
      {
        ask: "What are you pitching?",
        answers: [
          "A timely hook with a human quote — not a brochure.",
          "Something a reporter can file without inventing the news.",
          "Depends on the desk — trade vs. mainstream needs different spice.",
        ],
      },
      {
        ask: "How do you handle silence?",
        answers: [
          "Polite follow-up, new angle, never guilt.",
          "Silence isn't rejection — sometimes it's Tuesday.",
          "I refresh less and rewrite more.",
        ],
      },
      {
        ask: "Need anything from the floor?",
        answers: [
          "Faster asset turns and fewer 'quick adds' mid-pitch.",
          "A cleaner boilerplate. Please.",
          "If you hear a journalist name dropped, tell me first.",
        ],
      },
      {
        ask: "Win of the morning?",
        answers: [
          "A reply that wasn't auto-OOF. Luxury.",
          "Coverage alert ping. Dopamine managed professionally.",
          "Ovina liked the angle. That's a green light.",
        ],
      },
    ],
  },

  wing: {
    greetings: [
      "Hey — client wants options. We have options.",
      "Hi. Call went well — they laughed at the right joke.",
      "Good to see you. Expectation-setting is my cardio.",
    ],
    ambient: [
      "I'll bridge the feedback into something shippable.",
      "Steady wins the account.",
      "Notes taken. Drama not taken.",
    ],
    topics: [
      {
        ask: "Client temperature?",
        answers: [
          "Warm with a side of urgency. Manageable.",
          "They trust us — we repay that with clarity.",
          "One stakeholder is spicy; the brief is clear. Fine combo.",
        ],
      },
      {
        ask: "How do you run a tough call?",
        answers: [
          "Agenda, outcomes, next steps. Humor optional but recommended.",
          "Listen twice, restate once, promise only what we can ship.",
          "Bring a recommendation, not a menu of anxiety.",
        ],
      },
      {
        ask: "What do you need from content?",
        answers: [
          "Options labeled A/B with a clear 'we recommend.'",
          "Fewer surprises in the deck; more confidence in the room.",
          "Quotes that sound like a human, not a brochure.",
        ],
      },
      {
        ask: "Account wisdom?",
        answers: [
          "Document decisions. Memory is not a CMS.",
          "Escalate early to Angela when politics appear.",
          "Protect the team from whiplash; absorb what you can.",
        ],
      },
      {
        ask: "Lunch diplomacy?",
        answers: [
          "IFC if the deck behaves. Desk if it doesn't.",
          "Client lunch is work. Team lunch is culture. Both matter.",
          "I accept calendar invites that include food.",
        ],
      },
    ],
  },

  caleb: {
    greetings: [
      "Hey. Draft's breathing. Don't scare it.",
      "Hi — headphones were on, human mode now.",
      "Oh hey. Is 'synergy' banned yet?",
    ],
    ambient: [
      "Headphones in, words out.",
      "Research rabbit hole, but a useful one.",
      "First draft ugly on purpose.",
    ],
    topics: [
      {
        ask: "What are you drafting?",
        answers: [
          "Release body + a Q&A that wants to be a podcast.",
          "Blog that must be short. It's currently long. Classic.",
          "Supporting lines for a deck so bullets don't suffer alone.",
        ],
      },
      {
        ask: "Writing process?",
        answers: [
          "Outline, dump, cut, walk, cut again.",
          "I start with the quote I'd want to see in print.",
          "Chill exterior, deadline interior.",
        ],
      },
      {
        ask: "Need a second brain?",
        answers: [
          "Yes — tell me where it drags.",
          "Read the middle. Middles die first.",
          "If you have a sharper hook, I will steal it gratefully.",
        ],
      },
      {
        ask: "Research find?",
        answers: [
          "A stat that actually supports the story. Rare gem.",
          "Competitor language we should not copy. Noted.",
          "Background that makes the expert quote make sense.",
        ],
      },
      {
        ask: "Open office survival?",
        answers: [
          "Headphones, kind eyes, short answers during flow.",
          "I wander to the water cooler when stuck. Hydration + plot.",
          "Banter is fuel until it's not — then booth time.",
        ],
      },
    ],
  },

  connie: {
    greetings: [
      "Good morning energy! Also: deadlines!",
      "Heyyy — photo selection duty if you want company.",
      "Hi! This story has spark. Let's keep it.",
    ],
    ambient: [
      "I can take the creative assets chase.",
      "Sunny doesn't mean soft on deadlines.",
      "Visual hook ideas loading…",
    ],
    topics: [
      {
        ask: "What's sparking today?",
        answers: [
          "A visual angle that makes the story scroll-stopping.",
          "Social-friendly cutdowns of a longer release.",
          "Helping Rachel's pitch look as good as it reads.",
        ],
      },
      {
        ask: "Creative asset status?",
        answers: [
          "Chasing. Always chasing. Politely.",
          "We have options — need client taste confirmation.",
          "Light is bad in half the photos. We adapt.",
        ],
      },
      {
        ask: "How do you keep the vibe up?",
        answers: [
          "Snacks, playlists, and refusing doom spirals.",
          "Celebrate micro-wins. Coverage, clean drafts, good jokes.",
          "If the floor gets heavy, I open a window metaphorically.",
        ],
      },
      {
        ask: "Need eyes on something visual?",
        answers: [
          "Yes — pick the frame that feels true, not stock.",
          "Help me kill the cheesy handshake photo.",
          "Which thumbnail would you click? Be honest.",
        ],
      },
      {
        ask: "Media + creative combo tip?",
        answers: [
          "Pitch the story, attach the proof it looks real.",
          "Don't send a great story with a blurry hero image.",
          "Reporters are human. Humans like good pictures.",
        ],
      },
    ],
  },

  simon: {
    greetings: [
      "Hey. Numbers check out. Narrative still needs a heart.",
      "Hi — I'll reconcile the two trackers. Again.",
      "Oh. A conversation not in Excel. Bold.",
    ],
    ambient: [
      "Spreadsheet says yes. Politics may say later.",
      "Dry humor is free. Errors are not.",
      "Data without story is just a table.",
    ],
    topics: [
      {
        ask: "Analyst brain — what's true?",
        answers: [
          "The chart was optimistic. I made it honest.",
          "Two trackers disagreed. I picked the one with timestamps.",
          "Financial narrative support: make numbers speak human.",
        ],
      },
      {
        ask: "How do you partner with writers?",
        answers: [
          "I give them clean facts; they give me clean sentences.",
          "Flag the claim that needs a source before legal does.",
          "If a percentage looks magical, it probably is.",
        ],
      },
      {
        ask: "Favorite dry observation?",
        answers: [
          "We're 'aligning' again. Alignment is a lifestyle.",
          "The meeting could've been a cell comment.",
          "Version 12 is just version 3 with confidence.",
        ],
      },
      {
        ask: "Need a data check?",
        answers: [
          "Send the slide. I'll be the friendly auditor.",
          "Yes. Bring the source, not the vibes.",
          "Always. My love language is footnotes.",
        ],
      },
      {
        ask: "Bloomberg calling?",
        answers: [
          "Markets are theatrical today. Our story isn't.",
          "I glance. I do not spiral. Mostly.",
          "Terminal orange is a lifestyle brand at this point.",
        ],
      },
    ],
  },

  alice: {
    greetings: [
      "Hi! Proofed once, proofed twice, sleep later.",
      "Hey — micro tea break? Or micro edit break?",
      "Good to see you. Happy to tidy the appendix.",
    ],
    ambient: [
      "Warm edits, firm standards.",
      "Names matter. Titles matter. Commas matter a little.",
      "Tea is a process tool.",
    ],
    topics: [
      {
        ask: "Editing queue?",
        answers: [
          "Two packs, one bilingual pass, one appendix that fears me.",
          "I'm smoothing tone so it sounds like one team.",
          "Catching inconsistencies before clients do.",
        ],
      },
      {
        ask: "What do you fix most?",
        answers: [
          "Parallel structure and accidental personality clashes in tone.",
          "Date formats. The silent killer.",
          "Overlong sentences that forget their own point.",
        ],
      },
      {
        ask: "How do you stay warm under red pen?",
        answers: [
          "Compliment the bones, then improve the skin.",
          "I edit like a teammate, not a judge.",
          "Snacks help. So does saying 'nice hook' first.",
        ],
      },
      {
        ask: "Want a copy to polish?",
        answers: [
          "Yes please. Fresh eyes love company.",
          "Send the page everyone assumes is fine.",
          "I'll be thorough and kind. Dual threat.",
        ],
      },
      {
        ask: "Open office tip?",
        answers: [
          "Noise-cancel when deep editing; eyes-up when culture needs you.",
          "Water cooler chats count as research on morale.",
          "If someone looks stuck, offer a 2-minute read.",
        ],
      },
    ],
  },

  esther: {
    greetings: [
      "Hi — careful wording saves weekend fires.",
      "Hey. Footnote 3 is my villain origin story.",
      "Good timing. Bilingual lines need a friend.",
    ],
    ambient: [
      "I'll align EN/ZH after this block.",
      "Long-form needs patience and snacks.",
      "Precision is kindness to the reader.",
    ],
    topics: [
      {
        ask: "What are you writing?",
        answers: [
          "Long-form that must stay accurate under pressure.",
          "Bilingual alignment so neither language feels like a translation afterthought.",
          "A Q&A where every answer could be quoted. No fluff.",
        ],
      },
      {
        ask: "Hardest part today?",
        answers: [
          "A sentence that is true, clear, and not scary for legal.",
          "Keeping voice consistent across contributors.",
          "Cutting my favorite line because it wasn't needed. Growth.",
        ],
      },
      {
        ask: "Process?",
        answers: [
          "Outline claims → proof → prose → kill darlings.",
          "I write slow so the team can move fast later.",
          "Careful first; clever second.",
        ],
      },
      {
        ask: "Need help?",
        answers: [
          "A read for 'does this feel human?'",
          "Someone to challenge the soft claim.",
          "If you have source material, I'm collecting puzzle pieces.",
        ],
      },
      {
        ask: "Footnote therapy?",
        answers: [
          "Footnotes are where honesty lives rent-free.",
          "I respect a good source note more than a flashy adjective.",
          "If it's important, it shouldn't hide in footnote 14… but sometimes it does.",
        ],
      },
    ],
  },

  isaac: {
    greetings: [
      "Hey! Positive energy, realistic timeline.",
      "Hi — I can jump on the Q&A live if needed.",
      "Good to see you. Momentum is a team sport.",
    ],
    ambient: [
      "Client loved the direction. Momentum!",
      "Notes will be crisp. I promise… mostly.",
      "Follow-through is my superpower.",
    ],
    topics: [
      {
        ask: "What's your day look like?",
        answers: [
          "Client support, notes, chasing actions before they become ghosts.",
          "Helping Wing keep the account smooth.",
          "Prep for a call so nobody is surprised on mute.",
        ],
      },
      {
        ask: "How do you keep upbeat?",
        answers: [
          "Small wins, clear next steps, and not catastrophizing Slack.",
          "Coffee + a joke that doesn't undermine the work.",
          "I assume good intent until the tracker says otherwise.",
        ],
      },
      {
        ask: "Need an extra pair of hands?",
        answers: [
          "Always for notes and action logs.",
          "If something needs chasing, I'm built for it.",
          "Live Q&A support — I can be the calm tab opener.",
        ],
      },
      {
        ask: "Client lesson so far?",
        answers: [
          "Confirm everything twice. Charm once.",
          "Speed matters; accuracy matters more.",
          "People remember how you made the process feel.",
        ],
      },
      {
        ask: "Booth or open floor?",
        answers: [
          "Booth for client calls. Floor for team energy.",
          "Huddle booth when four brains beat one hero.",
          "I like the floor — until the printer screams.",
        ],
      },
    ],
  },

  joyce: {
    greetings: [
      "Hey — ops radar: three things due, all solvable.",
      "Hi. I shuffled the board so it makes sense again.",
      "Good timing. Process problems are my cardio.",
    ],
    ambient: [
      "Ping me if the process is the problem.",
      "Owners clear. Deadlines honest. Drama down.",
      "Resourcing is a puzzle with feelings.",
    ],
    topics: [
      {
        ask: "Ops pulse?",
        answers: [
          "Capacity is tight but fair if we stop inventing mystery tasks.",
          "I'm matching people to work that fits their strengths.",
          "Board is clean. Slack is… less clean. Working on it.",
        ],
      },
      {
        ask: "What's broken (fixably)?",
        answers: [
          "Handoffs without owners. We fix with a sentence: 'X owns Y by Z.'",
          "Meetings that don't produce a decision.",
          "Version names. I'm campaigning for sanity.",
        ],
      },
      {
        ask: "How can I help the system?",
        answers: [
          "Update the tracker when reality changes. Radical concept.",
          "Say no earlier. I'll back you with math.",
          "Flag overload before it becomes a weekend story.",
        ],
      },
      {
        ask: "Chloe partnership?",
        answers: [
          "She's calendar magic; I'm flow magic. Combined: fewer fires.",
          "We run logistics so craft can breathe.",
          "If you need a room, she's already thought of it.",
        ],
      },
      {
        ask: "Favorite ops win?",
        answers: [
          "A day with no emergency and still high output.",
          "When a junior knew exactly who to ask. Culture working.",
          "Clear RACI on a messy project. Beautiful.",
        ],
      },
    ],
  },

  chloe: {
    greetings: [
      "Hi! Smiling through the calendar tetris.",
      "Hey — room booked. Miracles do happen.",
      "I brought the good sticky notes. You're welcome.",
    ],
    ambient: [
      "Logistics with a smile.",
      "Team care is an ops deliverable.",
      "If it's schedulable, I'll schedule it kindly.",
    ],
    topics: [
      {
        ask: "Calendar status?",
        answers: [
          "Tetris level: expert. Still winning.",
          "Protected a focus block for someone who needed it. Quiet win.",
          "Huddle booth reserved before Corp snagged it.",
        ],
      },
      {
        ask: "What do you handle day-to-day?",
        answers: [
          "Rooms, schedules, little logistics that prevent big chaos.",
          "Making sure the right humans collide at the right time.",
          "Sticky notes, snacks intel, and kindness ops.",
        ],
      },
      {
        ask: "Need a booking?",
        answers: [
          "Tell me who, when, why — I'll make space appear.",
          "Solo booth or huddle of four? I have preferences and availability.",
          "Yes. I speak fluent Outlook.",
        ],
      },
      {
        ask: "Morale check?",
        answers: [
          "Snack table restocked. Science.",
          "If people look tired, I shorten meetings. Soft power.",
          "A smile and a clear agenda fix more than you'd think.",
        ],
      },
      {
        ask: "Joyce + you?",
        answers: [
          "She's the radar; I'm the runway.",
          "We keep the floor moving without drama.",
          "Ops duo: unstoppable, lightly caffeinated.",
        ],
      },
    ],
  },

  cynthia: {
    greetings: [
      "Hi — happy to mentor the structure if helpful.",
      "Hey. Big picture first, then the commas.",
      "Good to see you. You've got this — ship when ready, not frantic.",
    ],
    ambient: [
      "Senior counsel mode: calm is contagious.",
      "Complex stakeholders, simple story.",
      "Mentoring is part of the job, not extra.",
    ],
    topics: [
      {
        ask: "Director counsel today?",
        answers: [
          "Helping a thorny narrative find its spine.",
          "Mentoring a draft so the writer keeps ownership.",
          "Stakeholder puzzle: who needs what story, when.",
        ],
      },
      {
        ask: "How do you mentor on the floor?",
        answers: [
          "Ask what they're trying to achieve, then remove fog.",
          "Edit less ego, more clarity. Teach the why.",
          "Pair on hard paragraphs instead of drive-by comments.",
        ],
      },
      {
        ask: "Big-picture advice?",
        answers: [
          "If the audience is fuzzy, the work will be too.",
          "Politics exist — still tell the truth carefully.",
          "Protect juniors from chaos; expose them to craft.",
        ],
      },
      {
        ask: "Need a senior read?",
        answers: [
          "Gladly. Send the goal, not just the file.",
          "I'll focus on structure first, sparkle second.",
          "Yes — especially if it's sensitive.",
        ],
      },
      {
        ask: "Row 3 energy?",
        answers: [
          "Curious, sharp, kind. Proud of this pod.",
          "We're the deep work zone with occasional spark.",
          "CPA neighbors keep us humble about quiet focus.",
        ],
      },
    ],
  },

  oren: {
    greetings: [
      "Hey — curious angle: what if we lead with the why?",
      "Hi. I'll sketch three openers; pick a fighter.",
      "Oh good. Research rabbit hole needs a witness.",
    ],
    ambient: [
      "First-pass content, maximum curiosity.",
      "Options > one stubborn draft.",
      "Learning the craft one rewrite at a time.",
    ],
    topics: [
      {
        ask: "What are you exploring?",
        answers: [
          "Three openers for a story — different doors, same house.",
          "Background research so the expert quote lands.",
          "A first draft that isn't afraid to be wrong yet.",
        ],
      },
      {
        ask: "How do you pick an angle?",
        answers: [
          "What would a smart stranger care about today?",
          "What can we prove? What must we feel?",
          "I ask Cynthia when I'm too in love with option C.",
        ],
      },
      {
        ask: "Need feedback?",
        answers: [
          "Please — which opener punches?",
          "Tell me if I'm being clever instead of clear.",
          "Yes. Be honest. My ego is in training.",
        ],
      },
      {
        ask: "Associate life tips?",
        answers: [
          "Ask early. Rewrite often. Drink water.",
          "Sit near people whose drafts you admire.",
          "Use the booth when you need courage for a call.",
        ],
      },
      {
        ask: "Favorite tool?",
        answers: [
          "Blank page + timer + no Slack for 25 minutes.",
          "A messy outline that becomes a clean story.",
          "Colleagues who will kill my darlings kindly.",
        ],
      },
    ],
  },

  christy: {
    greetings: [
      "Hey — spark check: does this make a reporter care?",
      "Hi! Visual hook ideas loading…",
      "Good timing. I'm chasing creative assets with optimism.",
    ],
    ambient: [
      "Media angles with spark, not sparkle-for-free.",
      "If it doesn't pop, it doesn't ship to pitch.",
      "Creative chase-downs are a sport.",
    ],
    topics: [
      {
        ask: "What's the angle?",
        answers: [
          "Looking for the human hinge in a corporate story.",
          "A hook that feels timely without feeling try-hard.",
          "Something Connie can visualize and Rachel can pitch.",
        ],
      },
      {
        ask: "Creative chase status?",
        answers: [
          "In progress. Diplomacy + reminders + charm.",
          "We have raw materials; need the hero frame.",
          "I'm allergic to handshake stock. Fighting the good fight.",
        ],
      },
      {
        ask: "How do you test spark?",
        answers: [
          "Would I forward this to a friend? If no, rewrite.",
          "Say the hook in one breath. If I can't, cut.",
          "Ask Oren for a rival opener. Competition helps.",
        ],
      },
      {
        ask: "Need a brainstorm?",
        answers: [
          "Yes — throw bad ideas too. Bad ideas unlock good ones.",
          "What would make you stop scrolling?",
          "Help me kill the boring version.",
        ],
      },
      {
        ask: "Floor inspiration?",
        answers: [
          "Banter in the aisle is free creative fuel.",
          "Bloomberg headlines: what not to sound like, sometimes.",
          "Watching directors edit teaches taste faster than any course.",
        ],
      },
    ],
  },

  carrie: {
    greetings: [
      "Hi — poise on the call, chaos tamed in the notes.",
      "Hey. Stakeholder map updated. Fewer surprises.",
      "Good to see you. We can be warm and firm on embargoes.",
    ],
    ambient: [
      "Client leadership is half listening, half sequencing.",
      "Embargo discipline is love.",
      "Poise is a practice, not a mood.",
    ],
    topics: [
      {
        ask: "Account priorities?",
        answers: [
          "Keep stakeholders aligned and the embargo sacred.",
          "Make sure every workstream knows the 'why now.'",
          "Protect the team from thrash; escalate what needs Angela.",
        ],
      },
      {
        ask: "How do you stay poised?",
        answers: [
          "Prepare, breathe, decide. Then document.",
          "I separate the person from the pressure.",
          "Notes after every call. Future-me is a VIP client.",
        ],
      },
      {
        ask: "Stakeholder tip?",
        answers: [
          "Map influence vs. interest. Don't treat all pings equal.",
          "Pre-wire the skeptical one before the big meeting.",
          "Clarity beats volume in every update.",
        ],
      },
      {
        ask: "Need client cover?",
        answers: [
          "If you need a buffer on a tough ask, loop me in.",
          "I'll help reframe without losing the relationship.",
          "Yes — bring the facts and the feeling.",
        ],
      },
      {
        ask: "Booth strategy?",
        answers: [
          "Solo booth for delicate calls. Huddle for war-room moments.",
          "Never take embargo logistics in the open aisle.",
          "Four-person booth: instant alignment chamber.",
        ],
      },
    ],
  },
};

/** Shared topics mixed into conversations for variety */
const SHARED_TOPICS = [
  {
    ask: "Coffee or water run later?",
    answers: [
      "Coffee. My personality is subscription-based.",
      "Water first — then we negotiate coffee.",
      "Only if we call it a walking stand-up.",
      "I'm in. Strategy tastes better mobile.",
    ],
  },
  {
    ask: "Seen the printer today?",
    answers: [
      "It jammed during my hero moment. Classic arc.",
      "Warm pages, cold coffee — balance.",
      "Someone printed 'test' forty times. Art.",
      "I fear it. I respect it. I use it anyway.",
    ],
  },
  {
    ask: "Bloomberg drama?",
    answers: [
      "Markets are theatrical. Our embargo is not.",
      "Orange terminal glow is oddly calming.",
      "I check headlines for research. Mostly.",
      "If Bloomberg sneezes, half the floor looks up.",
    ],
  },
  {
    ask: "Phone booth free?",
    answers: [
      "Solo booth is gold for client calls.",
      "Huddle of four is the new meeting room.",
      "If you need privacy, take it — open office has ears.",
      "I emerged from the booth with a plan. Sort of.",
    ],
  },
  {
    ask: "How's the energy on the floor?",
    answers: [
      "Loud ideas, kind people. Perfect.",
      "Deadline o'clock vibes approaching.",
      "Snacks appeared. Morale science works.",
      "Busy but not brittle — good sign.",
    ],
  },
  {
    ask: "Any safe floor gossip?",
    answers: [
      "Corp is loud; we're focused. Solidarity.",
      "Calendar tetris championship ongoing.",
      "The good sticky notes are a geopolitical issue.",
      "Someone's 'quick sync' became a saga. As tradition demands.",
    ],
  },
  {
    ask: "What's for lunch?",
    answers: [
      "IFC if the deck behaves.",
      "Desk salad of champions.",
      "Whatever the team decides in the aisle in 12 seconds.",
      "I accept all food-related meetings.",
    ],
  },
  {
    ask: "Need a quick brainstorm?",
    answers: [
      "Yes — throw messy ideas. We'll sort later.",
      "Hook, proof, ask. Let's stress-test it.",
      "Only if we timebox. I love you and my deadline.",
      "Stand-up in the aisle? Instant war room.",
    ],
  },
];

function linesForPerson(person) {
  if (!person) return LINES.generic;
  if (person.generic) return LINES.generic;
  const pd = PERSON_DIALOGUE[person.id];
  const personal = (pd && pd.ambient) || [];
  return personal.concat(LINES.ambient.slice(0, 10));
}

function greetingsFor(person) {
  if (!person || person.generic) return ["Hey there.", "Hi — busy day?"];
  const pd = PERSON_DIALOGUE[person.id];
  return (pd && pd.greetings) || ["Hey!", "Hi — good to see you."];
}

function topicsFor(person) {
  if (!person || person.generic) {
    return [
      {
        ask: "How's it going over here?",
        answers: LINES.generic,
      },
      {
        ask: "Busy day?",
        answers: ["Always.", "Manageable.", "Define busy."],
      },
    ].concat(SHARED_TOPICS.slice(0, 3));
  }
  const pd = PERSON_DIALOGUE[person.id];
  const personal = (pd && pd.topics) || [];
  return personal.concat(SHARED_TOPICS);
}
