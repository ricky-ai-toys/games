/* Player conversations — per-person topics, rotating choices */

const Dialogue = (() => {
  function open(state, npc) {
    if (state.dialogue) return;
    const person = npc.data;

    const greeting = Utils.pick(greetingsFor(person));
    const roleBit = person.title
      ? person.title + (person.personality ? ' · ' + shortPersonality(person) : '')
      : '';

    // Opening line: greeting + duty/personality flavor
    let openText = greeting;
    if (person.duties && !person.generic) {
      openText += '\n\n' + Utils.pick([
        "On my plate: " + trimDuty(person.duties),
        person.personality,
      ]);
    } else if (person.personality) {
      openText += ' ' + person.personality;
    }

    state.dialogue = {
      npcId: npc.id,
      personId: person.id,
      name: person.name,
      title: person.title || '',
      subtitle: roleBit,
      color: person.color,
      step: 'topics',
      text: openText,
      usedAsks: [],
      depth: 0,
    };

    state.dialogue.choices = buildChoices(state, person);

    npc.busy = true;
    npc.vx = 0;
    npc.vy = 0;
    OfficeAudio.talk();

    if (!person.generic) {
      if (!state.stats.talkedTo.includes(person.id)) {
        state.stats.talkedTo.push(person.id);
      }
      Tasks.progress(state, 'chat5', 1);
      state.stats.chats = (state.stats.chats || 0) + 1;
    }

    UI.showDialogue(state.dialogue);
  }

  function shortPersonality(person) {
    if (!person.personality) return '';
    const p = person.personality;
    return p.length > 42 ? p.slice(0, 40) + '…' : p;
  }

  function trimDuty(d) {
    return d.length > 90 ? d.slice(0, 88) + '…' : d;
  }

  function buildChoices(state, person) {
    const d = state.dialogue;
    const pool = topicsFor(person).filter((t) => !d.usedAsks.includes(t.ask));
    const shuffled = Utils.shuffle(pool);
    // 3–4 topic options so every chat feels different
    const pickN = Math.min(person.generic ? 2 : 4, shuffled.length);
    const picks = shuffled.slice(0, pickN);

    const choices = picks.map((t, i) => ({
      id: 'topic_' + i,
      text: t.ask,
      topic: t,
    }));

    // Always allow asking role/duties once per conversation if not used
    if (!person.generic && !d.usedAsks.includes('__role__')) {
      choices.unshift({
        id: 'role',
        text: 'What do you actually do here?',
        topic: {
          ask: 'What do you actually do here?',
          answers: [
            (person.title ? person.title + '. ' : '') + (person.duties || 'FinComms work.'),
            (person.personality || '') + ' Day-to-day: ' + (person.duties || 'whatever the floor needs.'),
            "Title: " + (person.title || 'teammate') + ". Duties: " + (person.duties || 'support the team.'),
          ],
        },
        isRole: true,
      });
      // Cap visible choices
      while (choices.length > 5) choices.pop();
    }

    choices.push({
      id: 'bye',
      text: Utils.pick([
        'Catch you later!',
        'Back to it — thanks!',
        'Good chat. Ship well!',
        'Talk soon!',
      ]),
      topic: null,
    });

    return choices;
  }

  function choose(state, choiceId) {
    const d = state.dialogue;
    if (!d) return;
    const choice = d.choices.find((c) => c.id === choiceId);
    if (!choice) {
      close(state);
      return;
    }
    if (!choice.topic) {
      close(state);
      return;
    }

    const person = rosterById(d.personId) || allPeople().find((p) => p.id === d.personId);
    const answer = Utils.pick(choice.topic.answers || LINES.generic);
    d.text = answer;
    d.depth += 1;

    if (choice.isRole) {
      d.usedAsks.push('__role__');
    } else {
      d.usedAsks.push(choice.topic.ask);
    }

    // Follow-up: more topics or wind down after depth
    if (d.depth >= 3 || (person && person.generic)) {
      d.choices = [
        {
          id: 'more',
          text: 'One more thing…',
          topic: { ask: '_more_', answers: [Utils.pick(linesForPerson(person))] },
          forceMore: true,
        },
        {
          id: 'bye',
          text: Utils.pick(['Thanks — that helped!', 'Appreciate it!', 'Later!']),
          topic: null,
        },
      ];
      // If they pick more, handle specially below — actually forceMore still has topic
    } else {
      d.choices = buildChoices(state, person || { generic: true });
      // Prepend continue energy
      d.choices = d.choices.filter((c) => c.id !== 'role' || !d.usedAsks.includes('__role__'));
    }

    // Special: if choice was forceMore from previous — already answered
    if (choice.forceMore) {
      d.choices = [
        { id: 'bye', text: 'Perfect — thanks!', topic: null },
      ];
    }

    OfficeAudio.talk();
    UI.showDialogue(d);
  }

  function close(state) {
    if (!state.dialogue) return;
    const npc = state.npcs.find((n) => n.id === state.dialogue.npcId);
    if (npc) npc.busy = false;
    state.dialogue = null;
    UI.hideDialogue();
  }

  return { open, choose, close };
})();
