"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const N = 900;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.03, color: 0x8b5cf6, transparent: true, opacity: 0.85 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf = 0;
    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => { mx = (e.clientX / innerWidth - 0.5); my = (e.clientY / innerHeight - 0.5); };
    addEventListener("mousemove", onMove);
    const loop = () => {
      points.rotation.y += 0.0009;
      points.rotation.x += 0.0004;
      camera.position.x += (mx * 1.5 - camera.position.x) * 0.03;
      camera.position.y += (-my * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener("mousemove", onMove); removeEventListener("resize", onResize); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);
  return <div ref={ref} className="fixed inset-0 z-0" />;
}
