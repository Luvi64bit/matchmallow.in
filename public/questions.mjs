// Provisional 10-question bank; review copy and complementary pairs before launch.
export const QUESTIONS = Object.freeze([
 {id:'weekend',prompt:'Your ideal weekend?',weight:1,options:[['cozy','Cozy at home'],['out','Out exploring'],['mix','A little of both']],complementaryPairs:[['cozy','out']]},
 {id:'texts',prompt:'Your texting style?',weight:2,options:[['quick','Reply right away'],['thoughtful','Reply when I can focus'],['voice','Voice notes forever']],complementaryPairs:[['quick','thoughtful']]},
 {id:'plans',prompt:'How do you make plans?',weight:2,options:[['planner','Calendar and itinerary'],['spontaneous','Go with the flow'],['together','Decide together']],complementaryPairs:[['planner','spontaneous']]},
 {id:'affection',prompt:'How do you show you care?',weight:3,options:[['words','Sweet words'],['actions','Helpful little actions'],['time','Quality time']],complementaryPairs:[['words','actions']]},
 {id:'conflict',prompt:'When something feels off?',weight:3,options:[['talk','Talk it through now'],['space','Take space first'],['gentle','Check in gently']],complementaryPairs:[['talk','space']]},
 {id:'surprise',prompt:'Best kind of surprise?',weight:1,options:[['gift','A thoughtful gift'],['adventure','A surprise outing'],['note','A handwritten note']],complementaryPairs:[['gift','note']]},
 {id:'social',prompt:'At a party you are…',weight:1,options:[['host','Meeting everyone'],['corner','With my favorite people'],['dance','On the dance floor']],complementaryPairs:[['host','corner']]},
 {id:'food',prompt:'Dinner decision?',weight:1,options:[['favorite','The usual favorite'],['new','Try something new'],['cook','Cook together']],complementaryPairs:[['favorite','new']]},
 {id:'support',prompt:'On a tough day, you want…',weight:3,options:[['listen','Someone to listen'],['solve','Help solving it'],['comfort','Comfort and company']],complementaryPairs:[['listen','solve']]},
 {id:'future',prompt:'Your favorite shared goal?',weight:2,options:[['travel','Explore new places'],['home','Build cozy routines'],['create','Make something together']],complementaryPairs:[['travel','home']]}
]);
export const SCORING_QUESTIONS = QUESTIONS.map(q=>({...q,options:q.options.map(([id])=>id)}));
