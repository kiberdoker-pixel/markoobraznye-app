(() => {
'use strict';
const OWNER='kiberdoker-pixel';
const REPO='markoobraznye-app';
const API='https://api.github.com/repos/'+OWNER+'/'+REPO+'/issues?state=open&per_page=50&sort=created&direction=desc';
const $=q=>document.querySelector(q);
const $$=q=>Array.from(document.querySelectorAll(q));
const onboard=$('#onboard'),screen=$('#screen'),remember=$('#remember');
const saved=(()=>{try{return JSON.parse(localStorage.getItem('mnsk_pwa_preferences'))||{}}catch{return {}}})();
const labels={home:['КЛУБНОЕ ПРИЛОЖЕНИЕ','Главная'],calendar:['ПЛАНЫ И ВСТРЕЧИ','Календарь мероприятий'],news:['ЖИЗНЬ КЛУБА','Новости'],admins:['ЛЮДИ И МАШИНЫ','Администраторы'],history:['АРХИВ КЛУБА','История клуба'],partners:['НАШИ ДРУЗЬЯ','Партнёры'],admin:['УПРАВЛЕНИЕ','Тестовый редактор']};
let current='home',cachedNews=[],loading=false,lastFetched=0;
function login(member) {
  if(remember.checked) {try{localStorage.setItem('mnsk_pwa_preferences',JSON.stringify({mode:member?'member':'admin'}))}catch{}}
  onboard.classList.add('hidden');screen.classList.remove('hidden');
  goto(member?'home':'admin'); loadNews();
}
$('#memberStart').addEventListener('click',()=>login(true));
$('#adminStart').addEventListener('click',()=>login(false));
$('#settings').addEventListener('click',()=>{
  localStorage.removeItem('mnsk_pwa_preferences');screen.classList.add('hidden');onboard.classList.remove('hidden');window.scrollTo(0,0);
});
$$('[data-to]').forEach(btn=>btn.addEventListener('click',()=>goto(btn.getAttribute('data-to'))));
function goto(id){
  if(!labels[id])id='home';
  current=id;
  $$('[data-page]').forEach(el=>el.classList.toggle('hidden',el.dataset.page!==id));
  $$('.bottom [data-to]').forEach(el=>el.classList.toggle('current',el.dataset.to===id));
  $('#pageKicker').textContent=labels[id][0];$('#pageTitle').textContent=labels[id][1];
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='news'||id==='home')loadNews();
}
function safeUrl(str){
 try{const u=new URL(str);return u.protocol==='https:'?u.href:null}catch{return null}
}
function pictureFromText(body){
  const match=body.match(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/i) || body.match(/(https:\/\/(?:github\.com\/user-attachments\/assets\/|user-images\.githubusercontent\.com\/)[^\s<)]+)/i);
  return match?safeUrl(match[1]):null;
}
function extractText(body){
  const block=body.match(/###\s*Текст новости\s*\n+([\s\S]*?)(?=\n###\s|$)/i);
  let x=block?block[1]:body;
  return x.replace(/!\[[^\]]*\]\(https?:\/\/[^)]+\)/g,'').replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/<!--[\s\S]*?-->/g,'').replace(/^###.+$/gm,'').trim().slice(0,5000);
}
function sampleNews(){
  return [{id:'demo',date:'2026-10-23',title:'Добро пожаловать в тестовую версию',text:'Это пример публикации. Когда владелец клуба создаст в GitHub первую новость, она автоматически появится здесь на всех телефонах. Для обновления не потребуется новая установка.',picture:null,isDemo:true,url:null}];
}
async function loadNews(force=false){
 if(loading)return;
 if(!force && Date.now()-lastFetched<45000){renderNews();return}
 loading=true;
 $('#news-status').textContent='Получаем свежие новости…';
 try{
   const resp=await fetch(API,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
   if(!resp.ok)throw new Error('GitHub API: '+resp.status);
   const arr=await resp.json();
   cachedNews=arr.filter(issue=>{
      if(issue.pull_request||!issue.title.toUpperCase().startsWith('[НОВОСТЬ]'))return false;
      return issue.user?.login?.toLowerCase()===OWNER || (issue.labels||[]).some(x=>x.name?.toLowerCase()==='published');
   }).map(issue=>({
      id:issue.id,title:issue.title.replace(/^\[НОВОСТЬ\]\s*/i,'').trim(),
      date:issue.created_at.slice(0,10),text:extractText(issue.body||''),
      picture:pictureFromText(issue.body||''),url:issue.html_url,isDemo:false
   }));
   lastFetched=Date.now();
   $('#news-status').textContent='Публикации обновлены · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
 }catch(e){
   $('#news-status').textContent='Не удалось проверить новости в GitHub. Проверьте интернет и публичность репозитория.';
   console.warn('News fetch:',e);
 }finally{loading=false;renderNews()}
}
function makeCard(item){
 const card=document.createElement('article');card.className='news-card';
 const meta=document.createElement('div');meta.className='date';
 meta.textContent=new Date(item.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})+(item.isDemo?' · ДЕМО':'');
 card.append(meta);
 const title=document.createElement('h3');title.textContent=item.title;card.append(title);
 if(item.picture){const img=document.createElement('img');img.src=item.picture;img.loading='lazy';img.alt='Фотография публикации';img.referrerPolicy='no-referrer';card.append(img)}
 const teaser=document.createElement('p');teaser.textContent=item.text.length>200?item.text.slice(0,200)+'…':item.text;card.append(teaser);
 if(!item.isDemo){
   const btn=document.createElement('button');btn.className='link';btn.textContent='Подробнее →';
   btn.addEventListener('click',()=>openStory(item));card.append(btn);
 }
 return card;
}
function renderNews(){
 const items=cachedNews.length?cachedNews:sampleNews();
 for(const [target,list] of [['#news-list',items],['#home-news',items.slice(0,2)]]){
  const area=$(target);area.replaceChildren();list.forEach(x=>area.append(makeCard(x)));
 }
}
function openStory(item){
 const content=$('#dialogContent');content.replaceChildren();
 const h=document.createElement('h2');h.textContent=item.title;content.append(h);
 if(item.picture){const img=document.createElement('img');img.src=item.picture;img.alt='Фото';content.append(img)}
 const p=document.createElement('p');p.textContent=item.text;content.append(p);
 const src=document.createElement('a');src.href=item.url;src.target='_blank';src.rel='noopener';src.className='minilink';src.textContent='Открыть публикацию в GitHub ↗';content.append(src);
 $('#storyDialog').showModal();
}
$('#refreshNews').addEventListener('click',()=>loadNews(true));
$('#closeDialog').addEventListener('click',()=>$('#storyDialog').close());
document.addEventListener('visibilitychange',()=>{if(!document.hidden && !screen.classList.contains('hidden'))loadNews()});
if(saved.mode==='member'||saved.mode==='admin'){
 onboard.classList.add('hidden');screen.classList.remove('hidden');goto(saved.mode==='member'?'home':'admin');
}
renderNews();
if('serviceWorker' in navigator && location.protocol==='https:'){
 navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('SW:',err));
}
})();