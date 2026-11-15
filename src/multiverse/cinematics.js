import * as THREE from 'three';

const finite = value => Number.isFinite(value) ? value : 0;
const unit = value => THREE.MathUtils.clamp(finite(value), 0, 1);
const smooth = (from, to, value) => { const t = unit((value - from) / (to - from)); return t * t * (3 - 2 * t); };

/** All pulses resolve to zero before a flight commits, including interrupted trips. */
export function sampleCinematics(progress, active) {
  const p = unit(progress);
  if (!active || p === 0 || p === 1) return { energy: 0, travel: 0, arrival: 0 };
  return {
    energy: smooth(.02, .30, p) * (1 - smooth(.74, 1, p)),
    travel: smooth(.36, .56, p) * (1 - smooth(.70, .94, p)),
    arrival: smooth(.73, .84, p) * (1 - smooth(.88, 1, p)),
  };
}

const colorOutput = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** A small number of real 3D magnetic structures, animated entirely by scene time. */
export function createFluxField() {
  const group = new THREE.Group();
  group.name = 'Gravitational flux';
  const uniforms = {
    uTime: { value: 0 }, uEnergy: { value: 0 }, uTravel: { value: 0 }, uArrival: { value: 0 },
    uColor: { value: new THREE.Color(0x9abfff) },
  };
  const shared = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const ribbonVertex = `varying vec2 vUv; void main(){vUv=uv;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const ribbonFragment = `varying vec2 vUv; uniform float uTime,uEnergy,uGlow; uniform vec3 uColor;
    void main(){float a=vUv.x*6.283185;
    float flow=.5+.5*sin(a*3.-uTime*.8+sin(a*7.+uTime*.2)*.45);
    float vein=pow(flow,8.);
    float tracer=pow(.5+.5*cos(a-uTime*.35),28.);
    float segments=.28+.72*smoothstep(-.3,.5,sin(a*9.+uTime*.16));
    float light=(.3+vein*.8+tracer*1.5)*segments;
    vec3 tint=mix(uColor,vec3(.72,.9,1.),vein*.6);
    gl_FragColor=vec4(tint*(1.5+uEnergy*1.2),light*(.65+uEnergy*.35)*uGlow);
    ${colorOutput}}`;
  const lineMaterial = new THREE.ShaderMaterial({ ...shared, uniforms: { ...uniforms, uGlow: { value: 1 } }, vertexShader: ribbonVertex, fragmentShader: ribbonFragment });
  const haloMaterial = new THREE.ShaderMaterial({ ...shared, uniforms: { ...uniforms, uGlow: { value: .22 } }, vertexShader: ribbonVertex, fragmentShader: ribbonFragment });
  const thin = new THREE.TorusGeometry(1, .014, 6, 160);
  const broad = new THREE.TorusGeometry(1, .034, 6, 160);
  const rings = [];
  for (let index = 0; index < 3; index++) {
    const orbit = new THREE.Group();
    orbit.name = `Magnetic orbit ${index + 1}`;
    orbit.rotation.set(.72 + index * .48, -.5 + index * .66, -.32 + index * .8);
    const core = new THREE.Mesh(thin, lineMaterial);
    const halo = new THREE.Mesh(broad, haloMaterial);
    orbit.add(core, halo);
    const radius = 1.94 + index * .24;
    orbit.scale.setScalar(radius);
    rings.push({ orbit, radius, index });
    group.add(orbit);
  }

  const corona = new THREE.Mesh(new THREE.SphereGeometry(1.88, 48, 32), new THREE.ShaderMaterial({ ...shared, uniforms,
    side: THREE.BackSide,
    vertexShader: `varying vec3 vNormal,vEye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);
      vNormal=normalize(normalMatrix*normal);vEye=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 vNormal,vEye;uniform vec3 uColor;uniform float uEnergy;
      void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),4.);
      gl_FragColor=vec4(uColor*1.8,rim*(.045+uEnergy*.16));${colorOutput}}`,
  }));
  corona.name = 'Reactor corona';
  group.add(corona);

  let seed = 9173;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const count = 320, positions = [], phases = [];
  for (let index = 0; index < count; index++) {
    const angle = random() * Math.PI * 2, latitude = (random() - .5) * 1.8;
    const radius = 2.05 + random() * 1.4;
    positions.push(Math.cos(angle) * Math.cos(latitude) * radius, Math.sin(latitude) * radius, Math.sin(angle) * Math.cos(latitude) * radius);
    phases.push(random());
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  dustGeometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const dustMaterial = new THREE.ShaderMaterial({ ...shared, uniforms,
    vertexShader: `attribute float phase; uniform float uTime,uEnergy; varying float vLight;
      void main(){float a=uTime*(.025+phase*.025);mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));
      vec3 p=position;p.xz=rot*p.xz;p*=1.+uEnergy*.08;
      vec4 eye=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*eye;
      gl_PointSize=clamp((1.8+phase*1.7+uEnergy*2.)*8./max(2.,-eye.z),1.,9.);
      vLight=.2+phase*.5+uEnergy*.3;}`,
    fragmentShader: `uniform vec3 uColor; varying float vLight;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
      gl_FragColor=vec4(mix(uColor,vec3(.8,.95,1.),.35)*1.8,exp(-d*d*5.)*vLight);${colorOutput}}`,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.name = 'Orbiting ion dust';
  group.add(dust);

  const streakPositions = [], streakPhases = [];
  for (let index = 0; index < 100; index++) {
    const angle = random() * Math.PI * 2, radius = 1.8 + random() * 1.7, z = -3 + random() * 5;
    for (const end of [0, 1]) {
      streakPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z + end * (.12 + random() * .3));
      streakPhases.push(index / 100);
    }
  }
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streakPositions, 3));
  streakGeometry.setAttribute('phase', new THREE.Float32BufferAttribute(streakPhases, 1));
  const streakMaterial = new THREE.ShaderMaterial({ ...shared, uniforms,
    vertexShader: `attribute float phase;uniform float uTime,uTravel;varying float vFade;
      void main(){vec3 p=position;float z=mod(p.z+uTime*3.,8.)-4.;p.z=z;
      p.xy*=1.+uTravel*.35;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      vFade=(.25+phase*.75)*(1.-smoothstep(2.5,4.,abs(z)));}`,
    fragmentShader: `uniform vec3 uColor;uniform float uTravel;varying float vFade;
      void main(){gl_FragColor=vec4(mix(uColor,vec3(.7,.9,1.),.5)*2.,vFade*uTravel*.65);${colorOutput}}`,
  });
  const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  streaks.name = 'Transit streamlines';
  streaks.frustumCulled = false;
  group.add(streaks);

  function update({ time = 0, energy = 0, travel = 0, arrival = 0, color = 0x9abfff } = {}) {
    uniforms.uTime.value = finite(time);
    uniforms.uEnergy.value = unit(energy);
    uniforms.uTravel.value = unit(travel);
    uniforms.uArrival.value = unit(arrival);
    uniforms.uColor.value.set(color);
    streaks.visible = uniforms.uTravel.value > .001;
    for (const { orbit, radius, index } of rings) {
      const phase = uniforms.uTime.value * (.035 + index * .012);
      orbit.rotation.set(.72 + index * .48 + Math.sin(phase) * .08, -.5 + index * .66 + phase * .2, -.32 + index * .8 + phase);
      orbit.scale.setScalar(radius * (1 + uniforms.uEnergy.value * .07 + uniforms.uArrival.value * .12));
    }
  }
  update();
  // The owning scene disposes shared geometries/materials exactly once via disposeTree.
  return { group, update };
}
