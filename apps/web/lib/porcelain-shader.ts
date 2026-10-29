// Liquid porcelain: spring-driven contours and voice-powered subsurface folds.
// Analytic fields keep the material light: no textures, raymarching or extra passes.
export const vertexSource = `attribute vec2 aPosition;
void main(){gl_Position=vec4(aPosition,0.0,1.0);}`;

export const fragmentSource = `precision highp float;
uniform vec2 uResolution;
uniform vec3 uPaper,uFern,uMint,uClay;
uniform float uTime,uEnergy,uWobble,uLow,uHigh,uCandidate,uInactive,uReduced;

vec3 current(vec3 p,float t){
  vec3 warp=sin(p.yzx*2.1+p.zxy*.85+vec3(t*.38,-t*.29,t*.22));
  return sin(p*2.4+warp*.85+vec3(-t*.26,t*.31,t*.19));
}

void main(){
  vec2 p=(gl_FragCoord.xy*2.-uResolution)/min(uResolution.x,uResolution.y)*1.38;
  float t=uTime;
  float e=uReduced>.5?0.:clamp(uEnergy,0.,1.);
  float wobble=uReduced>.5?0.:clamp(uWobble,-.08,1.08);
  float low=clamp(uLow,0.,1.);
  float high=clamp(uHigh,0.,1.);
  float angle=atan(p.y,p.x);
  // Broad, overlapping lobes feel elastic rather than spiky. The center stays
  // anchored, with enough padding in the drawing surface for the loudest word.
  float a=angle*2.+t*1.7;
  float b=angle*3.-t*1.25+.7;
  float c=angle*4.+t*.9;
  float deformation=wobble*(.034*sin(a)+(.019+low*.009)*sin(b)+high*.009*cos(c));
  float contour=1.+clamp(deformation,-.07,.07);
  vec2 q=p/(contour*(1.+wobble*.035));
  float radius=length(q);
  float aa=2.4/min(uResolution.x,uResolution.y);
  if(radius>1.+aa){gl_FragColor=vec4(0.);return;}
  float z=sqrt(max(0.,1.-dot(q,q)));
  // Tilt the edge normal with the contour so the glaze bends with the body.
  float slope=wobble*(.068*cos(a)+( .057+low*.027)*cos(b)-high*.036*sin(c));
  vec2 tangent=vec2(-sin(angle),cos(angle));
  vec3 n=normalize(vec3(q-tangent*slope*radius,z));
  vec3 flow=current(vec3(q*.94,z*.8),t);
  vec3 depth=current(vec3(q*.8-vec2(.2,.1),z*1.3)+flow*(.28+e*.14),t-2.8);

  // Broad folds live under the glaze, rather than travelling across it as stripes.
  float fold=q.x*.76+q.y*.58+flow.x*.52+depth.y*.34;
  float ribbon=sin(fold*4.4+depth.z*.95);
  float porcelain=smoothstep(-.62,.82,ribbon);
  float mint=smoothstep(-.75,.7,depth.y+q.x*.35);
  vec3 mineral=mix(uFern,uMint,.4+mint*.48);
  vec3 body=mix(mineral,uPaper,porcelain*.88);
  float seam=exp(-pow((ribbon-.44+depth.x*.12)/.17,2.));
  body=mix(body,mix(uMint,uPaper,.8),seam*.2);
  float submerged=smoothstep(.12,.9,depth.x-flow.z*.4);
  body=mix(body,uFern,submerged*(1.-porcelain)*.17);
  // A second, deeper fold rolls under the primary one. Narrow pearl seams
  // catch brighter consonants without becoming a glowing outline or waveform.
  float inner=sin(q.x*3.1-q.y*2.3+depth.x*1.55+flow.y*.9+t*.24);
  float veil=smoothstep(-.35,.8,inner)*(1.-porcelain)*(.16+e*.12);
  body=mix(body,mix(uMint,uPaper,.72),veil);
  float caustic=exp(-pow((ribbon+.24+depth.y*.22)/.11,2.));
  body=mix(body,uPaper,caustic*(.09+high*e*.18)*(1.-radius*.45));
  // A trace of candidate clay warms one reflected fold.
  float warmth=smoothstep(.12,.85,depth.z-q.y*.35)*(.045+uCandidate*.12);
  body=mix(body,mix(uClay,uPaper,.68),warmth*(1.-porcelain*.6));

  vec3 light=normalize(vec3(-.55,.72,1.2));
  float diffuse=max(dot(n,light),0.);
  float rim=pow(1.-z,2.5);
  vec3 color=body*(.69+.34*diffuse);
  // A wide ceramic sheen and one soft catchlight give the quiet folds depth.
  float sheen=pow(max(dot(n,normalize(vec3(-.3,.42,1.))),0.),5.);
  vec3 glaze=normalize(n+vec3(flow.xy*.035*e,0.));
  float highlight=pow(max(dot(glaze,normalize(light+vec3(0.,0.,1.))),0.),26.);
  color=mix(color,mix(uPaper,vec3(1.),.45),sheen*.12);
  color+=mix(uPaper,vec3(1.),.5)*highlight*.09;
  color+=uMint*rim*.085;
  color*=1.-rim*.14;
  float under=pow(max(-n.y,0.),3.);
  color=mix(color,mix(uFern,uPaper,.12),under*.12);
  color+=uMint*e*.025*(.4+flow.z*.15+uHigh*.2);
  float luminance=dot(color,vec3(.2126,.7152,.0722));
  color=mix(color,mix(vec3(luminance),uPaper,.12),uInactive*.45);
  float dither=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
  color+=dither/700.;
  gl_FragColor=vec4(clamp(color,0.,1.),1.-smoothstep(1.-aa,1.+aa,radius));
}`;
