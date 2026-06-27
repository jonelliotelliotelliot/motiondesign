TweenMax.to ("#loader",1,{ease:Linear.easeNone, rotation:-360,repeat:-1})

window.onload = function () { 

// eyeBuild.initialize();
document.getElementById("load").style.display = "none";
document.getElementById("container").style.display = "block";


TweenMax.set ("#winner",{scale:0})
TweenMax.set (".clawcontainer",{x:-20})
TweenMax.set (".clawopen",{display:'none'})
TweenMax.set ("#zoom",{display:'none'})


var introTimeline = new TimelineMax();
introTimeline
.from ("#intro",1,{backgroundColor : 'rgba(0, 0, 0, 1)'})
.from ("#introtext",1.3,{ease: Elastic.easeOut.config(1, 0.8),scale:0,force3D:false},"+=0.5")
.from ("#startbutton",0.8,{ease: Power2.easeInOut,y:30,opacity:0},"-=0.6")
;

////RANDOM PRIZES////

var random= Math.floor(Math.random() * 9) + 0;
var Prize = ["url('prize1.png')",
                 "url('prize2.png')",
                 "url('prize3.png')",
                 "url('prize4.png')",
                 "url('prize5.png')",
                 "url('prize6.png')",
                 "url('prize7.png')",
                 "url('prize8.png')",
                 "url('prize9.png')",
                 "url('prize10.png')"
                 ];
document.getElementById("object").style.backgroundImage=Prize[random];

////ROLLOVERS AND CLICKS////

document.getElementById("discoverfun").onmouseout = function() {
  this.style.backgroundImage="url(discoverfun.png)";
}

document.getElementById("discoverfun").onmouseover = function() {
  this.style.backgroundImage="url(discoverfunclicked.png)";
}
document.getElementById("discoverfun").onclick = function() {
  eyeBuild.doClick(0)
}
document.getElementById("startbutton").onmouseover = function() {
  this.style.backgroundImage="url(startbtnclicked.png)";
}
document.getElementById("startbutton").onmouseout = function() {
  this.style.backgroundImage="url(startbtn.png)";
}
document.getElementById("startbutton").onclick = function() {
  TweenMax.to ("#intro",0.5,{opacity:0,display:'none'})
  TweenMax.to ("#grab",1,{ease:Elastic.easeOut.config(1, 0.8),y:-50})

var grabBounce = new TimelineMax({repeat:-1});
grabBounce
.to ("#pause",2,{opacity:0})
.to ("#grab",0.2,{ease:Power2.easeOut,y:-57})
.to ("#grab",0.3,{ease:Power2.easeIn,y:-50})
.to ("#grab",0.2,{ease:Power2.easeOut,y:-55})
.to ("#grab",0.3,{ease:Power2.easeIn,y:-50})
.to ("#pause",2,{opacity:0})
;
}

document.getElementById("grab").onmouseover = function() {
  this.style.backgroundImage="url(grabbtnclicked.png)";
}
document.getElementById("grab").onmouseout = function() {
  this.style.backgroundImage="url(grabbtn.png)";
}

////ON GRAB////

document.getElementById("grab").onclick = function(){

var element = document.getElementById('clawcontainer');
var position = element.getBoundingClientRect();
var x = position.left;
var y = position.top;

shift1 = function() {

var shift1Timeline = new TimelineMax();
shift1Timeline
.to ("#basketball",0.6,{ease: Power2.easeInOut,x:-4,y:6},"shift1out")
.to ("#burger",0.6,{ease: Power2.easeInOut,x:3,y:5},"shift1out")
.to ("#pingpong",0.6,{ease: Power2.easeInOut,y:4,rotation:5},"shift1out")

.to ("#basketball",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift1in+=0.6")
.to ("#burger",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift1in+=0.6")
.to ("#pingpong",0.6,{ease: Power2.easeInOut,x:0,y:0,rotation:0},"shift1in+=0.6")
; }

shift2 = function() {

var shift2Timeline = new TimelineMax();
shift2Timeline
.to ("#drink",0.6,{ease: Power2.easeInOut,y:5},"shift2out")
.to ("#wheel",0.6,{ease: Power2.easeInOut,x:5,y:5},"shift2out")
.to ("#controller",0.6,{ease: Power2.easeInOut,x:3,y:3},"shift2out")
.to ("#mic",0.6,{ease: Power2.easeInOut,rotation:-7},"shift2out")

.to ("#drink",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift2in+=0.6")
.to ("#wheel",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift2in+=0.6")
.to ("#controller",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift2in+=0.6")
.to ("#mic",0.6,{ease: Power2.easeInOut,rotation:0},"shift2in+=0.6")
; }

shift3 = function() {

var shift3Timeline = new TimelineMax();
shift3Timeline
.to ("#donut",0.6,{ease: Power2.easeInOut,x:0,y:7},"shift3out")
.to ("#bear",0.6,{ease: Power2.easeInOut,x:3,y:5},"shift3out")
.to ("#arcade",0.6,{ease: Power2.easeInOut,y:4,rotation:5},"shift3out")
.to ("#eightball",0.6,{ease: Power2.easeInOut,y:4,rotation:5},"shift3out")

.to ("#donut",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift3in+=0.6")
.to ("#bear",0.6,{ease: Power2.easeInOut,x:0,y:0},"shift3in+=0.6")
.to ("#arcade",0.6,{ease: Power2.easeInOut,x:0,y:0,rotation:0},"shift3in+=0.6")
.to ("#eightball",0.6,{ease: Power2.easeInOut,x:0,y:0,rotation:0},"shift3in+=0.6")

; }


if (x <=55) {
  
  dropZone = shift1;
}

if (x<=155 && x>=56) {

  dropZone = shift2;
}

if (x<=255 && x>=156) {
  
  dropZone = shift3;
}

clawTimeline.pause();


var pickupTimeline = new TimelineMax();
pickupTimeline
.to ("#grab",0.4,{ease:Power2.easeInOut, y:100,display:'none'})
.to (".clawparts",0.5,{rotation:0})
.to (".clawopen",0.1,{display:'block'},"trigger")
.to (".clawclosed",0.1,{display:'none'},"trigger")
.to (".clawparts",1,{ease:Power2.easeInOut, y:120},"drop+=0.5")
.add (dropZone,"drop+=1")
.set (".object",{display:'block'})
.to (".object",0.5,{opacity:1})
.to (".clawparts",2,{ease:Power2.easeInOut,y:0})
.to ("#pause",1,{opacity:0})
.to (".clawcontainer,#clawreflection",0.8,{ease:Power2.easeInOut,y:-300})
.set ("#zoom",{display:'block'})
.to ("#zoom",0.8,{ease: Back.easeIn.config(3.7),rotationY:-83,opacity:0},"+=2.2")
.set ("#border,#glare,#toyscontainer,#clawcontainer,#clawreflectioncontainer,#background",{display:'none'},"-=1")
.set ("#endframe",{display:'block',rotationY:90,opacity:0})
.to ("#endframe",0.5,{ ease: Back.easeOut.config(2.7), rotationY:0,opacity:1})
;

};

////CLAW MOVEMENT////

var clawTimeline = new TimelineMax({repeat:-1});
clawTimeline
.set (".clawparts",{rotation:0})
.set (".clawcontainer",{x:-20})
.to (".clawcontainer",2,{ease:Power2.easeIn, x:220},"right")
.to (".clawparts",2,{ease:Power2.easeIn, rotation:10},"right")
.to (".clawparts",0.3,{ease:Power2.easeOut, rotation:-14},"right+=2")
.to (".clawparts",1,{ease: Back.easeOut.config(2),rotation:0})
.to ("#clawreflection",2,{ease:Power2.easeIn,x:250},"right")
.to (".clawcontainer",2,{ease:Power2.easeIn, x:-20},"left")
.to (".clawparts",2,{ease:Power2.easeIn, rotation:-10},"left")
.to (".clawparts",0.3,{ease:Power2.easeOut, rotation:10},"left+=2")
.to (".clawparts",1,{ease: Back.easeOut.config(2),rotation:0})
;

};