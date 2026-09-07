// Lightweight three.js hero scene: floating "card" planes with gentle drift + mouse parallax.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const heroSection = document.getElementById('hero');
  let width = heroSection.clientWidth;
  let height = heroSection.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  // Palette pulled from the site's design tokens
  const colors = [0xc9a15a, 0xe7adb6, 0x8a9a6e, 0xf6f1e7];

  const group = new THREE.Group();
  scene.add(group);

  const cardGeo = new THREE.PlaneGeometry(2.1, 2.9);
  const cards = [];
  const cardCount = 9;

  for (let i = 0; i < cardCount; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.13 + Math.random() * 0.1,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(cardGeo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10 - 4
    );
    mesh.rotation.set(
      Math.random() * 0.6 - 0.3,
      Math.random() * 0.9 - 0.45,
      Math.random() * 0.5 - 0.25
    );
    const scale = 0.6 + Math.random() * 0.9;
    mesh.scale.set(scale, scale, scale);
    mesh.userData = {
      speed: 0.08 + Math.random() * 0.12,
      offset: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 0.4,
      baseY: mesh.position.y,
    };
    group.add(mesh);
    cards.push(mesh);
  }

  // subtle outline ring (envelope motif)
  const ringGeo = new THREE.TorusGeometry(4.6, 0.015, 8, 90);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xc9a15a, transparent: true, opacity: 0.18 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(3.5, -0.5, -6);
  ring.rotation.x = Math.PI / 2.4;
  scene.add(ring);

  let mouseX = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const clock = new THREE.Clock();
  let raf = null;

  function animate() {
    raf = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    cards.forEach((mesh) => {
      const d = mesh.userData;
      mesh.position.y = d.baseY + Math.sin(t * d.speed * 4 + d.offset) * 0.6;
      mesh.position.x += Math.sin(t * 0.1 + d.offset) * 0.0009;
      mesh.rotation.z += 0.0006;
      mesh.rotation.y += 0.0004;
    });

    ring.rotation.z = t * 0.05;

    targetRotY += (mouseX * 0.25 - targetRotY) * 0.03;
    targetRotX += (mouseY * 0.15 - targetRotX) * 0.03;
    group.rotation.y = targetRotY;
    group.rotation.x = -targetRotX;

    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    width = heroSection.clientWidth;
    height = heroSection.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  // Pause rendering when hero is off-screen (perf)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!raf) animate();
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { threshold: 0.05 });
    io.observe(heroSection);
  }
})();
