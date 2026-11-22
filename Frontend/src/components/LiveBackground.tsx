'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    r: number;         // radius
    vx: number;        // velocity x
    vy: number;        // velocity y
    alpha: number;
    alphaDir: number;  // fading direction
    color: string;
    pulse: number;     // pulse phase
}

interface Cloud {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    alpha: number;
}

interface LightBeam {
    x: number;
    width: number;
    alpha: number;
    speed: number;
    phase: number;
}

export default function LiveBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef    = useRef<number>(0);
    const timeRef   = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // --- resize handling ---
        let W = 0, H = 0;
        const resize = () => {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // --- spawn particles (fireflies / dust / stars) ---
        const PARTICLE_COUNT = 120;
        const particles: Particle[] = [];

        const COLORS = [
            'rgba(39,232,124,',   // alpine green
            'rgba(255,255,255,',  // star white
            'rgba(245,166,35,',   // amber summit
            'rgba(100,220,160,',  // soft mint
        ];

        const spawnParticle = (full?: boolean): Particle => ({
            x: Math.random() * W,
            y: full ? Math.random() * H : -10,
            r: Math.random() * 2.2 + 0.4,
            vx: (Math.random() - 0.5) * 0.35,
            vy: Math.random() * 0.4 + 0.08,
            alpha: Math.random() * 0.6 + 0.2,
            alphaDir: Math.random() > 0.5 ? 1 : -1,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            pulse: Math.random() * Math.PI * 2,
        });

        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawnParticle(true));

        // --- mist cloud layers ---
        const CLOUD_COUNT = 6;
        const clouds: Cloud[] = Array.from({ length: CLOUD_COUNT }, (_, i) => ({
            x: Math.random() * W,
            y: (H * 0.45) + (i / CLOUD_COUNT) * (H * 0.55),
            w: Math.random() * 400 + 250,
            h: Math.random() * 80 + 40,
            vx: (Math.random() - 0.5) * 0.25,
            alpha: Math.random() * 0.06 + 0.03,
        }));

        // --- light beams (from above like mountain sunrays) ---
        const BEAM_COUNT = 5;
        const beams: LightBeam[] = Array.from({ length: BEAM_COUNT }, (_, i) => ({
            x: (W / (BEAM_COUNT + 1)) * (i + 1) + (Math.random() - 0.5) * 200,
            width: Math.random() * 120 + 60,
            alpha: Math.random() * 0.04 + 0.02,
            speed: Math.random() * 0.0005 + 0.0003,
            phase: Math.random() * Math.PI * 2,
        }));

        // --- aurora wave parameters ---
        const auroraWaves = [
            { yBase: 0.28, amp: 40, freq: 0.0015, speed: 0.0008, color: 'rgba(39,232,124,',  phase: Math.random() * Math.PI * 2 },
            { yBase: 0.22, amp: 30, freq: 0.002,  speed: 0.0012, color: 'rgba(100,220,160,', phase: Math.random() * Math.PI * 2 },
            { yBase: 0.35, amp: 50, freq: 0.001,  speed: 0.0006, color: 'rgba(245,166,35,',  phase: Math.random() * Math.PI * 2 },
        ];

        // ========== DRAW LOOP ==========
        const draw = (ts: number) => {
            const dt = ts - timeRef.current;
            timeRef.current = ts;
            ctx.clearRect(0, 0, W, H);

            // === 1. AURORA CURTAIN ===
            for (const wave of auroraWaves) {
                ctx.beginPath();
                const waveAlpha = 0.03 + 0.015 * Math.sin(ts * wave.speed + wave.phase);
                const grad = ctx.createLinearGradient(0, 0, 0, H * wave.yBase + wave.amp * 2);
                grad.addColorStop(0, wave.color + '0)');
                grad.addColorStop(0.4, wave.color + waveAlpha.toFixed(3) + ')');
                grad.addColorStop(1, wave.color + '0)');
                ctx.fillStyle = grad;

                ctx.moveTo(0, H);
                for (let x = 0; x <= W; x += 6) {
                    const y = H * wave.yBase
                        + Math.sin(x * wave.freq + ts * wave.speed) * wave.amp
                        + Math.sin(x * wave.freq * 0.5 + ts * wave.speed * 1.3 + 1) * (wave.amp * 0.4);
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(W, H);
                ctx.closePath();
                ctx.fill();
            }

            // === 2. LIGHT BEAMS (god rays from peak) ===
            for (const beam of beams) {
                beam.phase = (beam.phase + beam.speed * dt) % (Math.PI * 2);
                const alpha = beam.alpha + 0.015 * Math.sin(beam.phase);
                const grad = ctx.createLinearGradient(0, 0, 0, H * 0.7);
                grad.addColorStop(0, `rgba(39,232,124,${alpha.toFixed(3)})`);
                grad.addColorStop(1, 'rgba(39,232,124,0)');
                ctx.save();
                ctx.translate(beam.x, 0);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-beam.width / 2, 0);
                ctx.lineTo( beam.width / 2, 0);
                ctx.lineTo( beam.width * 1.8, H * 0.75);
                ctx.lineTo(-beam.width * 1.8, H * 0.75);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // === 3. MIST CLOUDS ===
            for (const c of clouds) {
                c.x += c.vx;
                if (c.x - c.w > W) c.x = -c.w;
                if (c.x + c.w < 0) c.x = W + c.w;

                const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w / 2);
                grad.addColorStop(0, `rgba(180,240,200,${c.alpha})`);
                grad.addColorStop(1, 'rgba(180,240,200,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // === 4. PARTICLES (fireflies / drifting dust) ===
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];

                // drift
                p.x += p.vx + Math.sin(ts * 0.0005 + p.pulse) * 0.15;
                p.y += p.vy;

                // pulse alpha
                p.pulse += 0.02;
                const flickerAlpha = p.alpha + 0.15 * Math.sin(p.pulse);
                const clampedAlpha = Math.max(0, Math.min(1, flickerAlpha));

                // draw glow + core
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
                glow.addColorStop(0, `${p.color}${clampedAlpha.toFixed(2)})`);
                glow.addColorStop(1, `${p.color}0)`);
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
                ctx.fill();

                // bright core
                ctx.fillStyle = `${p.color}${Math.min(1, clampedAlpha + 0.3).toFixed(2)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();

                // recycle when off screen
                if (p.y > H + 20 || p.x < -20 || p.x > W + 20) {
                    particles[i] = spawnParticle(false);
                }
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 3,           // above hero-image-layer, below hero-content (z-index 10)
                opacity: 1,
            }}
        />
    );
}
