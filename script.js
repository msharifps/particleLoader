//glow effect
let glowEffect = false;
let glowAlpha = 255; // Starting opacity for the glow
let glowSizeIncrement = 10; // The glow will be this much larger than the particle

//confetti
let confettiParticles = [];
let confettiTriggered = false; // Global flag to ensure confetti is only triggered once

let particles = [];
const minSizeAtEdge = 1; // particles closest to outer ring are at smallest size figma said 1 
const maxSizeAtCenter = 13; //closest paticles to inner ring are at bigger size figma said 13
let innerBoundary = 65; // inner ring extension limit
let outerBoundary = 140; // outer ring extension limit
let specialParticleCreated = false; // Flag to ensure only one special particle is created
let converging = false; // Flag to control when particles should start converging
let completeF = false; // Flag to control when particles are completed with converging when this is true you cant create special particles anymore

// Particle Logic

class Particle {
  constructor(angle, distance, isSpecial = false, enlarging = false, shrinking = false, onShrinkComplete = null, targetSize = 80) {
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.angle = angle;
    this.distance = distance;
    this.isSpecial = isSpecial;
    this.enlarging = enlarging;  // New flag for controlling size enlargement
    this.shrinking = shrinking; // new flag for size shrinking
    this.targetSize = targetSize;  // New target size property
    this.removalFlag = false;
    this.onShrinkComplete = onShrinkComplete;
    this.color = isSpecial ? color(255, 0, 0) : color(68, 225, 160); //changes special particle color
    this.size = isSpecial ? 1 : map(pow(this.distance / outerBoundary, 2), 0, 1, maxSizeAtCenter, minSizeAtEdge); // if isSpecial start off at 1px
    this.updateAngularVelocity();
    this.updatePosition();
  }

  updateSize() {
    const scaleFactor = 2;
    // Adjust size mapping based on the new outerBoundary, 
    // size is changed based on distance from outerboundary
    this.size = this.isSpecial ? 80 : map(pow(this.distance / outerBoundary, scaleFactor), 0, 1, maxSizeAtCenter, minSizeAtEdge);
  }

  updateAngularVelocity() {
    // random velocity for each particle also based on distace from the boundaries so it has the cool simultaneous effect
    const velocityScale = map(this.distance, innerBoundary, outerBoundary, 0.005, 0.02);
    this.angularVelocity = random(0.5 * velocityScale, velocityScale);
  }

  updatePosition() {
    //when you need to update particle position
    this.x = this.centerX + this.distance * cos(this.angle);
    this.y = this.centerY + this.distance * sin(this.angle);
  }

  update() {
    //enlarging special particle slowly
    if (this.enlarging && this.size < this.targetSize) { 
      this.size += 0.5; //speed at its enlargement until it hits targetSize
      if (this.size >= this.targetSize) {
        this.enlarging = false;
      }
    }
    // the shrinking of special particles
    if (this.shrinking) {
      this.size -= 0.5; //speed at its shrinking until it hits 0 and dissapears
      if (this.size <= 0) {
        this.size = 0;
        this.shrinking = false;
        this.removalFlag = true;
        if (this.onShrinkComplete) {
          this.onShrinkComplete(); // Call the callback when done shrinking
        }
      }
    }

    this.angle += this.angularVelocity;
    if (this.angle > TWO_PI) {
      this.angle -= TWO_PI;
    }
    this.updatePosition();

    for (let other of particles) {
      if (other !== this && this.isColliding(other)) {
        this.resolveCollision(other);
      }
    }
  }

  //collision logic

  isColliding(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let distance = sqrt(dx * dx + dy * dy);
    let minDistance = (this.size / 2 + other.size / 2) * 1.1;
    return distance < minDistance;
  }

  resolveCollision(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let distance = sqrt(dx * dx + dy * dy);
    let minDistance = (this.size / 2 + other.size / 2) * 1.1;
    let overlap = minDistance - distance;
    let angleOfSeparation = atan2(dy, dx);
    let adjustment = overlap / 2;
    this.x += cos(angleOfSeparation) * adjustment;
    this.y += sin(angleOfSeparation) * adjustment;
    other.x -= cos(angleOfSeparation) * adjustment;
    other.y -= sin(angleOfSeparation) * adjustment;
  }

  render() {
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.size, this.size);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255);
  initParticles();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initParticles();
}

function initParticles() {
  particles = [];
  const desiredParticleCount = 250; //amount of particles wanted
  let attempts = 0;
  let maxAttempts = 500; //stop infinite loop

  while (particles.length < desiredParticleCount && attempts < maxAttempts) {
    let angle = random(TWO_PI);
    let distance = random(innerBoundary, outerBoundary);
    let validPlacement = true;
    let candidate = new Particle(angle, distance);

    for (let other of particles) {
      let d = dist(candidate.x, candidate.y, other.x, other.y);
      if (d < (candidate.size / 2 + other.size / 2) * 1.1) {
        validPlacement = false;
        break;
      }
    }

    if (validPlacement) {
      particles.push(candidate);
    } else {
      attempts++;
    }
  }
}

// special paticles

