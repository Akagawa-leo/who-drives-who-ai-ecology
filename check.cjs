const fs=require('fs'),vm=require('vm'),assert=require('assert');
class El{
 constructor(){this.value=0;this.hidden=false;this.clientWidth=700;this.clientHeight=390;this.events={};this.classes=new Set();this.classList={add:(s)=>this.classes.add(s),remove:(s)=>this.classes.delete(s),toggle:(s,force)=>{if(force)this.classes.add(s);else this.classes.delete(s);}};this.children=[];}
 addEventListener(e,fn){this.events[e]=fn;}
 setAttribute(){}
 querySelectorAll(s){return s==='input'?this.children:[];}
 querySelector(){return new El();}
 scrollIntoView(){} focus(){}
 showModal(){this.open=true;} close(){this.open=false;this.events.close?.();}
 set innerHTML(s){this.html=s;this.children=[...s.matchAll(/<input type="radio" name="([^"]+)" value="(\d+)"/g)].map(m=>Object.assign(new El(),{name:m[1],value:m[2]}));}
 get innerHTML(){return this.html||'';}
}
const els=new Map(),get=s=>{if(!els.has(s))els.set(s,new El());return els.get(s);},start=new El();
const ctx={window:{},document:{querySelector:get,querySelectorAll:()=>[start],body:new El()},ResizeObserver:class{observe(){}},confirm:()=>true,requestAnimationFrame:fn=>fn(),console};
vm.createContext(ctx);
for(const f of ['data.js','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+f,'utf8'),ctx);
const config=ctx.window.SURVEY_CONFIG,api=ctx.window.CollaborationSurvey;
const summary=ctx.window.SURVEY_DATA;
assert.equal(summary.dataKind,'aggregate-only');
assert.equal(summary.retained,86);
assert.equal(summary.bins.length,4);
assert.equal(Object.hasOwn(summary,'points'),false);
const questions=config.blocks.flatMap(b=>b.questions);
assert.equal(questions.length,22);
for(const [v,x,h,y] of [[1,20,15,16.75],[3,60,57.5,58.375],[5,100,100,100]]){
 const a=Object.fromEntries(questions.map(q=>[q.id,Math.min(v,q.options.length)]));const r=api.scoreAnswers(a);
 assert.equal(r.x,x);assert.equal(r.h,h);assert.equal(r.y,y);
}
assert.throws(()=>api.scoreAnswers({}));assert.equal(api.trendAt(0),null);
get('#ai').value=70;
get('#ai').events.input();assert.match(get('#demoScore').innerHTML,new RegExp(api.trendAt(70).toFixed(1).replace('.','\\.')));
assert.equal(api.trendAt(20),null);
const edges=api.getZones().edges;assert.equal(edges.length,6);assert(edges.every((x,i)=>!i||x>=edges[i-1]));
assert.match(get('#chart').innerHTML,/最适区/);
assert(!get('#chart').innerHTML.includes('序号'));
start.events.click();assert.equal(get('#quizDialog').open,true);
get('#nextStep').onclick();assert.equal(get('#validation').hidden,false);
for(let step=0;step<5;step++){
 const q=config.blocks[step].questions;
 for(const question of q){const input=get('#stepContent').children.find(e=>e.name===question.id&&e.value==='3');assert(input);input.events.change();}
 get('#nextStep').onclick();
}
assert.equal(api.getResult().y,58.375);assert.equal(get('#resultBody').hidden,false);assert.equal(get('#personalResult').hidden,false);
assert.match(get('#chart').innerHTML,/我的问卷结果/);
assert.match(get('#chart').innerHTML,/fill="#8054b5"/);
assert(!get('#chart').innerHTML.includes('personalPredictionCurve'));
assert(!fs.readFileSync(__dirname+'/index.html','utf8').includes('testCurveLegend'));
assert.match(api.interpretation(api.getResult()),/40＜X≤60组/);
assert.match(api.interpretation(api.getResult()),/该组30份问卷/);
assert.match(get('#resultBody').innerHTML,/和已有样本相比/);
assert.match(get('#inlineSummary').textContent,/综合协作状态均值/);
assert.match(api.interpretation({x:20,y:50,h:50,e:50}),/不作同组均值比较/);
assert.equal(api.practicalActions().length,3);
assert.match(get('#resultBody').innerHTML,/下一次可以这样做/);
assert.equal((get('#inlineAdvice').innerHTML.match(/<li>/g)||[]).length,3);
get('#showOnChart').onclick();assert.equal(get('#quizDialog').open,false);
get('#loadResult').onclick();assert.equal(Number(get('#ai').value),60);
get('#reopenResult').onclick();get('#editAnswers').onclick();assert.equal(get('#quizBody').hidden,false);
get('.method').open=true;get('#presentationSwitch').onclick();assert(ctx.document.body.classes.has('presentation-mode'));assert.equal(get('.method').open,false);
get('#presentationSwitch').onclick();assert(!ctx.document.body.classes.has('presentation-mode'));
assert.equal(typeof get('#newTest').onclick,'function');
get('#clearAndRetest').onclick();assert.equal(api.getResult(),null);assert.equal(get('#personalResult').hidden,true);assert.equal(get('#testLegend').hidden,true);
assert(!get('#chart').innerHTML.includes('我的问卷结果'));assert.equal(get('#quizDialog').open,true);assert.equal(get('#answeredCount').textContent,'已答 0 / 22');
assert.equal(Object.hasOwn(summary,'points'),false);
console.log('PASS: aggregate-only public data, questionnaire scoring, local purple result point, clear-and-retest, group comparison, actions, presentation mode and five-step flow.');

