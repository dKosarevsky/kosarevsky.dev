import * as THREE from 'three';

export const UNIVERSES = Object.freeze([
  Object.freeze({ id: 'lattice', name: 'Lattice', accent: 0xc8ff64 }),
  Object.freeze({ id: 'mirror', name: 'Mirror', accent: 0x9abfff }),
  Object.freeze({ id: 'ember', name: 'Ember', accent: 0xffb05c }),
]);

const TAU = Math.PI * 2;
const vertex = `varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView;
void main(){ vLocal=position; vNormal=normalize(normalMatrix*normal);
vec4 p=modelViewMatrix*vec4(position,1.); vView=-p.xyz; gl_Position=projectionMatrix*p; }`;
const noise = `float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .57*noise(p)+.28*noise(p*2.03)+.15*noise(p*4.09);}`;

/** Everything is in destination coordinates; the entrance is at the origin. */
export function createUniverse(index = 0) {
  index = Number.isFinite(index) ? ((Math.trunc(index) % 3) + 3) % 3 : 0;
  const preset = UNIVERSES[index];
  const group = new THREE.Group();
  group.name = `Universe: ${preset.name}`;
  // Frame the foreground landmark through the artifact's tilted entrance.
  group.position.set(-1.5, -1.2, 0);
  const background = new THREE.Color([0x020806, 0x040512, 0x0c0503][index]);
  const resources = new Set();
  const animated = [];
  let seed = 7391 + index * 8317, disposed = false;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const own = resource => { resources.add(resource); return resource; };
  const basic = (color, opacity = 1, wireframe = false) => own(new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, wireframe, depthWrite: opacity === 1 }));
  const mesh = (geometry, material, position, scale = 1, parent = group) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position); object.scale.setScalar(scale); parent.add(object); return object;
  };
  const sphere = own(new THREE.SphereGeometry(1, 48, 32));

  function cloud(name, count, pointAt, color, size, opacity) {
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count);
    const tint = new THREE.Color(color);
    for (let point = 0; point < count; point++) {
      positions.set(pointAt(point), point * 3);
      const brightness = .35 + random() * .65;
      colors.set([tint.r * brightness, tint.g * brightness, tint.b * brightness], point * 3);
      sizes[point] = size * (.5 + random());
    }
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const material = own(new THREE.ShaderMaterial({
      uniforms: { opacity: { value: opacity } }, transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float size; varying vec3 vColor; void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*260./max(1.,-p.z),1.,42.);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform float opacity; varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=exp(-d*d*5.)*(1.-smoothstep(.6,1.,d));gl_FragColor=vec4(vColor,a*opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    }));
    const points = new THREE.Points(geometry, material); points.name = name; group.add(points); return points;
  }

  cloud('Far stars', 1020, () => [(random() - .5) * 74, (random() - .5) * 48, -19 - random() * 43], [0xc9ffe3, 0xcacbff, 0xffd9ab][index], .19, .9);
  const dust = cloud('Near dust', 150, () => [(random() - .5) * 18, (random() - .5) * 12, -1.8 - random() * 16], preset.accent, .055, .55);
  animated.push(time => { dust.rotation.z = Math.sin(time * .025) * .025; });

  function planet(name, position, radius, colorA, colorB, kind = 0) {
    const material = own(new THREE.ShaderMaterial({
      uniforms: { colorA: { value: new THREE.Color(colorA) }, colorB: { value: new THREE.Color(colorB) }, kind: { value: kind } }, vertexShader: vertex,
      fragmentShader: `varying vec3 vLocal; varying vec3 vNormal; varying vec3 vView; uniform vec3 colorA,colorB; uniform float kind;
      ${noise}
      void main(){vec3 p=normalize(vLocal);float n=fbm(p*5.);float band=sin(p.y*24.+n*8.+sin(p.x*4.)*2.);float pattern=smoothstep(-.65,.8,band)*.7+n*.3;
      vec3 color=mix(colorA,colorB,pattern);float light=.12+.88*pow(max(0.,dot(normalize(vNormal),normalize(vec3(-.6,.5,1.)))),.75);
      if(kind>1.5){color=mix(colorA,colorB,smoothstep(.25,.72,n+sin(p.y*18.+n*12.)*.13));light=.85;}
      float rim=pow(1.-max(0.,dot(normalize(vNormal),normalize(vView))),3.);gl_FragColor=vec4(color*light+colorB*rim*.22,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    }));
    const body = mesh(sphere, material, position, radius); body.name = name;
    const atmosphereMaterial = own(new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(colorB) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: vertex,
      fragmentShader: `varying vec3 vNormal; varying vec3 vView; uniform vec3 color;void main(){float rim=pow(1.-max(0.,dot(normalize(vNormal),normalize(vView))),3.);gl_FragColor=vec4(color,rim*.29);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    }));
    mesh(sphere, atmosphereMaterial, position, radius * 1.035).name = `${name} atmosphere`;
    animated.push(time => { body.rotation.y = time * .014; body.rotation.z = -.18; });
    return body;
  }

  function ring(name, position, radius, tube, color, rotation, opacity = .8, arc = TAU) {
    const object = mesh(own(new THREE.TorusGeometry(radius, tube, 8, 120, arc)), basic(color, opacity), position);
    object.rotation.set(...rotation); object.name = name; return object;
  }

  if (index === 0) {
    planet('Jade world', [-.78, .43, -6.2], 1.32, 0x062c2a, 0xa5db83);
    const crystalGeometry = own(new THREE.OctahedronGeometry(1, 0));
    const crystalMaterial = basic(0x9ce4a8, .35, true);
    const crystal = mesh(crystalGeometry, crystalMaterial, [3.5, 1.3, -9.6], 1.95);
    crystal.name = 'Lattice crown';
    mesh(crystalGeometry, basic(0xc8ff64, .65, true), [3.5, 1.3, -9.6], 1.36).rotation.z = Math.PI / 4;
    animated.push(time => { crystal.rotation.set(.18, time * .035, .35); });
    const shards = basic(0x6eaf9f, .7, true);
    for (let shard = 0; shard < 10; shard++) {
      const object = mesh(crystalGeometry, shards, [(random() - .5) * 12, (random() - .5) * 7, -3 - random() * 14], .13 + random() * .4);
      const phase = random() * TAU;
      animated.push(time => { object.rotation.set(phase + time * .025, phase, -.3); });
    }
    const lines = [];
    for (const z of [-8.5, -13, -18]) {
      for (let x = -8; x <= 8; x += 2) lines.push(x, -6, z, x, 6, z);
      for (let y = -6; y <= 6; y += 2) lines.push(-8, y, z, 8, y, z);
    }
    for (let x = -8; x <= 8; x += 4) for (let y = -6; y <= 6; y += 4) lines.push(x, y, -8.5, x, y, -18);
    const geometry = own(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const lattice = new THREE.LineSegments(geometry, own(new THREE.LineBasicMaterial({ color: 0x558c70, transparent: true, opacity: .18 })));
    lattice.name = 'Deep cubic lattice'; lattice.rotation.z = .14; group.add(lattice);
    cloud('Cold nebular depth', 340, () => { const t = random() * TAU; const r = 3 + random() * 5; return [Math.cos(t) * r, Math.sin(t) * r * .4 + 1, -13 - random() * 12]; }, 0x2b8062, .8, .12);
  } else if (index === 1) {
    const position = [-.65, .32, -6.6];
    planet('Mirror giant', position, 1.38, 0x172f68, 0x91b6ec);
    const ringRotation = [1.03, .35, -.34];
    ring('Mirror inner ring', position, 1.95, .022, 0xbfc9ff, ringRotation, .7);
    ring('Mirror outer ring', position, 2.24, .012, 0x7a8de0, ringRotation, .55);
    const orbit = new THREE.Group(); orbit.position.set(...position); orbit.rotation.set(...ringRotation); group.add(orbit);
    const ringGeometry = own(new THREE.RingGeometry(1.72, 2.35, 128, 1));
    mesh(ringGeometry, own(new THREE.MeshBasicMaterial({ color: 0x8c92c6, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false })), [0, 0, 0], 1, orbit);
    planet('Violet moon', [3.5, 1.65, -11], 1.8, 0x1e163a, 0x8e78bd);
    ring('Galactic arch', [1.4, -.8, -14], 7.3, .048, 0x9d8bff, [.35, .16, .5], .36, Math.PI * 1.5);
    cloud('Spiral nebula', 420, () => {
      const t = random() * TAU * 1.4, r = 2.8 + t * .64 + (random() - .5) * 1.8;
      return [Math.cos(t) * r + 1, Math.sin(t) * r * .6 + (random() - .5), -15 + Math.cos(t) * 3 + (random() - .5) * 4];
    }, 0x715bb7, 1.1, .22);
  } else {
    const position = [-.8, .35, -7.3];
    planet('Ember star', position, 1.6, 0xd2390e, 0xffd27e, 2);
    mesh(sphere, basic(0x100906), [-.49, .47, -6.06], 1.17).name = 'Eclipsing moon';
    for (let orbit = 0; orbit < 3; orbit++) ring('Coronal filament', position, 1.76 + orbit * .18, .008, 0xff9d4b, [.1, -.15, orbit * .6], .3 - orbit * .06);
    planet('Burnt outer planet', [4.1, 1.45, -11], 2.05, 0x301b15, 0xaa6540);
    const asteroidGeometry = own(new THREE.IcosahedronGeometry(1, 0));
    const asteroidMaterial = basic(0x73513b);
    for (let rock = 0; rock < 14; rock++) {
      const angle = rock / 14 * TAU + .2, r = 3.8 + random() * 2;
      const object = mesh(asteroidGeometry, asteroidMaterial, [Math.cos(angle) * r + .5, Math.sin(angle) * r * .35 - 1.3, -7 + Math.sin(angle) * 4], .08 + random() * .22);
      object.scale.y *= .65; const phase = random() * TAU;
      animated.push(time => { object.rotation.set(phase, phase + time * .04, .3); });
    }
    cloud('Ash belt', 360, () => { const t = random() * TAU, r = 4 + random() * 2; return [Math.cos(t) * r + .5, Math.sin(t) * r * .35 - 1.3 + (random() - .5) * .45, -7 + Math.sin(t) * 4 + (random() - .5) * 2]; }, 0xdc8048, .12, .55);
  }

  function update(time = 0) {
    if (disposed) return;
    const stableTime = Number.isFinite(time) ? time : 0;
    for (const animate of animated) animate(stableTime);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const resource of resources) resource.dispose();
    resources.clear(); animated.length = 0; group.clear();
  }
  update(0);
  return { group, background, preset, update, dispose };
}
