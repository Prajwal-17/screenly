// A glazed porcelain body with slow, neutral subsurface currents.
// Analytic fields keep the material light: no textures, raymarching or extra passes.
export const vertexSource = `attribute vec2 aPosition;
void main(){gl_Position=vec4(aPosition,0.0,1.0);}`;

export const fragmentSource = `precision highp float;
uniform vec2 uResolution;
uniform vec3 uPaper,uFern,uMint,uClay;
uniform float uTime,uEnergy,uLow,uHigh,uCandidate,uInactive,uReduced;

vec3 current(vec3 p,float t){
  vec3 warp=sin(p.yzx*2.1+p.zxy*.85+vec3(t*.11,-t*.085,t*.065));
  return sin(p*2.4+warp*.85+vec3(-t*.075,t*.09,t*.055));
}

void main(){
  vec2 p=(gl_FragCoord.xy*2.-uResolution)/min(uResolution.x,uResolution.y)*1.38;
  float t=uTime;
  float e=uReduced>.5?0.:clamp(uEnergy,0.,1.);
  float motion=(1.-uReduced)*(1.-uInactive);
  float angle=atan(p.y,p.x);
  // Less than 0.6% at rest. The center never translates or bobs.
  float deformation=motion*(.0034*sin(angle*3.+t*.29)+.0018*cos(angle*2.-t*.21));
  deformation+=e*(.0035*sin(angle*3.-t*.36)+uLow*.0025*cos(angle*2.+t*.22));
  float contour=1.+clamp(deformation,-.006,.006);
  vec2 q=p/(contour*(1.+e*.003));
  float radius=length(q);
  float aa=2.4/min(uResolution.x,uResolution.y);
  if(radius>1.+aa){gl_FragColor=vec4(0.);return;}
  float z=sqrt(max(0.,1.-dot(q,q)));
  vec3 n=normalize(vec3(q,z));
  vec3 flow=current(vec3(q*.94,z*.8),t);
  vec3 depth=current(vec3(q*.8-vec2(.2,.1),z*1.3)+flow*.22,t-2.8);

  // Broad folds live under the glaze, rather than travelling across it as stripes.
  float fold=q.x*.76+q.y*.58+flow.x*.46+depth.y*.28;
  float ribbon=sin(fold*4.4+depth.z*.85);
  float porcelain=smoothstep(-.55,.82,ribbon);
  float mint=smoothstep(-.75,.7,depth.y+q.x*.35);
  vec3 mineral=mix(uFern,uMint,.4+mint*.48);
  vec3 body=mix(mineral,uPaper,porcelain*.88);
  float seam=exp(-pow((ribbon-.44+depth.x*.12)/.17,2.));
  body=mix(body,mix(uMint,uPaper,.8),seam*.2);
  float submerged=smoothstep(.12,.9,depth.x-flow.z*.4);
  body=mix(body,uFern,submerged*(1.-porcelain)*.1);
  // A trace of candidate clay warms one reflected fold.
  float warmth=smoothstep(.12,.85,depth.z-q.y*.35)*(.045+uCandidate*.12);
  body=mix(body,mix(uClay,uPaper,.68),warmth*(1.-porcelain*.6));

  vec3 light=normalize(vec3(-.55,.72,1.2));
  float diffuse=max(dot(n,light),0.);
  float rim=pow(1.-z,2.5);
  vec3 color=body*(.69+.34*diffuse);
  // A wide ceramic sheen and one soft catchlight give the quiet folds depth.
  float sheen=pow(max(dot(n,normalize(vec3(-.3,.42,1.))),0.),5.);
  float highlight=pow(max(dot(n,normalize(light+vec3(0.,0.,1.))),0.),26.);
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