function spawnSpecialParticle() {
  if (!specialParticleCreated && completeF == false) {
    let boundaryIncrease = 10; // increase boundary room
    outerBoundary += boundaryIncrease; //increase outerboundary

    particles.forEach(particle => {
      let distanceFromCenter = dist(particle.x, particle.y, width / 2, height / 2);
      let newDistance = map(distanceFromCenter, 0, outerBoundary - boundaryIncrease, 0, outerBoundary);
      particle.distance = constrain(newDistance, innerBoundary, outerBoundary);
      particle.updateSize();
      particle.updateAngularVelocity();
      particle.updatePosition();
    });

    let angle = random(TWO_PI);
    let distance = innerBoundary + (boundaryIncrease / 2);
    let specialParticle = new Particle(angle, distance, true, true);
    particles.push(specialParticle);
    specialParticleCreated = true;
  }
}


function deleteSpecialParticle() { //delete special particle function
  if (specialParticleCreated) {
    const specialParticle = particles.find(p => p.isSpecial);
    if (specialParticle) {
      specialParticle.shrinking = true;
      specialParticle.targetSize = 0;
      // Ensure the onShrinkComplete callback updates the flag when the particle is gone
      specialParticle.onShrinkComplete = () => {
        specialParticleCreated = false; // Now allow the creation of a new special particle
      };
    }
  }
}

// confetti particles

class Confetti {
  constructor(x, y, angle, spread) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.spread = spread;
    this.size = random(5, 10);
    // Determine the confetti's color based on its angle
    this.color = lerpColor(color('#44E1A0'), color('#298961'), this.angle / TWO_PI);
    let speed = random(1, 6); // Random speed for each particle
    this.velocityX = cos(this.angle) * speed;
    this.velocityY = sin(this.angle) * speed;
    this.gravity = 0.05; // Smaller gravity for a more 'floaty' effect
  }


  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
    this.velocityY += this.gravity;
    this.size *= 0.99; // Slowly shrink
  }

  render() {
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.size, this.size);
  }

  isOffScreen() {
    return this.y > height + this.size; // Remove when it falls off the screen
  }
}


// convergence logic


function startConvergence() {
  converging = true;
}

function complete() {
  if (specialParticleCreated) { // if we have a special particle fist delete it
    const specialParticle = particles.find(p => p.isSpecial); // find special particle in array
    if (specialParticle) { // if found
      specialParticle.shrinking = true; //start shrinking till size 0
      specialParticle.targetSize = 0;
      // Set the callback to start convergence after the particle shrinks
      specialParticle.onShrinkComplete = () => { // once onShrink has completed (call back function) call startConvergence
        startConvergence();
      };
    }
    specialParticleCreated = false;
  } else { // no special particle 
    startConvergence(); 
  }
}


function convergeParticles() {  // converge particles
  let allAtCenter = true;

  particles.forEach(particle => {
    if (particle.distance > 1) {
      const convergenceFactor = 0.05 + 0.25 * (1 - particle.distance / outerBoundary);
      particle.distance -= particle.distance * convergenceFactor;
      allAtCenter = false;
    } else {
      particle.distance = 0;
    }
    particle.updatePosition();
  });

  if (allAtCenter) { 
    if (particles.length > 1 || particles[0].size !== 64) {
      particles = [new Particle(0, 0)];
      particles[0].size = 64;
      particles[0].color = color(41, 137, 97); // turning the biggest particle into this color if you want to change
    }
    converging = false;
  }

  completeF = true;
}
// draw functionality

function draw() {
  background(0);

  // Update and render all particles
  particles.forEach(particle => {
    particle.update();
    particle.render();
  });

  // Remove particles that are marked for removal
  particles = particles.filter(particle => !particle.removalFlag);

  if (converging) {
    convergeParticles();
  }

  // Check if the final particle has formed the checkmark
  if (particles.length === 1 && particles[0].size === 64) {
    let p = particles[0];
    
    // Draw the glow effect with decreasing opacity
    if (glowEffect) {
      let glowSize = p.size + glowSizeIncrement; // Glow is 10 pixels larger than the particle
      fill(41, 137, 97, glowAlpha); // Use the updated glowAlpha for opacity
      noStroke();
      ellipse(p.x, p.y, glowSize, glowSize); // Draw the glowing ellipse
      glowAlpha -= 5; // Decrease the opacity to create the fade effect
      if (glowAlpha <= 0) {
        glowEffect = false; // Once opacity reaches zero, the glow effect ends
        glowAlpha = 255; // Reset the glow alpha for the next time
      }
    }
    
    drawCheckmark(p.x, p.y, 30);
    
    // Trigger the confetti and glow effect once when the checkmark is drawn
    if (!confettiTriggered) {
      triggerConfetti(p.x, p.y);
      confettiTriggered = true;
      glowEffect = true; // Start the glow effect
      glowAlpha = 255; // Reset the glow alpha to full opacity
    }
  }

  // Update and render confetti particles
  confettiParticles.forEach(particle => {
    particle.update();
    particle.render();
  });

  // Filter out confetti particles that have gone off-screen
  confettiParticles = confettiParticles.filter(particle => !particle.isOffScreen());
}


function drawCheckmark(x, y, size) { // draw checkmark
  stroke(255);
  strokeWeight(4);
  noFill();
  let halfSize = size / 2;
  beginShape();
  vertex(x - halfSize / 2 - 4, y + 5);
  vertex(x - 4, y + halfSize / 2 + 5);
  vertex(x + halfSize - 5, y - halfSize);
  endShape();
}

function triggerConfetti(x, y, spread) {
  let confettiCount = 100; // Increase the count for a more impressive spray
  for (let i = 0; i < confettiCount; i++) {
    let angle = random(TWO_PI); // Random angle for uniform spreading
    confettiParticles.push(new Confetti(x, y, angle, spread));
  }
}

