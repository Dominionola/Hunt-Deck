"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

export function FinalCTA() {
  return (
    <section className="relative py-32 sm:py-40 bg-[var(--color-bg-dark)] overflow-hidden">
      
      {/* Dynamic Shader Gradient Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-80">
        <ShaderGradientCanvas pixelDensity={1} fov={45}>
          <ShaderGradient
            animate="on"
            brightness={1.2}
            cAzimuthAngle={180}
            cDistance={3.6}
            cPolarAngle={90}
            cameraZoom={1}
            color1="#081E2B"
            color2="#2bbbe3"
            color3="#e2f5e1"
            envPreset="city"
            grain="on"
            lightType="3d"
            positionX={-1.4}
            positionY={0}
            positionZ={0}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={0.1}
            rotationX={0}
            rotationY={10}
            rotationZ={50}
            shader="defaults"
            type="plane"
            uAmplitude={1}
            uDensity={1.3}
            uFrequency={5.5}
            uSpeed={0.4}
            uStrength={4}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-display font-semibold text-5xl sm:text-6xl text-white mb-6"
        >
          Your next job is closer than you think.
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-white/80 mb-12"
        >
          Start free. No credit card. Cancel anytime.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <Link
            href="/signup"
            className="inline-flex h-14 px-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-[16px] font-semibold hover:shadow-[0_0_0_6px_var(--color-accent-light)] hover:-translate-y-1 transition-all duration-300"
          >
            Start for free &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
