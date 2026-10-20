// Porcelain material adapted from the approved Screenly orb studio.
// No time uniform: the surface moves only in response to measured audio.
export const vertexSource = `attribute vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.0,1.0);}`;
export const fragmentSource = `precision highp float;
uniform vec2 uResolution;
uniform float uEnergy,uLow,uHigh,uMaterial,uCandidate,uInactive,uReduced;
const float PI=3.14159265359;
vec3 fresnel(float cosTheta,vec3 f0){return f0+(1.0-f0)*pow(1.0-clamp(cosTheta,0.0,1.0),5.0);}
float softbox(vec3 d,vec3 center,vec2 size,float softness){
 vec3 f=normalize(center),r=normalize(cross(vec3(0.,1.,0.),f)),up=cross(f,r);
 float forward=dot(d,f);vec2 p=vec2(dot(d,r),dot(d,up))/max(forward,.001);
 vec2 edge=1.0-smoothstep(size,size+softness,abs(p));return edge.x*edge.y*smoothstep(0.,.15,forward);
}
vec3 environment(vec3 r,float rough){
 vec3 c=vec3(.025,.028,.033)+vec3(.1,.115,.14)*max(r.y,0.);
 c+=vec3(2.6,2.4,2.15)*softbox(r,vec3(-.6,.85,1.4),vec2(.6,.38),.03+rough*.7);
 c+=vec3(1.15,1.3,1.5)*softbox(r,vec3(.9,.2,1.2),vec2(.065,.65),.03+rough*.36);
 c+=vec3(.55,.48,.38)*softbox(r,vec3(-.25,-.9,1.1),vec2(.65,.08),.06+rough*.5);
 return c;
}
vec3 chromeEnvironment(vec3 r,float rough){
 float band=exp(-pow((r.y+.12+.23*sin(r.x*2.2))/(.11+rough*.1),2.));
 float ceiling=smoothstep(.12,.7,r.y);float edge=exp(-pow((r.x-.78)/.12,2.))*max(r.z,0.);
 return vec3(.028,.035,.045)+vec3(2.3,2.4,2.6)*band+vec3(.45,.54,.7)*ceiling+vec3(.8,.7,.55)*edge;
}
vec3 lightBRDF(vec3 n,vec3 v,vec3 l,vec3 base,vec3 radiance,float rough,float metal){
 vec3 h=normalize(v+l);float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float a=rough*rough,a2=a*a,denom=nh*nh*(a2-1.)+1.;float d=a2/(PI*denom*denom+.0001);
 float k=(rough+1.)*(rough+1.)/8.,g=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
 vec3 f=fresnel(vh,mix(vec3(.04),base,metal));vec3 spec=d*g*f/(4.*nv*max(nl,.001)+.001);
 return ((1.-f)*(1.-metal)*base/PI+spec)*radiance*nl;
}
vec3 tone(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec2 p=(gl_FragCoord.xy*2.-uResolution)/min(uResolution.x,uResolution.y)*1.38;
 float e=uReduced>.5?0.:sqrt(max(uEnergy,0.));float a=atan(p.y,p.x);
 float shape=1.+e*(.012*sin(3.*a+.5)+uLow*.027*cos(2.*a-.3)+uHigh*.018*sin(4.*a));
 float swell=1.+e*(uMaterial>2.5&&uMaterial<3.5?.065:.04);
 vec2 q=p/(shape*swell);float rr=dot(q,q);float aa=5.0/min(uResolution.x,uResolution.y);
 if(rr>1.){gl_FragColor=vec4(0.);return;}
 float z=sqrt(max(0.,1.-rr));vec3 n=normalize(vec3(q.x,q.y,z));vec3 v=vec3(0.,0.,1.);float nv=max(n.z,0.);
 vec3 base=vec3(.92,.77,.57);float rough=.4,metal=0.,transmission=.12,iridescence=0.;
 if(uMaterial>.5&&uMaterial<1.5){base=vec3(.64,.73,.83);rough=.26;transmission=.28;iridescence=.45;}
 if(uMaterial>1.5&&uMaterial<2.5){base=vec3(.83,.4,.45);rough=.48;transmission=.48;}
 if(uMaterial>2.5&&uMaterial<3.5){base=vec3(.86,.88,.91);rough=.13;metal=.96;transmission=0.;}
 if(uMaterial>3.5){base=vec3(.76,.25,.025);rough=.16;transmission=.65;}
 base=mix(base,mix(base,vec3(.72,.36,.22),.65),uCandidate);
 vec3 interference=.65+.28*cos(vec3(0.,2.1,4.2)+nv*8.+n.x*1.8+n.y*.7);
 base=mix(base,interference,iridescence*(.25+.75*pow(1.-nv,.65)));
 vec3 col=base*.055*(1.-metal);
 col+=lightBRDF(n,v,normalize(vec3(-.65,.85,1.4)),base,vec3(2.3,2.1,1.85),rough,metal);
 col+=lightBRDF(n,v,normalize(vec3(.9,.15,.8)),base,vec3(.55,.65,.85),rough,metal);
 col+=lightBRDF(n,v,normalize(vec3(-.25,-.9,.6)),base,vec3(.28,.2,.15),rough,metal);
 vec3 f0=mix(vec3(.04),base,metal),r=reflect(-v,n);vec3 reflected=metal>.5?chromeEnvironment(r,rough):environment(r,rough);
 col+=reflected*fresnel(nv,f0)*mix(.5,1.1,metal);
 float wrap=max(dot(n,normalize(vec3(-.5,.4,-.5)))+.45,0.)/1.45;
 col+=base*transmission*wrap*.8;
 if(uMaterial<.5){col+=vec3(.8,.44,.18)*pow(1.-nv,2.2)*.16;col+=vec3(.34,.26,.19)*pow(max(dot(n,normalize(vec3(-.4,.5,1.))),0.),1.4)+vec3(.07,.048,.035);}
 if(uMaterial>.5&&uMaterial<1.5){col+=interference*.12*(.5+pow(1.-nv,2.));}
 if(uMaterial>1.5&&uMaterial<2.5){col+=vec3(.5,.1,.06)*pow(max(dot(n,normalize(vec3(-.2,-.2,1.))),0.),1.7)*.24;}
 if(uMaterial>3.5){vec3 beer=exp(-vec3(.2,.85,2.8)*(1.9*z+.1));col+=beer*vec3(1.1,.5,.12)*(.32+.5*max(-n.y,0.));col+=vec3(.22,.055,.005)*pow(1.-nv,1.2);}
 float edge=pow(1.-nv,3.);col+=vec3(.075,.085,.1)*edge;
 col*=1.+uEnergy*.065;
 vec3 mapped=pow(tone(col),vec3(1./2.2));
 if(uMaterial<.5){float pearl=pow(max(dot(n,normalize(vec3(-.35,.4,1.))),0.),3.);mapped=mix(mapped,vec3(1.,.965,.88),pearl*.4);}
 float luminance=dot(mapped,vec3(.2126,.7152,.0722));mapped=mix(mapped,vec3(luminance*.82),uInactive*.88);
 float dither=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;mapped+=dither/500.;
 float alpha=1.-smoothstep(1.-aa,1.,rr);gl_FragColor=vec4(mapped,alpha);
}`;
