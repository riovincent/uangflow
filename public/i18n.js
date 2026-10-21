import {english,patterns} from './translations.js';

let locale='en';
try{if(typeof localStorage!=='undefined'&&localStorage.getItem('uangflow.language')==='id')locale='id';}catch{}
export const language=()=>locale;
const reverse=Object.fromEntries(Object.entries(english).map(([id,en])=>[en,id]));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const rules=patterns.map(([id,en])=>[id,en].map(template=>{
  const names=[];let start=0,source='^';
  for(const match of template.matchAll(/\{(\w+)\}/g)){source+=escape(template.slice(start,match.index))+'(.+?)';names.push(match[1]);start=match.index+match[0].length;}
  return {template,names,regex:new RegExp(source+escape(template.slice(start))+'$','s')};
}));
export function t(value){
  const text=String(value??''),key=text.trim().replace(/\s+/g,' '),dictionary=locale==='en'?english:reverse;
  let result=dictionary[key];
  if(result===undefined){for(const pair of rules){const [from,to]=locale==='en'?pair:[pair[1],pair[0]],match=from.regex.exec(key);if(!match)continue;const values=Object.fromEntries(from.names.map((name,index)=>[name,match[index+1]]));result=to.template.replace(/\{(\w+)\}/g,(_,name)=>values[name]);break;}}
  return result===undefined?text:text.replace(text.trim(),result);
}
export function setLanguage(value){
  if(value!=='en'&&value!=='id')return;
  locale=value;try{localStorage.setItem('uangflow.language',value);}catch{}
  document.documentElement.lang=value;
  document.dispatchEvent(new CustomEvent('uangflow:language'));
}
const protectedContent='[translate="no"],[data-user-content],script,style,textarea';
export function localize(root){
  if(!root)return;
  const text=node=>{if(!node.parentElement?.closest(protectedContent)){const next=t(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}};
  if(root.nodeType===3){text(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9)return;
  if(root.nodeType===1&&root.closest(protectedContent))return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))text(node);
  for(const element of [root,...root.querySelectorAll('[aria-label],[placeholder],[title]')]){
    if(!element.getAttribute||element.closest(protectedContent))continue;
    for(const attribute of ['aria-label','placeholder','title']){const value=element.getAttribute(attribute);if(value!==null){const next=t(value);if(next!==value)element.setAttribute(attribute,next);}}
  }
}
export function watchLanguage(){
  document.documentElement.lang=locale;localize(document.body);
  const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='childList')record.addedNodes.forEach(localize);else localize(record.target);}});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title']});
}
