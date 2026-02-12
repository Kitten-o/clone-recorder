// particle-system.js - Smoke Particle Effects

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 50;
    }

    /**
     * Emit smoke particles at a position
     */
    emit(x, y, count = 30, type = 'spawn') {
        // Increase particle count for "puff" effect
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;

            const particle = {
                x,
                y: type === 'spawn' ? y + 100 : y - 100, // Start from bottom for spawn, top for dismiss
                vx: Math.cos(angle) * speed,
                vy: type === 'spawn' ? -Math.random() * 5 - 2 : Math.random() * 5 + 2, // Upward for spawn, downward for dismiss
                size: Math.random() * 40 + 40,
                opacity: 0.8,
                life: 1.0,
                maxLife: Math.random() * 0.5 + 0.5,
                color: 'rgba(255,255,255',
                delay: Math.random() * 200,
                type: type
            };

            this.particles.push(particle);
        }

        // Limit particle count
        if (this.particles.length > 200) {
            this.particles = this.particles.slice(-200);
        }
    }

    /**
     * Update all particles
     */
    update(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds

        this.particles = this.particles.filter(p => {
            // Handle delay
            if (p.delay > 0) {
                p.delay -= deltaTime;
                return true;
            }

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Update velocity (friction)
            p.vx *= 0.95;
            p.vy *= 0.95;

            // Rising/falling bias
            if (p.type === 'spawn') {
                p.vy -= 0.1;
            } else {
                p.vy += 0.1;
            }

            // Update life and opacity
            p.life -= dt / p.maxLife;
            p.opacity = Math.max(0, p.life);

            // Expand size for "billowing" effect
            p.size += 2.0;

            // Remove dead particles
            return p.life > 0;
        });
    }

    /**
     * Render particles to canvas
     */
    render(ctx) {
        this.particles.forEach(p => {
            if (p.delay > 0) return; // Don't render delayed particles

            ctx.save();
            ctx.globalAlpha = p.opacity * 0.6;

            // Create radial gradient for smoke effect
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `${p.color},${p.opacity * 0.8})`);
            gradient.addColorStop(0.5, `${p.color},${p.opacity * 0.4})`);
            gradient.addColorStop(1, `${p.color},0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    /**
     * Check if particles are active
     */
    hasActiveParticles() {
        return this.particles.length > 0;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }
}
