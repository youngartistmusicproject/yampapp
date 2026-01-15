import confetti from 'canvas-confetti';

// Standard task completion confetti
export const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24', '#f59e0b'],
  });
};

// Confetti from a specific element
export const triggerConfettiFromElement = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { x, y },
    colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fbbf24', '#f59e0b'],
  });
};

// Epic celebration for completing all tasks for the day
export const triggerDayCompleteConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#8b5cf6', '#ec4899'];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();

  // Add a big burst in the center
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors,
    });
  }, 500);
};

// Fireworks effect for clearing all overdue tasks
export const triggerOverdueClearedConfetti = () => {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#f97316', '#fb923c', '#fbbf24', '#facc15', '#ef4444'],
  };

  const shoot = () => {
    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ['star'],
    });

    confetti({
      ...defaults,
      particleCount: 20,
      scalar: 0.75,
      shapes: ['circle'],
    });
  };

  setTimeout(shoot, 0);
  setTimeout(shoot, 200);
  setTimeout(shoot, 400);
};

// Subtle sparkle for streak achievements
export const triggerStreakConfetti = (streakCount: number) => {
  const intensity = Math.min(streakCount * 20, 150);
  
  confetti({
    particleCount: intensity,
    spread: 80,
    origin: { y: 0.7 },
    colors: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7'],
    shapes: ['star'],
    scalar: 1.2,
  });
};
