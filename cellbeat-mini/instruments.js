/* Five original synthesized one-shots. Default tone/sample engines stay separate. */
(function(root){
  "use strict";
  var PATCHES=[{id:"synth",name:"Synth",short:"SYN",duration:0.65},{id:"piano",name:"Electric Piano",short:"EP",duration:1.1},{id:"organ",name:"Organ",short:"ORG",duration:0.65},{id:"pluck",name:"Pluck",short:"PLK",duration:0.8},{id:"bell",name:"Bell",short:"BEL",duration:1.6}];
  var cache=[],voices=[];
  function patch(id){var p=PATCHES.filter(function(p){return p.id===id;})[0];if(!p){throw new Error("Unknown instrument.");}return p;}
  function list(){return PATCHES.map(function(p){return {id:p.id,name:p.name,short:p.short,duration:p.duration};});}
  function pcm(id,note){
    var p=patch(id),bank=root.CellbeatMiniAudio.notes();
    if(typeof note!=="number"||Math.floor(note)!==note||note<0||note>=bank.length){throw new RangeError("Invalid instrument pitch.");}
    var rate=44100,data=new Float32Array(Math.round(p.duration*rate)),f=bank[note].frequency,body=0;
    for(var i=0;i<data.length;i++){
      var t=i/rate,phase=2*Math.PI*f*t,value,env;
      if(id==="synth"){
        var a=f*0.997*t,b=f*1.003*t;
        value=((2*(a-Math.floor(a))-1)+(2*(b-Math.floor(b))-1))*0.5;
        var cutoff=450+2100*Math.exp(-t*8),alpha=1-Math.exp(-2*Math.PI*cutoff/rate);
        body+=alpha*(value-body);value=body;env=Math.min(1,t/0.018)*Math.exp(-t*4);
      }else if(id==="piano"){
        value=(Math.sin(phase+0.9*Math.exp(-t*9)*Math.sin(phase*2))+0.25*Math.exp(-t*5)*Math.sin(phase*3))/1.25;
        env=Math.min(1,t/0.004)*Math.exp(-t*4);
      }else if(id==="organ"){
        value=(Math.sin(phase)+0.45*Math.sin(phase*2)+0.25*Math.sin(phase*3)+0.12*Math.sin(phase*4))/1.82;
        env=Math.min(1,t/0.012)*Math.min(1,(p.duration-t)/0.2);
      }else if(id==="pluck"){
        value=(Math.sin(phase)+0.4*Math.exp(-t*12)*Math.sin(phase*2)+0.2*Math.exp(-t*18)*Math.sin(phase*3))/1.6;
        env=Math.min(1,t/0.002)*Math.exp(-t*8);
      }else{
        value=(Math.sin(phase)*Math.exp(-t*2.8)+0.4*Math.sin(phase*2.76)*Math.exp(-t*4)+0.2*Math.sin(phase*5.4)*Math.exp(-t*6))/1.6;
        env=Math.min(1,t/0.002);
      }
      data[i]=value*env*Math.min(1,(data.length-1-i)/(rate*0.03));
    }
    return data;
  }
  function buffer(context,id,note){
    var found=cache.filter(function(c){return c.context===context&&c.id===id&&c.note===note;})[0];if(found){return found.buffer;}
    var data=pcm(id,note),b=context.createBuffer(1,data.length,44100);b.getChannelData(0).set(data);
    cache.push({context:context,id:id,note:note,buffer:b});return b;
  }
  function remove(v){var i=voices.indexOf(v);if(i>=0){voices.splice(i,1);}}
  function schedule(context,id,note,time,effects){
    var b=buffer(context,id,note),source=context.createBufferSource(),gain=context.createGain();
    source.buffer=b;source.loop=false;source.playbackRate.value=1;
    gain.gain.setValueAtTime(id==="organ"?0.075:0.12,time);
    source.connect(gain);gain.connect(root.CellbeatMiniAudio.effectBus(context,effects));
    var v={context:context,source:source,gain:gain};voices.push(v);
    source.onended=function(){source.disconnect();gain.disconnect();remove(v);};
    source.start(time);source.stop(time+b.duration);
  }
  function play(context,id,note,effects){if(!context||context.state!=="running"){return false;}schedule(context,id,note,context.currentTime,effects);return true;}
  function stop(context){
    voices.slice().forEach(function(v){if(v.context===context){try{v.source.stop();}catch(ignore){}v.source.disconnect();v.gain.disconnect();remove(v);}});
    cache=cache.filter(function(c){return c.context!==context;});
  }
  root.CellbeatMiniInstruments={list:list,describe:function(id){var p=patch(id);return {id:p.id,name:p.name,short:p.short,duration:p.duration};},pcm:pcm,schedule:schedule,play:play,stop:stop,duration:function(id){return patch(id).duration;}};
}(this));
