/* Signal / No Masters: original tracker song data for the unchanged Mini engine. */
(function(root){
  "use strict";
  var C=root.CellbeatMiniComposer;
  function create(seed){
    seed=seed===undefined?1+Math.floor(Math.random()*2147483646):seed;
    var w=C.create(),g;
    for(g=1;g<7;g++){w=C.addGrid(w);}
    w.robot={gridId:1,x:0,y:0,dir:1};w.home={gridId:1,x:0,y:0,dir:1};
    w.companions=[];w.nextRobotId=8;w.effects={chorus:true,echo:true};
    // Mirrored winding voices: three horizontal phrases and a gated return.
    for(g=2;g<=7;g++){var mirror=g%2===0;var pose={gridId:g,x:mirror?7:0,y:0,dir:mirror?3:1};w.companions.push({id:g,pose:pose,home:JSON.parse(JSON.stringify(pose)),speed:g===3||g===4||g===5?2:1,counter:0});}
    function put(id,x,y,type,note,mode,n,drawSeed){
      if(id%2===0){x=7-x;if(type==="right"){type="left";}else if(type==="face-right"){type="face-left";}else if(type==="face-left"){type="face-right";}}
      w=C.paint(w,id,x,y,C.cell(type,note||0,mode||"always",n||1,0,drawSeed));
    }
    var voices=[[7,9,8,7,6,7],[11,9,7,9,8,7],[0,4,6,4,2,4],[0,4,2,4,0,2],[0],[0],[11,7,9,7,6,7]];
    for(g=1;g<=7;g++){
      // Only authored sound sites on the actual route; silence gives the FX room.
      [0,2,4].forEach(function(y,phrase){
        [2,3,4,5].forEach(function(x,k){
          if(g===4&&k%2){return;}
          var type=g===5||g===6||g===7&&k%2?"sample":"tone";
          var note=g===5?3:g===6?[0,2,1,2][k]:g===7&&k%2?2:voices[g-1][(k+phrase*2)%6];
          put(g,x,y,type,note,g===3?"every":g===4?"skip":g===6&&y===4&&k===2?"every":"always",g===3?2:g===4?3:4);
        });
      });
      // Arrival arrows make explicit, legible serpentine bends.
      [[0,0,"face-right"],[6,0,"face-down"],[6,2,"face-left"],[1,2,"face-down"],[1,4,"face-right"],[6,4,"face-down"],[6,5,"face-left"],[0,5,"face-up"]].forEach(function(p){put(g,p[0],p[1],p[2]);});
      // Ten genuine quarter-turn bumpers replace two bends in five voices.
      // They stay active: a winding loop must not disappear after ten passes.
      if(g<=5){put(g,6,0,"empty");put(g,7,0,"right");put(g,6,2,"empty");put(g,6,3,"right");}
      if(g>1){
        put(g,0,1,"reflect-vertical",0,"every",3);
        put(g,0,3,"reflect-vertical",0,g===2||g===7?"chance":"skip",g===2||g===7?2:3,g===2?seed:g===7?(seed===2147483646?1:seed+1):undefined);
        if(g===3||g===4){put(g,3,2,"reflect-horizontal",0,"every",2);put(g,3,4,"reflect-horizontal",0,"skip",3);}
      }
    }
    put(1,1,0,"record-start",0,"first",1);
    put(1,2,0,"record-stop",0,"every",11);
    return C.validate(w,9);
  }
  root.CellbeatMiniArrangement={create:create,endTick:322,bpm:96,robots:7,rotators:10,periodicLayers:3,chanceRoutes:2,title:"Signal / No Masters"};
}(this));
