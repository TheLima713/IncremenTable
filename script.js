/*
CLICKING BAD / INCREMENTABLE

Developer Notes:
Caution when using the 'this' keyword in functions, and when to apply .bind(this).
Caution when defining draw functions:
    Generic functions go in the Renderer
    Object's Data-based functions go in the object itself, receiving the Renderer as a parameter


System Hierarchy:

    System
        - Config
        - Renderer
        - GameData
            - Elements[]
        - Scenes[]
            - Screens[]
            - ParticleManager
                - Atoms[]

Game Ideas:
    Element Generator object in display, spawns every X secs
    Particle accelerator upgrade, makes all atoms move faster along X secs
*/

class Screen {
    constructor(label, parent) {
        this.label = label;
        this.parent = parent;
        let renderer = this.parent.parent.renderer;
        this.x = 0;
        this.y = 0;
        this.width = renderer.width;
        this.height = renderer.height;
        this.drawIndex = 0;
        this.draw = function(){};
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
    setBounds(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
}
//This is the class for the visuals of an Element
class Atom {
    constructor(parent,protons, electrons, color, scene, x = null, y = null, vx = null, vy = null) {
        this.parent = parent;
        this.protons = protons;
        this.electrons = electrons;
        this.color = color;
        this.radius = 5 + 2 * Math.floor(this.protons / 2);
        
        this.x = x || Math.floor(Math.random() * scene.width);
        this.y = y || Math.floor(Math.random() * scene.height);

        this.vx = vx || 1 * (Math.random() - 0.5);
        this.vy = vy || 1 * (Math.random() - 0.5);
        
        this.angle;
    }
    getMaxProtons (level) {return level === 0 ? 1 : 6*level}
    getMaxElectrons (level) {return 2*(level + 1)**2}
    setRadius(radius) {
        this.radius = radius;
        return this;
    }
    setProtons(protons) {
        this.protons = protons;
        return this;
    }
    setElectrons(electrons) {
        this.electrons = electrons;
        return this;
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    setSpeed(vx, vy) {
        this.vx = vx;
        this.vy = vy;
        return this;
    }
    setAngle(angle) {
        this.angle = angle
    }
    run() {
        this.x += this.vx;
        this.y += this.vy;
        // Bounce off walls
        let renderer = this.parent.parent.parent.renderer;
        if (this.x < 0 || this.x > renderer.width) {
            this.vx *= -1;
        }
        if (this.y < 0 || this.y > renderer.height) {
            this.vy *= -1;
        }
        return this;
    }
    draw(renderer, frameCount = undefined) {
        let angleOffset = frameCount ? frameCount * 0.01 : 0;
        renderer.drawAtom(
            this.getMaxProtons,
            this.getMaxElectrons,
            this.x,
            this.y,
            this.radius,
            this.protons,
            this.electrons,
            angleOffset + (this.angle || 0),
            this.color
        );
    }
}
//This contains the parameters for an Element's incremental and others
class Element {
    constructor(name, symbol, protons, electrons, color) {
        this.name = name;
        this.symbol = symbol;
        this.protons = protons;
        this.electrons = electrons;
        this.color = color;

        this.score = 0;
        this.increment = 1; // Default increment value
        this.critChance = 0;
        this.critMultiplier = 1;
        this.upgrades = []

        this.shopButton
    }
    incrementScore(ammount = this.increment) {
        this.score += ammount;
    }
    getScore() {
        return this.score;
    }
    setButton(button) {
        this.shopButton = button;
    }
}
class ParticleManager {
    constructor(parent) {
        this.parent = parent;
        this.atomIndex = 0;
        this.atoms = [];
    }
    run() {
        this.atoms.forEach(function(atom) {
            this.checkCollisions(atom);
            atom.run();
        }.bind(this));
        return this;
    }
    draw(renderer, frameCount = undefined) {
        this.atoms.forEach(function(atom) {
            atom.draw(renderer, frameCount);
        });
        return this;
    }
    addAtom(element, scene) {
        let atom = new Atom(this, element.protons, element.electrons, element.color, scene);
        atom.setAngle(2 * Math.PI * Math.random())
        element.incrementScore();

        atom.id = atom.id || this.atomIndex;
        this.atomIndex++;
        this.atoms.push(atom);
        return atom;
    }
    pushAtom(atom) {
        atom.id = atom.id || this.atomIndex;
        this.atomIndex++;
        this.atoms.push(atom);
        return atom;
    }
    getAtom(id) {
        return this.atoms.find(atom => atom.id === id);
    }
    checkCollisions(atom1) {
        //ParticleManager->Scene->System
        let scene = this.parent;
        let gameData = scene.parent.gameData;
        let newAtoms = [];
        
        this.atoms.forEach(function(atom2) {
            if (atom1.id === atom2.id) return;

            let dx = atom1.x - atom2.x;
            let dy = atom1.y - atom2.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let centerDistances = atom1.radius + atom2.radius; // Sum of radii for collision detection

            if (distance <= centerDistances && atom1.protons === atom2.protons && atom1.electrons === atom2.electrons) {
                let oldElement = gameData.getElementByProtons(atom1.protons);
                let newElement = gameData.getElementByProtons(atom1.protons + 1);
                if (!newElement) {
                    console.warn(`Element with ${atom1.protons + 1} protons not found in game data.`);
                    return;
                }

                if(!gameData.unlockedElements.includes(newElement)) {
                    gameData.addUnlockedElement(newElement);
                }
                
                this.atoms.splice(this.atoms.indexOf(atom1), 1);
                this.atoms.splice(this.atoms.indexOf(atom2), 1);
                oldElement.incrementScore(-2);

                newElement.incrementScore(1);
                let newAtom = new Atom(this, newElement.protons, newElement.electrons, newElement.color, scene)
                    .setPosition(
                        (atom1.x + atom2.x) / 2,
                        (atom1.y + atom2.y) / 2
                    )
                    .setSpeed(
                        (atom1.vx + atom2.vx) / 2,
                        (atom1.vy + atom2.vy) / 2
                    );
                newAtoms.push(newAtom);
            }
        }.bind(this));
        // Add new atoms to the ParticleManager
        newAtoms.forEach(function(newAtom) {
            this.pushAtom(newAtom);
        }.bind(this));
    }
}
//This is meant to be used as a generic region collider for the mouse, the renderer's function is simply a helper
class Button {
    constructor(label, parent, x = undefined, y = undefined, width = undefined, height = undefined) {
        this.label = label;
        this.parent = parent;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.onClick = function() {};
        this.draw = function() {};
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    setBounds(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        return this;
    }
    setOnClick(fn) {
        this.onClick = fn;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
}
class Scene {
    constructor(label, parent) {
        this.parent = parent;
        this.label = label;
        
        this.frameCount = 0;
        let renderer = this.parent.renderer;
        this.width = renderer.width;
        this.height = renderer.height;
        
        this.screenIndex = 0;
        this.screens = [];
        this.buttonIndex = 0;
        this.buttons = [];
        this.particleManager = new ParticleManager(this);

        this.init = function(){};
        this.run = function(){};
        this.draw = function() {
            let renderer = this.parent.renderer;
            let frameCount = this.frameCount;
            this.screens.forEach(function(screen) {
                screen.draw(renderer, frameCount);
            });
            this.buttons.forEach(function(button) {
                button.draw(renderer, frameCount);
            })
        };
        this.clean = function(){};
    }
    setInit(fn) {
        this.init = fn;
        return this;
    }
    setRun(fn) {
        this.run = fn;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
    setClean(fn) {
        this.clean = fn;
        return this;
    }
    addScreen(screen, drawIndex = undefined) {
        //Add screen to be drawn last, unless specified otherwise
        screen.drawIndex = drawIndex || this.screenIndex;
        this.screens.push(screen);
        this.screens.sort((a, b) => a.drawIndex - b.drawIndex);
        this.screenIndex++;

        return this;
    }
    getScreen(label) {
        if (this.screens[label]) {
            return this.screens[label];
        } else {
            console.warn(`Screen ${label} not found in scene ${this.label}.`);
            return null;
        }
    }
    addAtom(symbol) {
        let gameData = this.parent.gameData;
        let elementData = gameData.getElement(symbol);
        if (!elementData) {
            console.warn(`Element '${symbol}' not found in game data.`);
            return;
        }
        
        return this.particleManager.addAtom(elementData,this);
    }
    addButton(button, buttonIndex = undefined) {
        button.parent = this;
        button.buttonIndex = buttonIndex || this.buttonIndex;
        this.buttons.push(button);
        this.buttons.sort((a, b) => a.buttonIndex - b.buttonIndex);
        this.buttonIndex++;

        return this;
    }
}
class Config {
    setFPS(fps) {
        this.fps = fps;
        return this;
    }
}
class GameData {
    constructor() {
        this.elements = [
            new Element('Hydrogen', 'H', 1, 1, 'hsl(210, 100%, 50%)'),
            new Element('Helium', 'He', 2, 2, 'hsl(30, 100%, 50%)'),
            new Element('Lithium', 'Li', 3, 3, 'hsl(270, 100%, 50%)'),
            new Element('Beryllium', 'Be', 4, 4, 'hsl(0, 100%, 75%)'),
            new Element('Boron', 'B', 5, 5, 'hsl(180, 100%, 30%)'),
            new Element('Carbon', 'C', 6, 6, 'hsl(0, 0%, 50%)'),
            new Element('Nitrogen', 'N', 7, 7, 'hsl(0, 100%, 50%)'),
            new Element('Oxygen', 'O', 8, 8, 'hsl(180, 50%, 75%)'),
            new Element('Fluorine', 'F', 9, 9, 'hsl(60, 100%, 50%)'),
            new Element('Neon', 'Ne', 10, 10, 'hsl(240, 100%, 75%)'),
            new Element('Sodium', 'Na', 11, 11, 'hsl(120, 100%, 50%)'),
            new Element('Magnesium', 'Mg', 12, 12, 'hsl(300, 100%, 50%)'),
        ]
        this.spawningElement = 'H';
        this.currRecordScore = 0;
        this.unlockedElements = [this.getElement('H')];
    }
    getUnlockedElements() {
        return this.unlockedElements;
    }
    addUnlockedElement(element) {
        this.unlockedElements.push(element);
    }
    getElement(symbol) {
        let element = this.elements.find(el => el.symbol === symbol);
        if (element) {
            return element;
        } else {
            console.warn(`Element ${symbol} not found in game data.`);
            return null;
        }
    }
    getElementByProtons(protons) {
        let element = this.elements.find(el => el.protons === protons); 
        if (element) {
            return element;
        } else {
            console.warn(`Element with ${protons} protons not found in game data.`);
            return null;
        }
    }
    getScore(symbol) {
        let element = this.elements.find(el => el.symbol === symbol);
        if (element) {
            return element.getScore();
        } else {
            console.warn(`Element ${symbol} not found in game data.`);
            return null;
        }
    }
    //If no ammount is specified, use the Element's default increment
    incrementScore(symbol, amount = undefined) {
        let element = this.elements.find(el => el.symbol === symbol);
        if (element) {
            element.incrementScore(amount);
        } else {
            console.warn(`Element ${element} not found in game data.`);
        }
        return this.getScore(symbol);
    }
}
class Renderer {
    constructor(canvas, width = null, height = null) {
        this.canvas = canvas;
        if (this.canvas===undefined) return;
        if(width !== null && height !== null) {
            this.width = width;
            this.height = height;
            this.canvas.width = width;
            this.canvas.height = height;
        } else {
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        this.aspectRatio = this.width / this.height;
        this.context = this.canvas.getContext('2d');
    }
    clearBackground(color = 'black') {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, this.width, this.height);
    }
    drawText(x, y, text, color = 'white', fontSize = 20) {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.font = fontSize + 'px monospace';
        let textHeight = this.context.measureText(text).actualBoundingBoxAscent;
        //Canvas draw at baseline, so we need to adjust y position
        this.context.fillText(text, x, y + textHeight / 2);
    }
    drawButton(x, y, width, height, text, linesAllowed = 1) {

        if (this.context===undefined) return;
        this.context.fillStyle = 'white';
        this.context.fillRect(x, y, width, height);
        this.context.fillStyle = 'black';

        //"Bloat" width to wrap text better
        let textPadScale = 1.25;
        width /= textPadScale;
        
        // Word wrap: split text into lines that fit the button width
        let words = text.split(' ');
        let lines = [];
        let currentLine = '';

        let charsPerLine = text.length / linesAllowed;
        let textFontSizeW = width / charsPerLine;
        let textFontSizeH = height / linesAllowed;

        let testFontSize = Math.min(textFontSizeW,textFontSizeH);
        this.context.font = testFontSize + 'px monospace';
        for (let i = 0; i < words.length; i++) {
            let testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
            let testWidth = this.context.measureText(testLine).width;
            if (testWidth > width && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        // If too many lines, merge extras into last line
        if (lines.length > linesAllowed) {
            let merged = lines.slice(linesAllowed - 1).join(' ');
            lines = lines.slice(0, linesAllowed - 1);
            lines.push(merged);
        }
        let fontSize = testFontSize;

        //"Unbloat" width
        width *= textPadScale;

        // Center each line
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let textWidth = this.context.measureText(line).width;
            let textX = x + (width - textWidth) / 2;
            let textY = y + fontSize + i * fontSize + (height - fontSize * lines.length) / 2;
            this.context.fillText(line, textX, textY);
        }
    }
    fillCircle(x, y, radius, color = 'white') {
        if (this.context===undefined) return;
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.fill();
    }
    strokeCircle(x, y, radius, color = 'white') {
        if (this.context===undefined) return;
        this.context.strokeStyle = color;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.stroke();
    }
    drawAtom(maxProtons, maxElectrons, x, y, radius, protons = 1, electrons = 1, angleOffset = 0, color1 = 'red', color2 = 'white') {
        //let maxProtons = (level) => {return level === 0 ? 1 : 6*level}
        //let maxElectrons = (level) => {return 2*(level + 1)**2};
        let particleSize = 2;

        let protonLevel = 0;
        while(protons > 0) {
            let levelMaximum = maxProtons(protonLevel);
            let protonsToDraw = Math.min(protons, levelMaximum);

            let protonRadius = radius * (protonLevel);
            
            protons -= protonsToDraw;
            for(let i = 0; i < protonsToDraw; i++) {
                //Aesthetic layer offset
                let layerAngleDiff = angleOffset * protonLevel;

                let angle = layerAngleDiff + (i / protonsToDraw) * Math.PI * 2;
                let px = x + Math.cos(angle) * protonRadius;
                let py = y + Math.sin(angle) * protonRadius;
                this.fillCircle(px, py, particleSize, color1);
            }
            protonLevel++;
        }
        let electronLevel = 0;
        while(electrons > 0) {
            let levelMaximum = maxElectrons(electronLevel);
            let electronsToDraw = Math.min(electrons, levelMaximum);

            let electronRadius = radius * (electronLevel**2 + protonLevel);
            
            electrons -= electronsToDraw;
            for(let i = 0; i < electronsToDraw; i++) {
                //Aesthetic layer offset
                let layerAngleDiff = angleOffset * (electronLevel+1);

                let angle = layerAngleDiff + (i / electronsToDraw) * Math.PI * 2;
                let px = x + Math.cos(angle) * electronRadius;
                let py = y + Math.sin(angle) * electronRadius;
                this.fillCircle(px, py, particleSize, color2);
            }
            this.strokeCircle(x, y, electronRadius, color2);
            electronLevel++;
        }
    }
}
class System {
    constructor() {
        this.scenes = [];
        this.sceneIndex = 0;
        this.eventBuffer = [];
        this.mousePosition = { x: 0, y: 0 };
        this.gameData = new GameData();
        this.config = new Config();

        this.renderer;
    }
    init() {
        //Set listeners
        document.addEventListener('click', function(event) {
            if(event.target !== this.renderer.canvas) return;
            this.eventBuffer.push({
                type: 'click'
            });
        }.bind(this));
        document.addEventListener('mousemove', function(event) {
            let canvas = this.renderer.canvas;
            let canvasPosition = canvas.getBoundingClientRect();
            let dx = event.clientX - canvasPosition.left;
            let dy = event.clientY - canvasPosition.top;
            this.mousePosition.x = dx;
            this.mousePosition.y = dy;
        }.bind(this));
    }
    setRenderer(renderer) {
        this.renderer = renderer;
        return this;
    }
    setConfig(config) {
        this.config = config;
        return this;
    }
    addScene(scene) {
        this.scenes.push(scene);
        return this;
    }
    setGameData(gameData) {
        this.gameData = gameData;
        return this;
    }
    getGameData() {
        return this.gameData;
    }
}

const system = new System();
initSys()
function initSys() {
    //Configure everything the system needs
    /*
    Setting system's config before or after altering the main
    'config' doesn't matter, just doing it here for clarity.
    */
    const config = new Config()
        .setFPS(30);
    const renderer = new Renderer(document.getElementById('canvas'));
    system
        .setConfig(config)
        .setRenderer(renderer);
    system.init();

    const globalBox = {
        x: 0,
        y: 0,
        width: system.renderer.width,
        height: system.renderer.height
    }
    const scene1 = new Scene('Main Scene', system);
        
        const newAtomButton = new Button('New Atom', scene1)
            .setBounds(
                0.25 * globalBox.width,
                0,
                0.75 * globalBox.width,
                globalBox.height
            )
            .setOnClick(function(event) {
                let gameData = this.parent.parent.gameData;
                let spawningElement = gameData.spawningElement;
                this.parent.addAtom(spawningElement);
            })
            .setDraw(function(renderer, frameCount) {
                return;
            })
        
        const shopButton = new Button('Hydrogen Upgrades', scene1)
            .setBounds(
                25-15,
                50-15,
                30,
                30
            )
            .setOnClick(function(event) {
                let symbol = 'H'
            })
            .setDraw(function(renderer, frameCount) {
                let box = this.getBounds();
                renderer.context.fillStyle = `rgba(0,0,255,0.5)`;
                renderer.context.fillRect(box.x,box.y,box.width,box.height);
            })
        
    scene1.setInit(function() {
            console.log('Scene 1 initialized');
            this.run();
        })
        .addButton(newAtomButton)
        .addButton(shopButton)
        .setRun(function() {
            this.frameCount++;
            this.particleManager.run();

            let events = this.parent.eventBuffer;
            events.forEach(function(event) {
                if (event.type === 'click') {
                    // Check if mouse position is within the bounds of any button
                    let clicked = false;
                    this.buttons.forEach(function(button) {
                        let bounds = button.getBounds();
                        let mousePosition = this.parent.mousePosition
                        if(mousePosition.x < bounds.x) return;
                        if(mousePosition.y < bounds.y) return;
                        if(mousePosition.x > bounds.x + bounds.width) return;
                        if(mousePosition.y > bounds.y + bounds.height) return;
                        if(clicked) return;//Already processed
                        button.onClick();
                        clicked = true;                   
                    }.bind(this));
                }
                this.parent.eventBuffer.shift(); // Clear processed events
            }.bind(this));

            this.draw();

            setTimeout(this.run.bind(this), 1000/config.fps);
        })
        .setClean(function() {
            console.log('Scene 1 cleaned up');
        })
        
        const mainBackground = new Screen('Main Background', scene1)
            .setDraw(function(renderer, frameCount) {
                renderer.clearBackground('black');
            })
        const simulationDisplay = new Screen('Simulation Display', scene1)
            .setDraw(function(renderer, frameCount) {
                let scene = this.parent;

                scene.particleManager.draw(renderer, this.parent.frameCount);
            })
        const mainUIBackground = new Screen('Main UI Background', scene1)
            .setDraw(function(renderer, frameCount) {
                let box = {
                    x: 0,
                    y: 0,
                    w: 0.25 * renderer.width,
                    h: renderer.height
                }
                renderer.context.fillStyle = 'rgba(255, 255, 255, 0.1)';
                renderer.context.fillRect(box.x, box.y, box.w, box.h);
            })
        const mainUI = new Screen('Main UI', scene1)
            .setDraw(function(renderer, frameCount) {
                let box = {
                    x: 0,
                    y: 0,
                    w: 0.25 * renderer.width,
                    h: renderer.height
                }
                
                let gameData = this.parent.parent.gameData;

                let startX = 25;
                let startY = 50;

                let displayElements = gameData.getUnlockedElements();
                displayElements.forEach(function(element, index) {

                    let atom = new Atom(this.parent.particleManager, element.protons, element.electrons, element.color, this.parent)
                        .setPosition(25, startY + 50 * index)
                        .setRadius(10);
                    atom.draw(renderer, frameCount);
                    renderer.drawText(50, startY + 50 * index,`${element.name} Atoms: ${element.getScore()}`, 'white', 20);
                })
            })

        scene1.addScreen(mainBackground);
        scene1.addScreen(simulationDisplay);
        scene1.addScreen(mainUIBackground);
        scene1.addScreen(mainUI);

    system.addScene(scene1);
    // Run the first scene
    system.scenes[0].init();
}