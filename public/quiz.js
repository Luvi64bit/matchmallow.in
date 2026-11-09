import { QUESTIONS } from './questions.mjs';
const $ = id => document.getElementById(id);
const answers = {};
let step = 0;
let nickname = '';
function show(id) { for (const panel of ['intro','quiz','complete']) $(panel).classList.toggle('hide',panel!==id); }
function progress(n) { $('progress').setAttribute('aria-valuenow',String(n)); $('progress-fill').style.width=(n*10)+'%'; }
function render() {
  const q=QUESTIONS[step]; $('step').textContent='Question '+(step+1)+' of '+QUESTIONS.length;
  $('question-title').textContent=q.prompt;
  $('options').replaceChildren();
  for (const [value,label] of q.options) {
    const el=document.createElement('label');el.className='choice';
    const radio=document.createElement('input');radio.type='radio';radio.name='answer';radio.value=value;radio.checked=answers[q.id]===value;radio.required=true;
    el.append(radio,document.createTextNode(label));$('options').append(el);
  }
  $('back').disabled=step===0;$('next').textContent=step===QUESTIONS.length-1?'Finish quiz':'Next question';
  $('quiz-error').textContent='';progress(step);show('quiz');$('question-title').focus?.();
}
$('begin').addEventListener('click',()=>{
  const value=$('nickname').value.trim();
  if(value.length<2 || value.length>32){$('intro-error').textContent='Enter a nickname between 2 and 32 characters.';return;}
  if(!$('adult').checked){$('intro-error').textContent='Please confirm you are 18 or older.';return;}
  nickname=value;$('intro-error').textContent='';render();
});
$('question-form').addEventListener('submit',event=>{
  event.preventDefault();
  const selected=$('question-form').querySelector('input[name="answer"]:checked');
  if(!selected){$('quiz-error').textContent='Choose an answer to continue.';return;}
  answers[QUESTIONS[step].id]=selected.value;
  if(step<QUESTIONS.length-1){step++;render();return;}
  progress(QUESTIONS.length);
  $('finish-message').textContent='Nice work, '+nickname+'! You answered all ten questions.';
  show('complete');
});
$('back').addEventListener('click',()=>{if(step>0){step--;render();}});
$('restart').addEventListener('click',()=>{step=0;nickname='';for(const key of Object.keys(answers))delete answers[key];$('nickname').value='';$('adult').checked=false;progress(0);show('intro');});
