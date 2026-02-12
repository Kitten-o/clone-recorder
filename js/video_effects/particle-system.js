// particle-system.js - Smoke Particle Effects

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 50;
    }

    /**
     * Emit smoke particles at a position
     */
    emit(x, y, count = 10, type = 'spawn') {
        for (let i = 0; i < count; i++) {
            const particle = {
                x,
                y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2 - 1, // Upward bias
                size: Math.random() * 30 + 20,
                opacity: 1,
                life: 1,
                maxLife: Math.random() * 0.8 + 0.5,
                color: type === 'spawn' ? 'rgba(255,255,255' : 'rgba(200,200,200',
                delay: i * 20 // Staggered emission
            };

            this.particles.push(particle);
        }

        // Limit particle count
        if (this.particles.length > this.maxParticles) {
            this.particles = this.particles.slice(-this.maxParticles);
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

            // Update velocity (slow down and drift up)
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.vy -= 0.02; // Gravity upward

            // Update life and opacity
            p.life -= dt / p.maxLife;
            p.opacity = Math.max(0, p.life);

            // Expand size
            p.size += 0.5;

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
