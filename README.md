FruitNinja Mass-Spring Physical Simulation

Names: Ishika Aggarwal and Venkata Phani (Sri) Kesiraju

Both Ishika Aggarwal and Venkata Phani (Sri) Kesiraju completed the course evaluation.

This project is a simulation that demonstrates a mass-spring physical system and peridynamics-style fracture. It is implemented as a web-based "Fruit Ninja" game that is built from scratch using TypeScript and the HTML5 Canvas API.

The codebase includes:
* A custom physics engine (`src/physics/`) that handles soft-body dynamics using Hooke's Law approximations and Verlet integration.
* A fracture system (`src/fruit/Fruit.ts`) that simulates slicing by detecting line-segment intersections and destroying bonds (springs) across the swipe path, causing the body to split.
* A complete game state machine (`src/game/Game.ts`) that manages fruit spawning arcs, physics updates, interactive powerups, and visual graphics such as procedural wood background, juice particles, and blade trails.

How to Compile and Run:
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.
1. Open your terminal and navigate to the root directory of this project (the folder containing `package.json`).
2. Install the necessary build tools and dependencies by running: npm install
3. Start the local development server by running: npm run dev
Open your web browser and navigate to the local URL provided in the terminal output (typically http://localhost:5173).
How to play: Click or tap the start screen to begin. Click and drag (swipe) your mouse across the fruits to slice them and trigger the fracture simulation in real-time.