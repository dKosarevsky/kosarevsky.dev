import * as THREE from 'three';

export function createSpace() {
  const group = new THREE.Group();
  let seed = 7614;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const positions = [], colors = [];
  for (let i = 0; i < 1050; i++) {
    positions.push((random() - .5) * 22, (random() - .5) * 15, -3 - random() * 11);
    const light = .12 + random() * .65;
    const warm = random() > .88;
    colors.push(light * (warm ? 1 : .72), light * (warm ? .83 : .9), light * (warm ? .62 : 1));
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size: .027, vertexColors: true, transparent: true, opacity: .8, depthWrite: false }));
  group.add(stars);

  const orbits = new THREE.Group();
  for (let layer = 0; layer < 3; layer++) {
    const points = [];
    for (let i = 0; i <= 160; i++) {
      const angle = i / 160 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * (2.12 + layer * .16), Math.sin(angle) * (2.12 + layer * .16), 0));
    }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: layer === 1 ? 0x96b4c8 : 0x789967, transparent: true, opacity: layer === 1 ? .14 : .075 }));
    line.rotation.set(1.05 + layer * .17, -.3 + layer * .3, -.35);
    orbits.add(line);
  }
  // A few precise spatial lines are enough to give the void a coordinate system.
  const lattice = [];
  for (let i = -4; i <= 4; i++) {
    lattice.push(-5, -1.95, i * .9, 5, -1.95, i * .9);
    lattice.push(i * .9, -1.95, -4, i * .9, -1.95, 4);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lattice, 3));
  const grid = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: 0x5f8667, transparent: true, opacity: .04 }));
  group.add(orbits, grid);
  return { group, update(time) { stars.rotation.z = time * .001; orbits.rotation.y = Math.sin(time * .08) * .035; } };
}

export function createPortal({ radius = .62, color = 0xc8ff64 } = {}) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPower: { value: .3 }, uTransfer: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPower;
      uniform float uTransfer;
      uniform vec3 uColor;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float bell(float x){return exp(-x*x);}
      void main(){
        vec2 p=(vUv-.5)*2.;
        float r=length(p), a=atan(p.y,p.x);
        float horizon=.55;
        float outside=smoothstep(horizon-.01,horizon+.015,r);
        float beam=pow(.5+.5*cos(a+.65),3.);
        float grain=.72+.28*sin(a*17.+uTime*.65+sin(a*3.)*1.5);
        float ring=bell((r-.65)/( .0085+.0015*sin(a*5.)));
        float photon=ring*(.8+beam*2.1)*grain;
        float secondary=bell((r-.686)*190.)*(.08+.22*beam);
        float halo=bell((r-.66)*18.)*.14;

        // A tilted, thin disk is occluded by the aperture. Its beaming is illustrative.
        vec2 q=mat2(.978,-.208,.208,.978)*p;
        float elliptical=length(vec2(q.x,q.y*3.65));
        float diskAngle=atan(q.y*3.65,q.x);
        float lanes=bell((elliptical-.78)*56.)+.48*bell((elliptical-.876)*90.);
        float diskBeam=.25+.75*pow(.5+.5*cos(diskAngle+.3),2.);
        float streaks=.72+.28*sin(elliptical*185.+diskAngle*5.-uTime*1.3);
        float accretion=lanes*diskBeam*streaks*outside*.7;
        float ripple=bell((r-(.67+uTransfer*.14))*85.)*uTransfer*.7;
        vec3 tint=mix(uColor,vec3(.7,.9,1.),beam*.55);
        vec3 light=tint*(photon+secondary+halo+ripple)*(.85+uPower*.9);
        light+=mix(uColor,vec3(.79,.9,1.),.18)*accretion;

        // The lens is a small sky patch, with radial star streaks close to the rim.
        vec2 bent=p*(1.+.042/max(.045,abs(r-horizon)));
        vec2 sky=bent*37.;
        vec2 cell=floor(sky);
        vec2 local=fract(sky)-(.15+.7*vec2(hash(cell+17.),hash(cell+43.)));
        vec2 radial=normalize(p+vec2(.0001));
        float along=dot(local,radial), across=dot(local,vec2(-radial.y,radial.x));
        float star=step(.992,hash(cell))*(exp(-along*along*18.-across*across*120.)+.16*exp(-along*along*5.-across*across*34.));
        star*=outside*(1.-smoothstep(.8,.98,r));
        light+=vec3(.6,.8,1.)*star*.8;
        float aperture=1.-smoothstep(horizon-.015,horizon,r);
        light=mix(light,vec3(.0008,.0015,.002),aperture);
        float alpha=max(aperture,clamp(photon+secondary+halo*2.+accretion+ripple+star*.5,0.,1.));
        alpha*=1.-smoothstep(.9,1.,r);
        gl_FragColor=vec4(light,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 3.05, radius * 3.05), material);
  // Transparent glow pixels must not turn adjacent shell fragments into core targets.
  const localPoint = new THREE.Vector3();
  mesh.raycast = function (raycaster, intersections) {
    const hits = [];
    THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
    for (const hit of hits) {
      this.worldToLocal(localPoint.copy(hit.point));
      if (Math.hypot(localPoint.x, localPoint.y) <= radius) intersections.push(hit);
    }
  };
  const group = new THREE.Group();
  group.add(mesh);
  return { group, mesh, update(time, power, transfer = 0) { material.uniforms.uTime.value = time; material.uniforms.uPower.value = power; material.uniforms.uTransfer.value = transfer; } };
}

export function disposeTree(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  });
  textures.forEach(texture => texture.dispose());
}
