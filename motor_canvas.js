const canvas = document.getElementById('batCanvas');
const ctx = canvas.getContext('2d');

// 1. RASTREO DEL RATÓN
let mouse = { x: -1000, y: -1000 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseout', () => {
    mouse.x = -1000;
    mouse.y = -1000;
});

// 2. DECLARAMOS EL ARREGLO Y LA CLASE PRIMERO
const nodes = [];

class EnergyNode {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = Math.random() * 2 + 1;
        this.color = Math.random() > 0.3 ? '#8b5cf6' : '#06d6a0'; // Violet and Cyan
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// 3. LA FUNCIÓN RESIZE CORREGIDA (Usa nodes y EnergyNode)
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Recalculamos cuántos nodos necesitamos
    const newNodeCount = Math.floor((window.innerWidth * window.innerHeight) / 9000);

    if (newNodeCount > nodes.length) {
        // Si la pantalla creció, inyectamos más nodos de energía
        for (let i = nodes.length; i < newNodeCount; i++) {
            nodes.push(new EnergyNode());
        }
    } else if (newNodeCount < nodes.length) {
        // Si la pantalla se achicó, eliminamos los que sobran
        nodes.splice(newNodeCount);
    }
}

// Inicializamos el evento y llamamos a resize por primera vez 
// (Esto creará automáticamente los nodos iniciales)
window.addEventListener('resize', resize);
resize();

// 4. BUCLE DE RENDERIZADO PRINCIPAL (60 FPS)
function animate() {
    ctx.fillStyle = '#0a0a12'; // Base oscura premium
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    nodes.forEach(node => {
        node.update();
        node.draw();
    });

    for (let i = 0; i < nodes.length; i++) {
        // A) CONEXIÓN PASIVA (Entre Nodos)
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 120) {
                ctx.beginPath();
                const opacity = 1 - (distance / 120);
                ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.4})`; // Violet
                ctx.lineWidth = 0.8;
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.stroke();
            }
        }

        // B) CONEXIÓN ACTIVA (Con el Ratón)
        const dxMouse = nodes[i].x - mouse.x;
        const dyMouse = nodes[i].y - mouse.y;
        const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distanceMouse < 180) {
            ctx.beginPath();
            const intensity = 1 - (distanceMouse / 180);
            ctx.strokeStyle = `rgba(6, 214, 160, ${intensity})`; // Cyan
            ctx.lineWidth = intensity * 2.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#06d6a0'; // Cyan
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    requestAnimationFrame(animate);
}

// Encender el sistema
animate();