'use strict';
(() => {
  const data=window.SURVEY_DATA, config=window.SURVEY_CONFIG;
  const $=s=>document.querySelector(s);
  const allQuestions=config.blocks.flatMap(b=>b.questions);
  const state={answers:{},step:0,result:null,start:null};
  const round=n=>Number(n).toFixed(1);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
  function scoreAnswers(a){
    for(const q of allQuestions){if(!Number.isInteger(a[q.id])||a[q.id]<1||a[q.id]>q.options.length)throw new Error('请完成所有问题后再查看结果。');}
    const group=(p,n)=>Array.from({length:n},(_,i)=>a[p+(i+1)]);
    const x=mean(group('X',6))*20,hself=mean(group('H',7))*20;
    const hscene=(mean([a.scene1,a.scene2])-1)*25,h=.75*hself+.25*hscene;
    const e=mean(group('E',4))*20,y=.65*h+.35*e;
    return{x,h,hself,hscene,e,y};
  }
  function trendAt(x){
    const t=data.trend;if(x<t[0][0]||x>t[t.length-1][0])return null;
    for(let i=1;i<t.length;i++)if(t[i][0]>=x){const a=t[i-1],b=t[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
    return t[t.length-1][1];
  }
  function demo(){const x=Number($('#ai').value);return{x,y:trendAt(x)};}
  function getZones(){
    const t=data.trend,peak=t.reduce((best,p,i)=>p[1]>t[best][1]?i:best,0);
    const crossing=(ratio,direction)=>{
      const cutoff=t[peak][1]*ratio;
      for(let i=peak;direction<0?i>0:i<t.length-1;i+=direction){const a=t[i],b=t[i+direction];if(b[1]<cutoff)return a[0]+(b[0]-a[0])*(cutoff-a[1])/(b[1]-a[1]);}
      return direction<0?t[0][0]:t[t.length-1][0];
    };
    return {edges:[0,crossing(.65,-1),crossing(.9,-1),crossing(.9,1),crossing(.65,1),100],peak:t[peak]};
  }
  function refreshSliders(){
    const a=demo();$('#aiValue').textContent=round(a.x);
    $('#demoScore').innerHTML=(a.y===null?'—':round(a.y))+'<span>/ 100</span>';
    $('#demoReadout').textContent=a.y===null?'这里没有样本覆盖，不作外推。':'来自既有问卷的汇总曲线。';
    $('#ai').setAttribute('aria-valuetext',round(a.x)+'分');
    draw();
  }
  function draw(){
    const svg=$('#chart'),width=Math.max(280,$('#chartArea').clientWidth),height=svg.clientHeight||390;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const m={l:46,r:21,t:61,b:51},w=width-m.l-m.r,h=height-m.t-m.b;
    const px=x=>m.l+x/100*w,py=y=>m.t+(100-y)/100*h;
    const path=data.trend.map((p,i)=>`${i?'L':'M'}${px(p[0]).toFixed(2)},${py(p[1]).toFixed(2)}`).join(' ');
    let html=`<title>AI参与程度与综合协作状态</title><desc>深蓝色线是${data.retained}份问卷的汇总趋势，菱形是分段均值，绿色点表示滑杆位置；五区背景为教学示意。测试后出现紫色问卷得分点。</desc>`;
    const zones=getZones(),colors=['#faeae7','#fff3dc','#e8f4e9','#fff3dc','#faeae7'],names=['不耐受区','耐受范围','最适区','耐受范围','不耐受区'];
    for(let i=0;i<5;i++){
      const l=px(zones.edges[i]),r=px(zones.edges[i+1]),cx=(l+r)/2;
      html+=`<rect x="${l}" y="${m.t-43}" width="${r-l}" height="${h+43}" fill="${colors[i]}" fill-opacity="0.38"/>`;
      if(r-l<52)html+=`<text x="${cx}" y="${m.t-33}" writing-mode="vertical-rl" font-size="9" fill="#63786e">${names[i]}<title>${names[i]}（教学示意）</title></text>`;
      else html+=`<text x="${cx}" y="${m.t-25}" text-anchor="middle" font-size="10" fill="#63786e">${names[i]}</text><text x="${cx}" y="${m.t-11}" text-anchor="middle" font-size="8" fill="#8a988f">示意</text>`;
      if(i>0)html+=`<line x1="${l}" y1="${m.t-43}" x2="${l}" y2="${py(0)}" stroke="#c3d0c5" stroke-dasharray="3 4"/>`;
    }
    for(let v=0;v<=100;v+=20){html+=`<line x1="${m.l}" y1="${py(v)}" x2="${width-m.r}" y2="${py(v)}" stroke="#e5edeb"/><text x="${m.l-10}" y="${py(v)+4}" font-size="11" text-anchor="end" fill="#70858a">${v}</text><text x="${px(v)}" y="${height-m.b+20}" font-size="11" text-anchor="middle" fill="#70858a">${v}</text>`;}
    html+=`<text x="${m.l}" y="15" font-size="11" fill="#657b80">综合协作状态 Y</text><line x1="${m.l}" y1="${py(0)}" x2="${width-m.r}" y2="${py(0)}" stroke="#a7bcb5"/><text x="${m.l+w/2}" y="${height-8}" font-size="11" text-anchor="middle" fill="#657b80">AI参与程度 X（指数，非百分比）</text>`;
    const current=demo();
    html+=`<path d="${path}" fill="none" stroke="#2563a6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    for(const b of data.bins){const x=px(b.x),y=py(b.y);html+=`<path d="M${x} ${y-6}l6 6-6 6-6-6Z" fill="#355f72" stroke="white" stroke-width="1.3" data-tip="${b.lo}至${b.hi}组 · ${b.n}份 · 平均Y ${round(b.y)}"/><text x="${x}" y="${y-12}" text-anchor="middle" font-size="10" fill="#486875">n=${b.n}</text>`;}
    const point=(a,color,label,r)=>{const x=px(a.x),y=py(a.y);return `<line x1="${x}" y1="${y}" x2="${x}" y2="${py(0)}" stroke="${color}" stroke-dasharray="4 5" opacity=".5"/><circle cx="${x}" cy="${y}" r="${r+4}" fill="${color}" opacity=".1"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5" data-tip="${label} · X ${round(a.x)} · Y ${round(a.y)}"><title>${label}，X=${round(a.x)}，Y=${round(a.y)}</title></circle>`;};
    if(current.y!==null)html+=point(current,'#187d72','总体趋势位置',6.5);
    if(state.result)html+=point(state.result,'#8054b5','我的问卷结果',7.5);
    svg.innerHTML=html;
    svg.querySelectorAll('[data-tip]').forEach(el=>{
      el.addEventListener('pointerenter',e=>showTip(e,el.dataset.tip));el.addEventListener('pointermove',e=>showTip(e,el.dataset.tip));
      el.addEventListener('pointerleave',()=>$('#tooltip').hidden=true);
      el.addEventListener('click',e=>showTip(e,el.dataset.tip));
    });
  }
  function showTip(e,text){const tip=$('#tooltip'),rect=$('#chartArea').getBoundingClientRect();tip.textContent=text;tip.hidden=false;tip.style.left=Math.max(0,Math.min(rect.width-tip.offsetWidth,e.clientX-rect.left+12))+'px';tip.style.top=Math.max(0,e.clientY-rect.top-40)+'px';}
  function updateProgress(){const n=Object.keys(state.answers).length;$('#quizProgress').value=n;$('#answeredCount').textContent=`已答 ${n} / ${allQuestions.length}`;}
  function renderStep(){
    $('#quizBody').hidden=false;$('#resultBody').hidden=true;$('#quizFooter').hidden=false;
    const b=config.blocks[state.step];$('#stepLabel').textContent=`第 ${state.step+1} / ${config.blocks.length} 步`;
    $('#quizTitle').textContent=config.title;$('#prevStep').disabled=state.step===0;
    $('#nextStep').textContent=state.step===4?'计算我的结果 →':'下一步 →';$('#validation').hidden=true;
    let html=`<div class="step-heading"><h3>${escape(b.title)}</h3><p>${escape(b.hint)}</p></div>`;
    b.questions.forEach(q=>{
      html+=`<fieldset class="question ${state.step===0?'background':state.step===4?'scenario':''}" id="question-${q.id}"><legend><span>${escape(q.number)}</span>${escape(q.title)}</legend><div class="answers">`;
      q.options.forEach((o,i)=>html+=`<label class="answer"><input type="radio" name="${q.id}" value="${i+1}" ${state.answers[q.id]===i+1?'checked':''}><span>${escape(o)}</span></label>`);
      html+='</div></fieldset>';
    });
    $('#stepContent').innerHTML=html;updateProgress();$('#quizDialog').scrollTop=0;
    $('#stepContent').querySelectorAll('input').forEach(el=>el.addEventListener('change',()=>{state.answers[el.name]=Number(el.value);$('#question-'+el.name).classList.remove('missing');$('#validation').hidden=true;updateProgress();}));
  }
  function openQuiz(){
    if(!state.start)state.start=Date.now();if(state.result)renderResult();else renderStep();
    if(!$('#quizDialog').open)$('#quizDialog').showModal();document.body.classList.add('modal-open');
  }
  function complete(){
    try{state.result={...scoreAnswers(state.answers),seconds:Math.round((Date.now()-state.start)/1000)};}catch(e){$('#validation').textContent=e.message;$('#validation').hidden=false;return;}
    $('#personalResult').hidden=false;$('#testLegend').hidden=false;renderInline();draw();renderResult();
  }
  function clearAndRetest(){
    if(!confirm('删除本次22项作答和测试结果，并重新开始吗？原86份调查样本不会改变。'))return;
    state.answers={};state.result=null;state.step=0;state.start=Date.now();
    $('#personalResult').hidden=true;$('#testLegend').hidden=true;$('#tooltip').hidden=true;
    draw();openQuiz();
    requestAnimationFrame(()=>{$('#quizDialog').scrollTop=0;});
  }
  function interpretation(r){
    const bin=data.bins.find(b=>r.x>b.lo&&r.x<=b.hi);
    if(!bin)return`你的AI关键介入指数为${round(r.x)}，综合协作状态为${round(r.y)}分。现有样本没有与你处于同一介入区间的答卷，因此不作同组均值比较；这不是能力排名。`;
    const diff=r.y-bin.y;
    const relative=Math.abs(diff)<.5?'接近该组均值':`比该组均值${diff>0?'高':'低'}${round(Math.abs(diff))}分`;
    return`你的AI关键介入指数为${round(r.x)}，处于${bin.lo}＜X≤${bin.hi}组。该组${bin.n}份问卷的综合协作状态均值为${round(bin.y)}分；你为${round(r.y)}分，${relative}。这只是本次作答与组均值的比较，不代表能力排名或因果关系。`;
  }
  function practicalActions(){
    const a=state.answers, suggestions=[];
    if(a.X1>=4||a.X2>=4||a.X3>=4)suggestions.push('下次使用AI前，先用一句话写出自己的问题和预期思路，再让AI补充材料。');
    if(a.H2<=3||a.H3<=3)suggestions.push('提交前抽查一条关键事实或引用，打开原始资料核对来源与原文。');
    if(a.H4<=3||a.H5<=3)suggestions.push('遇到新条件时，先自己写出受影响的步骤，并用自己的话解释修改理由。');
    if(a.E2<=3)suggestions.push('把AI省下的十分钟留给核验或理解，而不只是继续生成下一版。');
    const fallback=['让AI先处理重复整理，关键结论仍由自己核对后采用。','提交前用自己的话复述一遍结论及其证据。','条件变化时，先标出需要修改的位置，再决定是否让AI协助。'];
    for(const item of fallback){if(suggestions.length>=3)break;if(!suggestions.includes(item))suggestions.push(item);}
    return suggestions.slice(0,3);
  }
  function adviceHtml(){return practicalActions().map(s=>`<li>${escape(s)}</li>`).join('');}
  function scoreCards(r){return[['AI参与程度 X',r.x,false],['人的判断保留 H',r.h,false],['协作收益 E',r.e,false],['综合协作状态 Y',r.y,true]].map(([label,v,test])=>`<div class="score-item ${test?'test-score':''}"><span>${label}</span><strong>${round(v)}</strong></div>`).join('');}
  function renderInline(){const r=state.result;$('#inlineScores').innerHTML=scoreCards(r);$('#inlineSummary').textContent=interpretation(r);$('#inlineAdvice').innerHTML=adviceHtml();}
  function renderResult(){
    const r=state.result;if(!r)return;
    $('#quizBody').hidden=true;$('#quizFooter').hidden=true;$('#resultBody').hidden=false;$('#quizTitle').textContent='你的协作状态 · 测试结果';
    $('#resultBody').innerHTML=`<h3 class="result-title">你的问卷结果</h3><div class="score-grid">${scoreCards(r)}</div><div class="result-interpretation"><strong>和已有样本相比</strong><p>${escape(interpretation(r))}</p></div><div class="result-advice"><strong>下一次可以这样做</strong><ol>${adviceHtml()}</ol></div><p class="result-caution">仅供课堂讨论；你的得分不会加入原有样本。</p><div class="result-buttons"><button class="button primary" id="showOnChart">回到图表，查看我的位置 →</button><button class="button secondary" id="editAnswers">修改作答</button><button class="button secondary" id="newTest">删除本次测试并重测</button></div>`;
    $('#quizDialog').scrollTop=0;
    $('#showOnChart').onclick=()=>{$('#quizDialog').close();$('#explore').scrollIntoView({behavior:'smooth'});};
    $('#editAnswers').onclick=()=>{state.step=0;renderStep();};
    $('#newTest').onclick=clearAndRetest;
  }
  document.querySelectorAll('[data-start]').forEach(el=>el.addEventListener('click',openQuiz));
  $('#closeQuiz').onclick=()=>$('#quizDialog').close();
  $('#quizDialog').addEventListener('close',()=>document.body.classList.remove('modal-open'));
  $('#prevStep').onclick=()=>{if(state.step>0){state.step--;renderStep();}};
  $('#nextStep').onclick=()=>{
    const missing=config.blocks[state.step].questions.filter(q=>!state.answers[q.id]);
    if(missing.length){$('#validation').textContent=`还有${missing.length}项未作答，请完成后继续。`;$('#validation').hidden=false;missing.forEach(q=>$('#question-'+q.id).classList.add('missing'));const field=$('#question-'+missing[0].id);field.scrollIntoView({block:'center',behavior:'smooth'});field.querySelector('input').focus({preventScroll:true});return;}
    if(state.step===4)complete();else{state.step++;renderStep();}
  };
  $('#ai').addEventListener('input',refreshSliders);
  $('#resetSliders').onclick=()=>{$('#ai').value=70;refreshSliders();};
  $('#loadResult').onclick=()=>{if(!state.result)return;$('#ai').value=state.result.x;refreshSliders();$('#explore').scrollIntoView({behavior:'smooth'});};
  $('#reopenResult').onclick=openQuiz;
  $('#clearAndRetest').onclick=clearAndRetest;
  $('#presentationSwitch').onclick=()=>{
    state.presentation=!state.presentation;
    document.body.classList.toggle('presentation-mode',state.presentation);
    $('#presentationSwitch').textContent=state.presentation?'退出汇报模式':'开启汇报模式';
    $('#presentationSwitch').setAttribute('aria-pressed',String(state.presentation));
    if(state.presentation){$('.method').open=false;$('#presentationSummary').scrollIntoView({block:'start',behavior:'smooth'});}
    draw();
  };
  new ResizeObserver(draw).observe($('#chartArea'));
  window.CollaborationSurvey={scoreAnswers,trendAt,getZones,interpretation,practicalActions,getResult:()=>state.result};
  refreshSliders();
})();

