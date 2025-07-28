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
    setBounds(bounds) {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.w;
        this.height = bounds.h;
        return this;
    }
    setDraw(fn) {
        this.draw = fn;
        return this;
    }
}
//This is the class for the visuals of an Element
class Atom {
    constructor(parent,protons, electrons, color, screen, x = null, y = null, vx = null, vy = null) {
        this.parent = parent;
        this.protons = protons;
        this.electrons = electrons;
        this.color = color;
        this.radius = 5;
        this.screen = screen;
        
        let system = this.parent.parent.parent;
        this.element = system.gameData.getElementByProtons(this.protons);
        
        let rndX = screen.x + Math.floor(Math.random() * screen.width);
        let rndY = screen.y + Math.floor(Math.random() * screen.height);
        this.x = x || rndX;
        this.y = y || rndY;

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
        let bounds = this.screen.getBounds();
        if (this.x < bounds.x || this.x > bounds.w) {
            this.vx *= -1;
        }
        if (this.y < bounds.y || this.y > bounds.h) {
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
//This is an instance of the various upgrades an element can have
class Upgrade {
    constructor(parent, label, cost, costMultiplier = 1) {
        this.parent = parent;
        this.label = label;
        this.cost = cost;
        this.costMultiplier = costMultiplier;

        this.upgrade = ()=>{};

        let system = this.parent.parent.parent;
        let scene = system.getScene('Main Scene');
        this.button = new Button(`${this.label} ${this.parent.symbol}`,this)
            .setBounds({
                x: 0,
                y: 0,
                w: 0,
                h: 0
            })
            .setOnClick((event)=>{
                if(this.parent.score<this.cost) return;
                this.parent.score -= this.cost;
                this.upgrade();

                //Charge cost
                let system = this.parent.parent.parent;
                let particleManager = system.getScene('Main Scene').particleManager;
                let element = this.parent

                let availableAtoms = particleManager.atoms.filter((atom)=>{
                    return element.symbol===atom.element.symbol;
                });

                for(let i=0;i<this.cost;i++) {
                    particleManager.removeAtom(availableAtoms[i].id);
                }
                
                //Increase cost
                this.cost = Math.floor(this.cost * this.costMultiplier, this.cost);
            });
        scene.addButton(this.button);
    }
    setOnUpgrade(fn) {
        this.upgrade = fn;
        return this;
    }
}
//This contains the parameters for an Element's incremental and others
class Element {
    constructor(parent, name, symbol, protons, electrons, color) {
        this.parent = parent;

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

        this.addUpgrade(
                new Upgrade(this,'increment', 10, 1.1)
                    .setOnUpgrade(function(){
                        this.parent.increment++;
                    })
            ).addUpgrade(
                new Upgrade(this,'crit chance', 25, 1.25)
                    .setOnUpgrade(function(){
                        this.parent.critChance+=0.1;
                    })
            ).addUpgrade(
                new Upgrade(this,'crit multiplier', 50, 1.5)
                    .setOnUpgrade(function(){
                        this.parent.critMultiplier++;
                    })
            );

        let system = this.parent.parent;
        let scene = system.getScene('Main Scene');
        this.shopButton = new Button(`${this.name} Upgrades`, scene)
            .setBounds({
                x: 25-15,
                y: 50-15,
                w: 30,
                h: 30
            })
            .setOnClick(function(event) {
                if(system.shopElement !== null) return;
                system.openShop(symbol);
            }.bind(this))
        scene.addButton(this.shopButton);
    }
    addUpgrade(upgrade){
        this.upgrades.push(upgrade);
        
        let system = this.parent.parent;
        let scene = system.getScene('Main Scene');
        scene.addButton(upgrade.button);

        return this;
    }
    getUpgrade(label) {
        let upgrade = this.upgrades.find((upgrade)=>{return upgrade.label === label})
        if(upgrade) {
            return upgrade;
        } else {
            console.warn(`Upgrade ${upgrade} not found for ${this.name}.`);
            return null;
        }

    }
    incrementScore(ammount = this.increment) {
        this.score += ammount;
    }
    getScore() {
        return this.score;
    }
    setShopButton(button) {
        this.shopButton = button;
    }
    drawShopButton(renderer, frameCount){
        let box = this.shopButton.getBounds();
                        
        let gameData = this.parent;
        let system = gameData.parent;
        let scene = system.getScene('Main Scene');
        let index = this.protons - 1;

        let startX = 25;
        let startY = 50;

        renderer.context.globalAlpha = 0.3;
        renderer.context.fillStyle = this.color;
        renderer.context.fillRect(box.x,box.y,box.w,box.h);
        renderer.context.globalAlpha = 1;

        let atom = new Atom(scene.particleManager, this.protons, this.electrons, this.color, this)
            .setPosition(startX, startY + 50 * index)
            .setRadius(5);
        atom.draw(renderer, frameCount);

        renderer.drawText(startX + 25, startY + 50 * index,`${this.name} Atoms: ${this.getScore()}`, 'white', 15);
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
    addAtom(element, screen) {
        let atom = new Atom(this, element.protons, element.electrons, element.color, screen);
        atom.setAngle(2 * Math.PI * Math.random())
        element.incrementScore(1);

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
    removeAtom(id) {
        let atom = this.atoms.find((atom)=>{return atom.id===id});
        if(atom) {
            this.atoms.splice(this.atoms.indexOf(atom),1);
            return true;
        } else {
            console.warn(`Atom ${id} not found.`);
            return false;
        }
    }
    checkCollisions(atom1) {
        let newAtoms = [];
        
        this.atoms.forEach(function(atom2) {
            if (atom1.id === atom2.id) return;

            let dx = atom1.x - atom2.x;
            let dy = atom1.y - atom2.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let centerDistances = atom1.radius + atom2.radius;

            if (distance <= centerDistances && atom1.protons === atom2.protons && atom1.electrons === atom2.electrons) {
                let createdAtoms = this.mergeAtoms(atom1,atom2);
                createdAtoms.forEach((atom)=>{
                    newAtoms.push(atom);
                })
            }
        }.bind(this));
        // Add new atoms to the ParticleManager
        newAtoms.forEach(function(newAtom) {
            this.pushAtom(newAtom);
        }.bind(this));
    }
    mergeAtoms(atom1,atom2) {
        let scene = this.parent;
        let system = this.parent.parent;
        let screen = scene.getScreen('Simulation Display');
        console.log(screen)
        let gameData = scene.parent.gameData;

        let oldElement = gameData.getElementByProtons(atom1.protons);
        let newElement = gameData.getElementByProtons(atom1.protons + 1);
        if (!newElement) {
            console.warn(`Element with ${atom1.protons + 1} protons not found in game data.`);
            return;
        }

        if(!gameData.unlockedElements.includes(newElement)) {
            gameData.addUnlockedElement(newElement);
        }

        //Calculate Crits
        let guaranteedCrits = Math.floor(newElement.critChance);
        if(Math.random()<(newElement.critChance-guaranteedCrits)) {
            console.log('hit a crit');
            guaranteedCrits++;
        }

        let baseMultiplier = 1;
        for(let i=0;i<guaranteedCrits;i++) {
            baseMultiplier *= newElement.critMultiplier;
        }
        let finalMultiplier = Math.floor(baseMultiplier);
        
        //Update array
        this.atoms.splice(this.atoms.indexOf(atom1), 1);
        this.atoms.splice(this.atoms.indexOf(atom2), 1);
        oldElement.incrementScore(-2);
        
        let newAtoms = [];
        for(let i=0;i<finalMultiplier;i++) {
            newElement.incrementScore(1);

            let bounds = screen.getBounds();
            let offsetPosition = {
                x: 0.5 * (atom1.x + atom2.x),
                y: 0.5 * (atom1.y + atom2.y)
            }
            if(i>0) {
                offsetPosition = {
                    x: bounds.x + bounds.w * Math.random(),
                    y: bounds.y + bounds.h * Math.random()
                }
            }
            
            let newAtom = new Atom(this, newElement.protons, newElement.electrons, newElement.color, screen)
                .setPosition(
                    (offsetPosition.x),
                    (offsetPosition.y)
                )
                .setSpeed(
                    (atom1.vx + atom2.vx) / 2,
                    (atom1.vy + atom2.vy) / 2
                );
            newAtoms.push(newAtom);
        }
        return newAtoms;
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
        this.active = true;

        this.onClick = function() {};
        this.draw = function() {};
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }
    setBounds(bounds) {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.w;
        this.height = bounds.h;
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
    setActive(active) {
        this.active = active;
        return this;
    }
    getActive() {
        return this.active;
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
        let screen = this.screens.find((screen)=>{return screen.label === label})
        if (screen) {
            return screen;
        } else {
            console.warn(`Screen ${label} not found in scene ${this.label}.`);
            return null;
        }
    }
    addAtom(symbol, screenLabel) {
        let gameData = this.parent.gameData;

        let screen = this.screens.find((screen)=>{return screen.label === screenLabel});
        let elementData = gameData.getElement(symbol);
        if (!elementData) {
            console.warn(`Element '${symbol}' not found in game data.`);
            return;
        }
        
        return this.particleManager.addAtom(elementData,screen);
    }
    addButton(button, buttonIndex = undefined) {
        button.parent = this;
        button.buttonIndex = buttonIndex || this.buttonIndex;
        this.buttons.push(button);
        this.buttons.sort((a, b) => a.buttonIndex - b.buttonIndex);
        this.buttonIndex++;

        return this;
    }
    removeButton(label) {
        let button = this.buttons.find((button)=>{return button.label===label});
        if (button) {
            let index = this.buttons.indexOf(button);
            this.buttons.splice(index,1);
            return true;
        } else {
            console.warn(`Button ${label} not found in scene ${this.label}.`);
            return false;
        }
    }
    getButton(label) {
        let button = this.buttons.find((button)=>{return button.label===label});
        if (button) {
            return button;
        } else {
            console.warn(`Button ${label} not found in scene ${this.label}.`);
            return null;
        }
    }
}
class Config {
    setFPS(fps) {
        this.fps = fps;
        return this;
    }
}
class GameData {
    constructor(parent) {
        this.parent = parent;
        this.elements = [
            new Element(this, 'Hydrogen', 'H', 1, 1, 'hsl(210, 100%, 50%)'),
            new Element(this, 'Helium', 'He', 2, 2, 'hsl(30, 100%, 50%)'),
            new Element(this, 'Lithium', 'Li', 3, 3, 'hsl(270, 100%, 50%)'),
            new Element(this, 'Beryllium', 'Be', 4, 4, 'hsl(0, 100%, 75%)'),
            new Element(this, 'Boron', 'B', 5, 5, 'hsl(180, 100%, 30%)'),
            new Element(this, 'Carbon', 'C', 6, 6, 'hsl(0, 0%, 50%)'),
            new Element(this, 'Nitrogen', 'N', 7, 7, 'hsl(0, 100%, 50%)'),
            new Element(this, 'Oxygen', 'O', 8, 8, 'hsl(180, 50%, 75%)'),
            new Element(this, 'Fluorine', 'F', 9, 9, 'hsl(60, 100%, 50%)'),
            new Element(this, 'Neon', 'Ne', 10, 10, 'hsl(240, 100%, 75%)'),
        ]
        this.spawningElement = 'H';
        this.currRecordScore = 0;
        this.unlockedElements = [this.getElement('H')];
    }
    getUnlockedElements() {
        return this.unlockedElements;
    }
    addUnlockedElement(element) {
        //Displace the next button based on the previous
        let lastElement = this.unlockedElements.slice(-1)[0];
        let lastPosition = lastElement.shopButton.getBounds();
        lastPosition.y += 50;
        element.shopButton.setBounds(lastPosition);

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
        this.config = new Config();

        this.renderer;
        this.gameData;

        this.shopElement = null;
    }
    initListeners() {
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
    setGameData(gameData){
        this.gameData = gameData;
    }
    setConfig(config) {
        this.config = config;
        return this;
    }
    addScene(scene) {
        this.scenes.push(scene);
        return this;
    }
    getScene(label) {
        let scene = this.scenes.find((scene)=>{return scene.label===label});
        if(scene) {
            return scene;
        } else {
            console.warn(`Scene ${label} not found in system.`);
            return null;
        }
    }
    setGameData(gameData) {
        this.gameData = gameData;
        return this;
    }
    getGameData() {
        return this.gameData;
    }
    openShop(symbol) {
        this.shopElement = symbol;
    }
    closeShop() {
        this.shopElement = null;
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
    const config = new Config().setFPS(30);
    system.setConfig(config);
    const renderer = new Renderer(document.getElementById('canvas'));
    system.setRenderer(renderer);
    const scene1 = new Scene('Main Scene', system);
    system.addScene(scene1);
    const gameData = new GameData(system);
    system.setGameData(gameData);

    system.initListeners();
    
    const newAtomButton = new Button('New Atom', scene1)
        .setBounds({
            x: 0.25 * system.renderer.width,
            y: 0,
            w: 0.75 * system.renderer.width,
            h: system.renderer.height
        })
        .setOnClick(function(event) {
            let element = system.gameData.getElement(system.gameData.spawningElement);            
            let scene = system.getScene('Main Scene');
            
            for(let i=0;i<element.increment;i++) {
                scene.particleManager.addAtom(element,scene.getScreen('Simulation Display'));
            }
        })
        .setDraw(function(renderer, frameCount) {
            return;
        })
    scene1.addButton(newAtomButton);
    
    const closeShopButton = new Button('Close Shop',scene1)
        .setBounds({
            x: 0.25 * system.renderer.width - 25,
            y: 20,//0.10 * system.renderer.height,
            w: 20,
            h: 20
        })
        .setOnClick(function(event) {
            if(system.shopElement === null) return;
            let upgrades = system.gameData.getElement(system.shopElement).upgrades;
            upgrades.forEach((upgrade,index)=>{
                upgrade.button.setActive(false);
            })
            system.closeShop();
        })
        .setDraw(function(renderer, frameCount) {
            if(system.shopElement === null) return;

            let box = this.getBounds();
            renderer.context.fillStyle = 'rgba(255, 0, 0, 0.5)';
            renderer.context.fillRect(box.x, box.y, box.w, box.h);

            renderer.drawText(box.x + box.w/4,box.y + box.h/2,'X','white',20);
            return;
        });
    scene1.addButton(closeShopButton);

    scene1.setInit(function() {
            this.run();
        })
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
                        if(mousePosition.x > bounds.x + bounds.w) return;
                        if(mousePosition.y > bounds.y + bounds.h) return;
                        if(clicked) return;//Already processed
                        if(button.getActive()===false) return;
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
        })
        
        const simulationDisplay = new Screen('Simulation Display', scene1)
            .setBounds({
                x: 0.25 * renderer.width,
                y: 0,
                w: 0.75 * renderer.width,
                h: renderer.height
            })
            .setDraw(function(renderer, frameCount) {
                let box = this.getBounds();

                renderer.clearBackground('black');
                let scene = this.parent;

                scene.particleManager.draw(renderer, this.parent.frameCount);
            })
        const mainUI = new Screen('Main UI', scene1)
            .setBounds({
                x: 0,
                y: 0,
                w: 0.25 * renderer.width,
                h: renderer.height
            })
            .setDraw(function(renderer, frameCount) {
                if(system.shopElement!==null) return;

                let box = this.getBounds();
                renderer.context.fillStyle = 'rgba(255, 255, 255, 0.1)';
                renderer.context.fillRect(box.x, box.y, box.w, box.h);
                
                let gameData = this.parent.parent.gameData;

                let displayElements = gameData.getUnlockedElements();
                displayElements.forEach(function(element, index) {
                    element.drawShopButton(renderer,frameCount);
                })
            })
        const shopUI = new Screen('Shop UI',scene1)
            .setBounds({
                x: 0,
                y: 0,
                w: 0.25 * renderer.width,
                h: renderer.height
            })
            .setDraw(function(renderer,frameCount){
                if(system.shopElement===null) {
                    return;
                }

                let box = this.getBounds();
                let element = system.gameData.getElement(system.shopElement);
                let upgrades = element.upgrades;
                upgrades.forEach((upgrade,index)=>{
                    upgrade.button.setActive(true);
                })
                
                
                //Draw Background
                renderer.context.globalAlpha = 0.1;
                renderer.context.fillStyle = element.color;
                renderer.context.fillRect(box.x, box.y, box.w, box.h);
                renderer.context.globalAlpha = 1;

                //Title (Close button is drawn separately)
                renderer.drawText(20,20,`${element.name} Shop (${element.score} points)`,'white',20);
                

                upgrades.forEach((upgrade,index)=>{
                    let textDimensions = renderer.context.measureText(upgrade.label);

                    let button = upgrade.button
                        .setBounds({
                            x: 20,
                            y: 60 + (40 * index),
                            w: textDimensions.width,
                            h: 20
                        })
                    let buttonBounds = button.getBounds();
                    
                    //Draw Outline and Text
                    renderer.context.globalAlpha = 0.2;
                    renderer.context.fillStyle = '#fff';
                    renderer.context.fillRect(buttonBounds.x, buttonBounds.y, buttonBounds.w, buttonBounds.h);
                    renderer.context.globalAlpha = 1;
                    
                    renderer.drawText(buttonBounds.x,buttonBounds.y + textDimensions.actualBoundingBoxAscent/2,`${upgrade.label} : ${upgrade.cost}`,'white',20);
                })
            })

        scene1.addScreen(simulationDisplay);
        scene1.addScreen(mainUI);
        scene1.addScreen(shopUI);

    // Run the first scene
    system.scenes[0].init();
}