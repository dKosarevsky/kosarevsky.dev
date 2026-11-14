import * as THREE from 'three';
import { createUniverse, UNIVERSES } from './universes.js';

/** Map the viewer into another coordinate system without changing its rays. */
export function mapPortalCamera(source, mapping, target) {
  target.matrixWorld.multiplyMatrices(mapping, source.matrixWorld);
  target.matrixWorld.decompose(target.position, target.quaternion, target.scale);
  target.updateMatrixWorld(true);
  target.near = source.near;
  target.far = source.far;
  target.aspect = source.aspect;
  target.fov = source.fov;
  // Copy the actual projection, including any asymmetric framing.
  target.projectionMatrix.copy(source.projectionMatrix);
  target.projectionMatrixInverse.copy(source.projectionMatrixInverse);
  return target;
}

/** The same persistent world is used inside the mouth and after arrival. */
export function createUniverseView(renderer) {
  const worlds = UNIVERSES.map((_, index) => {
    const world = createUniverse(index);
    const scene = new THREE.Scene();
    scene.name = world.group.name;
    scene.background = world.background;
    scene.add(world.group);
    return { ...world, scene };
  });
  const type = renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const targetOptions = { type, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true };
  const currentTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const destinationTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const currentCamera = new THREE.PerspectiveCamera();
  const destinationCamera = new THREE.PerspectiveCamera();
  const currentMapping = new THREE.Matrix4();
  const destinationMapping = new THREE.Matrix4();
  const arrivalGlide = new THREE.Matrix4();
  const outputResolution = new THREE.Vector2(1, 1);
  let currentIndex = 0, disposed = false;

  const compositeScene = new THREE.Scene();
  const compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const compositeGeometry = new THREE.PlaneGeometry(2, 2);
  const compositeMaterial = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    premultipliedAlpha: true,
    uniforms: {
      uCurrent: { value: currentTarget.texture },
      uDestination: { value: destinationTarget.texture },
      uReveal: { value: 0 },
      uCenter: { value: new THREE.Vector2(.5, .5) },
      uAspect: { value: 1 },
    },
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uCurrent,uDestination;
      uniform float uReveal,uAspect;
      uniform vec2 uCenter;
      void main(){
        vec2 offset=(vUv-uCenter)*vec2(uAspect,1.);
        vec2 corner=max(uCenter,1.-uCenter)*vec2(uAspect,1.);
        float radius=length(corner)*uReveal;
        float reveal=1.-smoothstep(radius-.035,radius+.035,length(offset));
        if(uReveal<=0.)reveal=0.;
        if(uReveal>=1.)reveal=1.;
        vec3 color=mix(texture2D(uCurrent,vUv).rgb,texture2D(uDestination,vUv).rgb,reveal);
        vec2 edge=abs(vUv-.5)*2.;
        float alpha=(1.-smoothstep(.76,1.,edge.x))*(1.-smoothstep(.76,1.,edge.y));
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <premultiplied_alpha_fragment>
      }`,
  });
  const composite = new THREE.Mesh(compositeGeometry, compositeMaterial);
  composite.frustumCulled = false;
  compositeScene.add(composite);

  function resize() {
    if (disposed) return;
    renderer.getDrawingBufferSize(outputResolution);
    outputResolution.x = Math.max(1, outputResolution.x);
    outputResolution.y = Math.max(1, outputResolution.y);
    const scale = Math.min(1, 960 / Math.max(outputResolution.x, outputResolution.y));
    const width = Math.max(1, Math.round(outputResolution.x * scale));
    const height = Math.max(1, Math.round(outputResolution.y * scale));
    currentTarget.setSize(width, height);
    destinationTarget.setSize(width, height);
    compositeMaterial.uniforms.uAspect.value = outputResolution.x / outputResolution.y;
  }

  function update({ camera, entranceMatrix, time = 0, travel = 0 }) {
    if (disposed) return;
    camera.updateMatrixWorld(true);
    // Destination mouth faces -Z, cancelling the usual portal half-turn.
    destinationMapping.copy(entranceMatrix).invert();
    // Move into the visible world as it opens, bringing its landmark beside the shell.
    const glide = THREE.MathUtils.clamp(travel, 0, 1);
    arrivalGlide.makeTranslation(3.6 * glide, -.35 * glide, -.8 * glide);
    destinationMapping.premultiply(arrivalGlide);
    mapPortalCamera(camera, currentMapping, currentCamera);
    mapPortalCamera(camera, destinationMapping, destinationCamera);
    worlds[currentIndex].update(time);
    worlds[(currentIndex + 1) % worlds.length].update(time);
  }

  function commit(index) {
    if (disposed || index === currentIndex) return false;
    if (index !== (currentIndex + 1) % worlds.length) {
      throw new RangeError('Only the next destination universe can be committed.');
    }
    currentMapping.copy(destinationMapping);
    currentCamera.copy(destinationCamera);
    currentIndex = index;
    return true;
  }

  function render({ artifactScene, camera, reveal = 0, center = { x: .5, y: .5 } }) {
    if (disposed) return;
    const savedTarget = renderer.getRenderTarget();
    const savedColor = renderer.getClearColor(new THREE.Color());
    const savedAlpha = renderer.getClearAlpha();
    const savedViewport = renderer.getViewport(new THREE.Vector4());
    const savedScissor = renderer.getScissor(new THREE.Vector4());
    const savedScissorTest = renderer.getScissorTest();
    const savedAutoClear = renderer.autoClear;
    try {
      renderer.autoClear = true;
      renderer.setScissorTest(false);
      renderer.setRenderTarget(currentTarget);
      renderer.render(worlds[currentIndex].scene, currentCamera);
      renderer.setRenderTarget(destinationTarget);
      renderer.render(worlds[(currentIndex + 1) % worlds.length].scene, destinationCamera);

      renderer.setRenderTarget(null);
      // setViewport() uses CSS pixels for the default framebuffer.
      const ratio = renderer.getPixelRatio();
      renderer.setViewport(0, 0, outputResolution.x / ratio, outputResolution.y / ratio);
      renderer.setScissorTest(false);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.autoClear = false;
      compositeMaterial.uniforms.uReveal.value = THREE.MathUtils.clamp(reveal, 0, 1);
      // Input follows DOM coordinates; render-target texture coordinates start below.
      compositeMaterial.uniforms.uCenter.value.set(THREE.MathUtils.clamp(center.x, 0, 1), 1 - THREE.MathUtils.clamp(center.y, 0, 1));
      renderer.render(compositeScene, compositeCamera);
      renderer.clearDepth();
      renderer.render(artifactScene, camera);
    } finally {
      renderer.setRenderTarget(savedTarget);
      renderer.setClearColor(savedColor, savedAlpha);
      renderer.setViewport(savedViewport);
      renderer.setScissor(savedScissor);
      renderer.setScissorTest(savedScissorTest);
      renderer.autoClear = savedAutoClear;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    currentTarget.dispose();
    destinationTarget.dispose();
    compositeGeometry.dispose();
    compositeMaterial.dispose();
    for (const world of worlds) world.dispose();
    compositeScene.clear();
  }

  resize();
  return {
    get texture() { return destinationTarget.texture; },
    outputResolution,
    get currentIndex() { return currentIndex; },
    get currentPreset() { return UNIVERSES[currentIndex]; },
    get destinationPreset() { return UNIVERSES[(currentIndex + 1) % worlds.length]; },
    resize, update, commit, render, dispose,
  };
}
