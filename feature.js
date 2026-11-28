/* 入れ替わるトップ：前回と違う世界を先頭に（?world=kiremo|noktoa で固定） */
(function(){
  var f=document.getElementById('feature'); if(!f) return;
  var KEY='nk_last_world', last=null; try{last=localStorage.getItem(KEY)}catch(e){}
  var q=(location.search.match(/[?&]world=(\w+)/)||[])[1];
  var cur=q||(last==='kiremo'?'noktoa':'kiremo');
  try{localStorage.setItem(KEY,cur)}catch(e){}
  if(cur!=='kiremo'){f.parentNode.removeChild(f);return;}
  f.hidden=false;
  var v=f.querySelector('video');
  function go(){ if(document.documentElement.classList.contains('gate-on')) return setTimeout(go,200);
    f.classList.add('on'); if(v){v.play().catch(function(){});} }
  go();
  if('IntersectionObserver' in window && v){ new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?v.play().catch(function(){}):v.pause()})}).observe(f); }
})();
